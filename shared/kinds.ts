/**
 * Command → agent identity. Used server-side to auto-label an agent the moment
 * the operator submits a command, and client-side to pick the badge tone.
 */

export type Tone = 'amber' | 'moss' | 'rust' | 'wheat' | 'slate' | 'plum'

export interface AgentKind {
  id: string
  name: string
  /** Two-to-four character badge drawn on the card. */
  badge: string
  tone: Tone
  /** Commands that resolve to this kind. */
  match: string[]
}

export const SHELL_KIND: AgentKind = { id: 'shell', name: 'Shell', badge: 'SH', tone: 'slate', match: [] }

export const KINDS: AgentKind[] = [
  // ── Coding agents ──────────────────────────────────────────────────────
  { id: 'claude', name: 'Claude Code', badge: 'CL', tone: 'amber', match: ['claude'] },
  { id: 'codex', name: 'Codex', badge: 'CX', tone: 'amber', match: ['codex'] },
  { id: 'gemini', name: 'Gemini CLI', badge: 'GM', tone: 'amber', match: ['gemini'] },
  { id: 'antigravity', name: 'Antigravity', badge: 'AG', tone: 'amber', match: ['agy'] },
  { id: 'aider', name: 'Aider', badge: 'AI', tone: 'amber', match: ['aider'] },
  { id: 'goose', name: 'Goose', badge: 'GS', tone: 'amber', match: ['goose'] },
  { id: 'opencode', name: 'OpenCode', badge: 'OC', tone: 'amber', match: ['opencode'] },
  { id: 'cursor', name: 'Cursor Agent', badge: 'CU', tone: 'amber', match: ['cursor-agent', 'cursor'] },
  { id: 'copilot', name: 'Copilot CLI', badge: 'CP', tone: 'amber', match: ['copilot'] },

  // ── Local model runtimes ───────────────────────────────────────────────
  { id: 'ollama', name: 'Ollama', badge: 'OL', tone: 'plum', match: ['ollama'] },
  { id: 'llama', name: 'llama.cpp', badge: 'LM', tone: 'plum', match: ['llama-cli', 'llama-server', 'llama'] },
  { id: 'vllm', name: 'vLLM', badge: 'VL', tone: 'plum', match: ['vllm'] },

  // ── Runtimes & package managers ────────────────────────────────────────
  { id: 'node', name: 'Node', badge: 'ND', tone: 'moss', match: ['node'] },
  { id: 'npm', name: 'npm', badge: 'NPM', tone: 'moss', match: ['npm', 'npx'] },
  { id: 'pnpm', name: 'pnpm', badge: 'PNP', tone: 'moss', match: ['pnpm', 'pnpx'] },
  { id: 'yarn', name: 'Yarn', badge: 'YRN', tone: 'moss', match: ['yarn'] },
  { id: 'bun', name: 'Bun', badge: 'BUN', tone: 'moss', match: ['bun', 'bunx'] },
  { id: 'deno', name: 'Deno', badge: 'DN', tone: 'moss', match: ['deno'] },
  { id: 'python', name: 'Python', badge: 'PY', tone: 'moss', match: ['python', 'python3', 'py', 'ipython'] },
  { id: 'pip', name: 'pip', badge: 'PIP', tone: 'moss', match: ['pip', 'pip3', 'uv', 'uvx', 'poetry'] },
  { id: 'cargo', name: 'Cargo', badge: 'CGO', tone: 'rust', match: ['cargo', 'rustc'] },
  { id: 'go', name: 'Go', badge: 'GO', tone: 'moss', match: ['go'] },
  { id: 'java', name: 'Java', badge: 'JV', tone: 'rust', match: ['java', 'javac', 'gradle', 'mvn'] },
  { id: 'make', name: 'Make', badge: 'MK', tone: 'rust', match: ['make', 'cmake', 'ninja'] },

  // ── Infra & tooling ────────────────────────────────────────────────────
  { id: 'git', name: 'Git', badge: 'GIT', tone: 'wheat', match: ['git', 'gh', 'lazygit'] },
  { id: 'docker', name: 'Docker', badge: 'DK', tone: 'wheat', match: ['docker', 'docker-compose', 'podman'] },
  { id: 'kube', name: 'Kubernetes', badge: 'K8', tone: 'wheat', match: ['kubectl', 'helm', 'k9s'] },
  { id: 'ssh', name: 'SSH', badge: 'SSH', tone: 'wheat', match: ['ssh', 'mosh', 'scp', 'rsync'] },
  { id: 'db', name: 'Database', badge: 'DB', tone: 'wheat', match: ['psql', 'mysql', 'sqlite3', 'redis-cli', 'mongosh'] },
  { id: 'editor', name: 'Editor', badge: 'ED', tone: 'slate', match: ['vim', 'nvim', 'nano', 'emacs', 'helix', 'hx'] },
  { id: 'monitor', name: 'Monitor', badge: 'MON', tone: 'slate', match: ['top', 'htop', 'btop', 'watch', 'tail', 'journalctl'] },
  { id: 'net', name: 'Network', badge: 'NET', tone: 'slate', match: ['curl', 'wget', 'ping', 'dig', 'nc', 'httpie', 'http'] },
]

