import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { PROBED_TOOLS } from '@shared/kinds.ts'
import type { DetectedTool } from '@shared/protocol.ts'

const run = promisify(execFile)
const LOOKUP = process.platform === 'win32' ? 'where' : 'which'

/**
 * Probes the host for the CLIs an operator is likely to drive from the deck.
 * Every probe is independently guarded: a hanging binary cannot stall the set.
 */
export async function detectTools(): Promise<DetectedTool[]> {
  return Promise.all(
    PROBED_TOOLS.map(async (tool): Promise<DetectedTool> => {
      const base = { id: tool.id, name: tool.name, command: tool.command }

      try {
        await run(LOOKUP, [tool.command], { timeout: 3000 })
      } catch {
        return { ...base, version: null, available: false }
      }

      let version: string | null = null
      try {
        const { stdout, stderr } = await run(tool.command, tool.versionArgs, {
          timeout: 5000,
          maxBuffer: 1024 * 512,
        })
        version = firstLine(stdout || stderr)
      } catch (err) {
        // On PATH but the version probe failed — still usable, just unlabelled.
        const output = (err as { stdout?: string; stderr?: string })?.stdout ?? ''
        version = firstLine(output) || null
      }

      return { ...base, version, available: true }
    }),
  )
}

function firstLine(text: string): string | null {
  const line = (text || '').split('\n')[0]?.trim()
  if (!line) return null
  return line.length > 60 ? `${line.slice(0, 57)}…` : line
}
