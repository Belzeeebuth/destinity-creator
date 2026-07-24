/**
 * What the deck knows about credentials, shared so the browser and the runtime
 * agree on which names are legal before a value is ever sent.
 */

/** Env vars the CLI agents read, offered as one-click rows in the Keys pane. */
export const KNOWN_KEYS: { name: string; tool: string; note: string }[] = [
  { name: 'ANTHROPIC_API_KEY', tool: 'Claude Code', note: 'sk-ant-…' },
  { name: 'OPENAI_API_KEY', tool: 'Codex · Aider', note: 'sk-…' },
  { name: 'GEMINI_API_KEY', tool: 'Gemini CLI', note: 'AIza…' },
  { name: 'GOOGLE_API_KEY', tool: 'Gemini CLI', note: 'alternative to GEMINI_API_KEY' },
  { name: 'OPENROUTER_API_KEY', tool: 'Aider', note: 'sk-or-…' },
  { name: 'DEEPSEEK_API_KEY', tool: 'Aider', note: '' },
  { name: 'GROQ_API_KEY', tool: 'Aider', note: '' },
  { name: 'MISTRAL_API_KEY', tool: 'Aider', note: '' },
  { name: 'XAI_API_KEY', tool: 'Aider', note: '' },
  { name: 'OLLAMA_HOST', tool: 'Ollama', note: 'not a secret — a URL' },
  { name: 'GITHUB_TOKEN', tool: 'gh · git', note: 'ghp_… / github_pat_…' },
  { name: 'HF_TOKEN', tool: 'Hugging Face', note: 'hf_…' },
]

/**
 * Names the vault refuses to set.
 *
 * This is a foot-gun guard, not a security boundary — an agent is a shell, so
 * whoever can set a secret can already export anything they like. The point is
 * that clobbering PATH or HOME from a settings panel breaks every agent at once
 * in a way that is hard to diagnose, and TERM is owned by the terminal layer.
 */
export const RESERVED_KEYS: ReadonlySet<string> = new Set([
  'PATH',
  'HOME',
  'SHELL',
  'PWD',
  'TERM',
  'COLORTERM',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'DYLD_INSERT_LIBRARIES',
])

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
export const MAX_SECRET_BYTES = 8 * 1024

/** Returns null when the name is usable, otherwise the reason it is not. */
export function validateSecretName(name: string): string | null {
  if (!name) return 'Name a variable first.'
  if (name.length > 128) return 'That name is too long.'
  if (!NAME_PATTERN.test(name)) {
    return 'Environment names allow letters, digits and underscore, and cannot start with a digit.'
  }
  if (RESERVED_KEYS.has(name.toUpperCase())) return `${name} is managed by the runtime and cannot be overridden.`
  if (name.toUpperCase().startsWith('DESTINITY_')) return 'DESTINITY_* is reserved for the runtime.'
  return null
}

/** Shortest value the redactor will mask; below this, masking eats real output. */
export const MIN_MASKABLE_LENGTH = 8
