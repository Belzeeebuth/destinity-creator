/**
 * Single WebSocket to the PTY runtime.
 *
 * The socket is owned by this module rather than by a component, so a React
 * remount never drops the link and every card shares one connection. Messages
 * sent while the socket is down are queued and flushed on reconnect — except
 * `input`, which is deliberately dropped (replaying keystrokes into a shell
 * that has moved on is worse than losing them).
 */

import { SOCKET_PATH, type ClientMessage, type ServerMessage } from '@shared/protocol.ts'

export type LinkState = 'connecting' | 'open' | 'closed'

type MessageHandler = (message: ServerMessage) => void
type LinkHandler = (state: LinkState) => void

const RETRY_BASE = 500
const RETRY_CEILING = 8000
/** Messages worth replaying once the link comes back. */
const REPLAYABLE = new Set<ClientMessage['t']>(['spawn', 'groups', 'tools:refresh'])

function socketURL(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}${SOCKET_PATH}`
}

class Bridge {
  private socket: WebSocket | null = null
  private state: LinkState = 'connecting'
  private attempts = 0
  private timer: number | null = null
  private queue: ClientMessage[] = []
  private messageHandlers = new Set<MessageHandler>()
  private linkHandlers = new Set<LinkHandler>()

  constructor() {
    this.connect()
    // A tab woken from sleep often holds a socket the browser already killed.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state === 'closed') this.retryNow()
    })
    window.addEventListener('online', () => this.retryNow())
  }

  linkState(): LinkState {
    return this.state
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onLink(handler: LinkHandler): () => void {
    this.linkHandlers.add(handler)
    handler(this.state)
    return () => this.linkHandlers.delete(handler)
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
      return
    }
    if (REPLAYABLE.has(message.t) && this.queue.length < 32) this.queue.push(message)
  }

  private connect(): void {
    this.setLink(this.attempts === 0 ? 'connecting' : this.state)

    let socket: WebSocket
    try {
      socket = new WebSocket(socketURL())
    } catch {
      this.scheduleRetry()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      this.attempts = 0
      this.setLink('open')
      const pending = this.queue
      this.queue = []
      for (const message of pending) socket.send(JSON.stringify(message))
    }

    socket.onmessage = (event) => {
      let message: ServerMessage
      try {
        message = JSON.parse(event.data as string)
      } catch {
        return
      }
      for (const handler of this.messageHandlers) handler(message)
    }

    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null
        this.setLink('closed')
        this.scheduleRetry()
      }
    }

    // `onerror` always precedes `onclose`; let close drive the retry.
    socket.onerror = () => socket.close()
  }

  private scheduleRetry(): void {
    if (this.timer !== null) return
    const delay = Math.min(RETRY_BASE * 2 ** this.attempts, RETRY_CEILING)
    this.attempts += 1
    this.timer = window.setTimeout(() => {
      this.timer = null
      this.connect()
    }, delay)
  }

  private retryNow(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    this.attempts = 0
    this.connect()
  }

  private setLink(state: LinkState): void {
    if (this.state === state) return
    this.state = state
    for (const handler of this.linkHandlers) handler(state)
  }
}

export const bridge = new Bridge()

let reqCounter = 0
export function nextReqId(): string {
  return `r${Date.now().toString(36)}${(++reqCounter).toString(36)}`
}
