/**
 * Binds one xterm instance to one server-side PTY.
 *
 * Ownership is deliberately one-way: keystrokes go up, bytes come down, and
 * the terminal holds no state the runtime cannot rebuild. That is what makes
 * a browser reload survivable — on mount we attach, the runtime replays its
 * scrollback, and the card looks exactly as it did.
 */

import { useEffect, useLayoutEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { TERMINAL_THEME } from '@/lib/theme.ts'
import { subscribeStream } from '@/lib/wire.ts'
import { attachAgent, resizeAgent, sendInput } from '@/store/deck.ts'

/** Frozen cards keep at most this much output before dropping the oldest. */
const FREEZE_BUFFER_BYTES = 128 * 1024

export interface AgentTerminalOptions {
  id: string
  frozen: boolean
  onFocus?: () => void
}

export interface AgentTerminalHandle {
  containerRef: React.RefObject<HTMLDivElement>
  clear: () => void
  focus: () => void
}

export function useAgentTerminal({ id, frozen, onFocus }: AgentTerminalOptions): AgentTerminalHandle {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const epochRef = useRef(0)

  // Read inside callbacks that must not be torn down when these change.
  const frozenRef = useRef(frozen)
  const heldRef = useRef<string[]>([])
  const heldBytesRef = useRef(0)
  const focusRef = useRef(onFocus)
  focusRef.current = onFocus

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new Terminal({
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: false,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily:
        "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
      fontSize: 12,
      lineHeight: 1.25,
      letterSpacing: 0,
      scrollback: 5000,
      theme: TERMINAL_THEME,
      // The runtime already logs everything; no need for xterm to also beep.
      windowsMode: false,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    try {
      term.loadAddon(new WebLinksAddon())
    } catch {
      // Link detection is a nicety; never let it block the terminal.
    }

    term.open(container)
    termRef.current = term
    fitRef.current = fit

    term.onData((data) => sendInput(id, data))
    term.textarea?.addEventListener('focus', () => focusRef.current?.())

    const geometry = safeFit(fit, term)
    attachAgent(id, geometry.cols, geometry.rows)

    // ── Output ───────────────────────────────────────────────────────────
    const write = (data: string): void => {
      if (!frozenRef.current) {
        term.write(data)
        return
      }
      heldRef.current.push(data)
      heldBytesRef.current += data.length
      while (heldBytesRef.current > FREEZE_BUFFER_BYTES && heldRef.current.length > 1) {
        heldBytesRef.current -= heldRef.current.shift()!.length
      }
    }

    const unsubscribe = subscribeStream(id, ({ epoch, data, replay }) => {
      // A restart bumps the epoch; wipe so two processes never interleave.
      // A full reset (not just clear) also drops any modes the dead shell left
      // behind — alternate screen, scroll region, mouse tracking.
      if (epoch !== epochRef.current) {
        epochRef.current = epoch
        heldRef.current = []
        heldBytesRef.current = 0
        term.reset()
      }
      if (replay) {
        // Scrollback is authoritative — draw it even while frozen.
        term.write(data)
        return
      }
      write(data)
    })

    // ── Geometry ─────────────────────────────────────────────────────────
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = safeFit(fit, term)
        if (next.cols > 0 && next.rows > 0) resizeAgent(id, next.cols, next.rows)
      })
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
      termRef.current = null
      fitRef.current = null
      heldRef.current = []
      heldBytesRef.current = 0

      // xterm 5.5's Viewport queues an unguarded `setTimeout(syncScrollArea)`
      // from its own constructor and an rAF from `reset()`; neither is cancelled
      // on dispose, so tearing down inside the same tick makes those callbacks
      // throw out of the library. The terminal is already detached from the
      // stream here, so letting a frame and a macrotask drain first is safe.
      requestAnimationFrame(() => setTimeout(() => term.dispose(), 0))
    }
    // `id` is the only identity that matters; frozen/onFocus go through refs.
  }, [id])

  // Flush whatever accumulated while the card was frozen.
  useEffect(() => {
    frozenRef.current = frozen
    if (frozen) return
    const term = termRef.current
    if (!term || heldRef.current.length === 0) return
    term.write(heldRef.current.join(''))
    heldRef.current = []
    heldBytesRef.current = 0
  }, [frozen])

  return {
    containerRef,
    clear: () => termRef.current?.clear(),
    focus: () => termRef.current?.focus(),
  }
}

/**
 * `fit()` throws if the element has no layout yet (a card mid-transition, a
 * hidden tab). Falling back to the terminal's current geometry keeps the
 * attach/resize path alive until the next observer tick.
 */
function safeFit(fit: FitAddon, term: Terminal): { cols: number; rows: number } {
  try {
    const proposed = fit.proposeDimensions()
    if (proposed && proposed.cols > 0 && proposed.rows > 0) {
      fit.fit()
      return { cols: term.cols, rows: term.rows }
    }
  } catch {
    /* not laid out yet */
  }
  return { cols: term.cols, rows: term.rows }
}
