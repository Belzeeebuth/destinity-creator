import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'
import type {
  ClientMessage,
  DetectedTool,
  GroupRecord,
  ServerMessage,
} from '@shared/protocol.ts'
import { SOCKET_PATH } from '@shared/protocol.ts'
import { AgentManager, MAX_AGENTS, SCROLLBACK_BYTES } from './agents.ts'
import { detectTools } from './detect.ts'
import { sampleAgents, sampleHost } from './metrics.ts'
import { WORKSPACE, ensureDirs, loadGroups, saveGroups } from './state.ts'

const PORT = Number(process.env.DESTINITY_PORT || 7331)
const HOST = process.env.DESTINITY_HOST || '127.0.0.1'
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const SAMPLE_INTERVAL = 2500

ensureDirs()

const agents = new AgentManager()
let groups: GroupRecord[] = loadGroups()
let tools: DetectedTool[] = []

// ── HTTP (serves the built deck in production; Vite handles dev) ─────────────

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, agents: agents.list().length, workspace: WORKSPACE }))
    return
  }

  if (!fs.existsSync(DIST)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('No build found. Run `npm run dev` for the dev server, or `npm run build` first.\n')
    return
  }

  const requested = decodeURIComponent((req.url || '/').split('?')[0])
  const resolved = path.join(DIST, requested)
  // Reject anything that escapes the build directory.
  const target = resolved.startsWith(DIST) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(DIST, 'index.html')

  res.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream' })
  fs.createReadStream(target).pipe(res)
})

// ── WebSocket ───────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: SOCKET_PATH })
const clients = new Set<WebSocket>()

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function broadcast(message: ServerMessage): void {
  const payload = JSON.stringify(message)
  for (const socket of clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload)
  }
}

agents.on('agent', (snapshot) => broadcast({ t: 'agent', agent: snapshot }))
agents.on('gone', (id) => broadcast({ t: 'gone', id }))
agents.on('data', (id, epoch, data) => broadcast({ t: 'data', id, epoch, data }))

wss.on('connection', (socket) => {
  clients.add(socket)

  send(socket, {
    t: 'ready',
    agents: agents.list(),
    groups,
    host: sampleHost(),
    tools,
    limits: { maxAgents: MAX_AGENTS, scrollbackBytes: SCROLLBACK_BYTES },
    workspace: WORKSPACE,
  })

  socket.on('message', (raw) => {
    let message: ClientMessage
    try {
      message = JSON.parse(raw.toString())
    } catch {
      return
    }
    try {
      handle(socket, message)
    } catch (err) {
      send(socket, {
        t: 'error',
        reqId: 'reqId' in message ? message.reqId : undefined,
        message: (err as Error).message,
      })
    }
  })

  socket.on('close', () => clients.delete(socket))
  socket.on('error', () => clients.delete(socket))
})

function handle(socket: WebSocket, message: ClientMessage): void {
  switch (message.t) {
    case 'spawn': {
      agents.spawn({
        groupId: message.groupId,
        command: message.command,
        cwd: message.cwd,
        cols: message.cols,
        rows: message.rows,
      })
      return
    }
    case 'attach': {
      agents.resize(message.id, message.cols, message.rows)
      const buffered = agents.scrollbackOf(message.id)
      if (buffered) send(socket, { t: 'replay', id: message.id, epoch: buffered.epoch, data: buffered.data })
      return
    }
    case 'input':
      agents.write(message.id, message.data)
      return
    case 'resize':
      agents.resize(message.id, message.cols, message.rows)
      return
    case 'interrupt':
      agents.interrupt(message.id)
      return
    case 'stop':
      agents.stop(message.id)
      return
    case 'restart':
      agents.restart(message.id)
      return
    case 'close':
      agents.close(message.id)
      return
    case 'rename':
      agents.rename(message.id, message.label)
      return
    case 'assign':
      agents.assign(message.id, message.groupId)
      return
    case 'run': {
      const command = message.command.trim()
      if (!command) return
      for (const id of message.ids) agents.write(id, `${command}\r`)
      return
    }
    case 'groups': {
      groups = message.groups.slice(0, 50)
      saveGroups(groups)
      agents.reconcileGroups(new Set(groups.map((g) => g.id)))
      broadcast({ t: 'groups', groups })
      return
    }
    case 'tools:refresh': {
      void refreshTools()
      return
    }
  }
}

// ── Telemetry loop ──────────────────────────────────────────────────────────

setInterval(() => {
  if (clients.size === 0) return
  void (async () => {
    const [agentSamples] = await Promise.all([sampleAgents(agents.livePids())])
    broadcast({ t: 'samples', host: sampleHost(), agents: agentSamples })
  })()
}, SAMPLE_INTERVAL).unref()

async function refreshTools(): Promise<void> {
  tools = await detectTools()
  broadcast({ t: 'tools', tools })
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

server.on('error', (err: NodeJS.ErrnoException) => {
  // A runtime that cannot listen is useless, and the catch-all below would
  // otherwise keep the process alive holding no socket at all.
  if (err.code === 'EADDRINUSE') {
    console.error(`[destinity] port ${PORT} is already in use — set DESTINITY_PORT to pick another.`)
  } else {
    console.error('[destinity] server error:', err)
  }
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`[destinity] runtime on http://${HOST}:${PORT}`)
  console.log(`[destinity] workspace ${WORKSPACE}`)
  console.log(`[destinity] agent ceiling ${MAX_AGENTS}`)
  void refreshTools()
})

let shuttingDown = false
function shutdown(): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log('\n[destinity] stopping agents…')
  agents.closeAll()
  for (const socket of clients) socket.close()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1500).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (err) => console.error('[destinity] uncaught:', err))
process.on('unhandledRejection', (err) => console.error('[destinity] unhandled:', err))
