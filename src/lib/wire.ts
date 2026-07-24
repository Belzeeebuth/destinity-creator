/**
 * Routes runtime messages to their destination: state into the Zustand store,
 * terminal bytes straight to whichever card is rendering that agent.
 *
 * Output never passes through React state — at a few hundred KB/s that would
 * be a render storm. Cards subscribe here and write into xterm directly.
 */

import { bridge } from '@/lib/bridge.ts'
import {
  applyAgent,
  applyGone,
  applyGroups,
  applyReady,
  applySamples,
  applySecrets,
  applyTools,
  notify,
  setLink,
} from '@/store/deck.ts'

export interface StreamChunk {
  epoch: number
  data: string
  /** True when this is the scrollback replayed on attach, not live output. */
  replay: boolean
}

type StreamHandler = (chunk: StreamChunk) => void

const streams = new Map<string, Set<StreamHandler>>()

export function subscribeStream(id: string, handler: StreamHandler): () => void {
  let handlers = streams.get(id)
  if (!handlers) {
    handlers = new Set()
    streams.set(id, handlers)
  }
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
    if (handlers.size === 0) streams.delete(id)
  }
}

function emit(id: string, chunk: StreamChunk): void {
  const handlers = streams.get(id)
  if (!handlers) return
  for (const handler of handlers) handler(chunk)
}

let started = false

export function startWire(): void {
  if (started) return
  started = true

  bridge.onLink(setLink)

  bridge.onMessage((message) => {
    switch (message.t) {
      case 'ready':
        applyReady(message)
        return
      case 'agent':
        applyAgent(message.agent)
        return
      case 'gone':
        applyGone(message.id)
        streams.delete(message.id)
        return
      case 'data':
        emit(message.id, { epoch: message.epoch, data: message.data, replay: false })
        return
      case 'replay':
        emit(message.id, { epoch: message.epoch, data: message.data, replay: true })
        return
      case 'samples':
        applySamples(message.host, message.agents)
        return
      case 'groups':
        applyGroups(message.groups)
        return
      case 'tools':
        applyTools(message.tools)
        return
      case 'secrets':
        applySecrets(message.secrets)
        return
      case 'error':
        notify(message.message)
        return
    }
  })
}