const BY_COMMAND = new Map<string, AgentKind>()
for (const kind of KINDS) {
  for (const cmd of kind.match) BY_COMMAND.set(cmd, kind)
}

/** Wrappers that delegate to the next token, e.g. `sudo claude`, `npx tsx`. */
const PASSTHROUGH = new Set(['sudo', 'doas', 'env', 'time', 'nohup', 'command', 'exec'])

function normalizeToken(raw: string): string {
  let token = raw.trim()
  if (!token) return ''
  // Strip quoting and any directory prefix: /usr/local/bin/claude → claude
  token = token.replace(/^["']|["']$/g, '')
  const slash = Math.max(token.lastIndexOf('/'), token.lastIndexOf('\\'))
  if (slash >= 0) token = token.slice(slash + 1)
  return token.replace(/\.(exe|cmd|bat|ps1)$/i, '').toLowerCase()
}

export function resolveKind(commandLine: string): AgentKind {
  const tokens = commandLine.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length && i < 4; i++) {
    const token = normalizeToken(tokens[i])
    if (!token) continue
    // Skip `VAR=value` prefixes and passthrough wrappers, then retry.
    if (token.includes('=') || PASSTHROUGH.has(token)) continue
    const kind = BY_COMMAND.get(token)
    if (kind) {
      // `npx <pkg>` / `uvx <pkg>` are more usefully labelled by the package.
      if ((kind.id === 'npm' || kind.id === 'pip' || kind.id === 'bun') && tokens[i + 1]) {
        const next = BY_COMMAND.get(normalizeToken(tokens[i + 1]))
        if (next) return next
      }
      return kind
    }
    return SHELL_KIND
  }
  return SHELL_KIND
}

export function kindById(id: string): AgentKind {
  return KINDS.find((k) => k.id === id) ?? SHELL_KIND
}

/** CLIs the runtime probes for on the host, surfaced in the Tools tab. */
export const PROBED_TOOLS: { id: string; name: string; command: string; versionArgs: string[] }[] = [
  { id: 'claude', name: 'Claude Code', command: 'claude', versionArgs: ['--version'] },
  { id: 'codex', name: 'Codex', command: 'codex', versionArgs: ['--version'] },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini', versionArgs: ['--version'] },
  { id: 'antigravity', name: 'Antigravity CLI', command: 'agy', versionArgs: ['--version'] },
  { id: 'aider', name: 'Aider', command: 'aider', versionArgs: ['--version'] },
  { id: 'ollama', name: 'Ollama', command: 'ollama', versionArgs: ['--version'] },
  { id: 'node', name: 'Node', command: 'node', versionArgs: ['--version'] },
  { id: 'npm', name: 'npm', command: 'npm', versionArgs: ['--version'] },
  { id: 'pnpm', name: 'pnpm', command: 'pnpm', versionArgs: ['--version'] },
  { id: 'bun', name: 'Bun', command: 'bun', versionArgs: ['--version'] },
  { id: 'deno', name: 'Deno', command: 'deno', versionArgs: ['--version'] },
  { id: 'python', name: 'Python', command: 'python3', versionArgs: ['--version'] },
  { id: 'uv', name: 'uv', command: 'uv', versionArgs: ['--version'] },
  { id: 'git', name: 'Git', command: 'git', versionArgs: ['--version'] },
  { id: 'docker', name: 'Docker', command: 'docker', versionArgs: ['--version'] },
  { id: 'kubectl', name: 'kubectl', command: 'kubectl', versionArgs: ['version', '--client'] },
  { id: 'cargo', name: 'Cargo', command: 'cargo', versionArgs: ['--version'] },
  { id: 'go', name: 'Go', command: 'go', versionArgs: ['version'] },
  { id: 'rg', name: 'ripgrep', command: 'rg', versionArgs: ['--version'] },
]
