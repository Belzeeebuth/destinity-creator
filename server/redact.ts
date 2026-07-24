/**
 * Masks stored secret values out of PTY output before it reaches the scrollback,
 * the log file on disk, or any browser.
 *
 * The hard part is that output arrives in arbitrary chunks, so a key can be
 * split across two of them and slip past a naive per-chunk replace. After
 * masking whole occurrences this holds back the longest tail that could still
 * be the beginning of a secret, and prepends it to the next chunk. The hold
 * only triggers on an actual partial match, so ordinary output flows through
 * with no added latency.
 *
 * This is defence in depth, not a guarantee. It catches the realistic accident
 * — `echo $ANTHROPIC_API_KEY`, a tool dumping its config, a stack trace with
 * the env in it. It cannot catch a value the process transforms before
 * printing, and it is not trying to.
 */

import { MIN_MASKABLE_LENGTH } from '@shared/secrets.ts'

export const MASK = '[redacted]'

export class Redactor {
  private held = ''

  /** True when bytes are being withheld pending more input. */
  get pending(): boolean {
    return this.held.length > 0
  }

  push(chunk: string, secrets: string[]): string {
    const maskable = secrets.filter((s) => s.length >= MIN_MASKABLE_LENGTH)
    if (maskable.length === 0) return this.flushWith(chunk)

    let buf = this.held + chunk
    this.held = ''

    for (const secret of maskable) {
      if (buf.includes(secret)) buf = buf.split(secret).join(MASK)
    }

    const hold = partialTailLength(buf, maskable)
    if (hold > 0) {
      this.held = buf.slice(buf.length - hold)
      buf = buf.slice(0, buf.length - hold)
    }
    return buf
  }

  /** Releases withheld bytes — call when output goes quiet, or on teardown. */
  flush(): string {
    return this.flushWith('')
  }

  private flushWith(chunk: string): string {
    const out = this.held + chunk
    this.held = ''
    return out
  }
}

/**
 * Length of the longest suffix of `buf` that is a strict prefix of some secret.
 * Returns 0 when nothing at the tail could grow into one.
 */
function partialTailLength(buf: string, secrets: string[]): number {
  let longest = 0
  const firstChars = new Set<string>()
  for (const secret of secrets) {
    firstChars.add(secret[0])
    if (secret.length > longest) longest = secret.length
  }

  const window = Math.min(buf.length, longest - 1)
  for (let take = window; take >= 1; take--) {
    const start = buf.length - take
    // Cheap reject: the candidate has to begin with some secret's first char.
    if (!firstChars.has(buf[start])) continue
    const candidate = buf.slice(start)
    for (const secret of secrets) {
      if (secret.length > take && secret.startsWith(candidate)) return take
    }
  }
  return 0
}
