/** Purely local view state — never round-trips to the runtime. */

import { create } from 'zustand'

export type Tab = 'deck' | 'tools'
export type Density = 'auto' | 1 | 2 | 3 | 4

interface UIState {
  tab: Tab
  /** `null` = the root deck (agents with no group). */
  activeGroupId: string | null
  focusedAgentId: string | null
  /** Agents whose terminal output is held back until unfrozen. */
  frozen: Record<string, true>
  density: Density
  paletteOpen: boolean
  railOpen: boolean

  setTab: (tab: Tab) => void
  setActiveGroup: (groupId: string | null) => void
  focusAgent: (id: string | null) => void
  toggleFrozen: (id: string) => void
  clearFrozen: (id: string) => void
  setDensity: (density: Density) => void
  setPalette: (open: boolean) => void
  toggleRail: () => void
}

export const useUI = create<UIState>((set) => ({
  tab: 'deck',
  activeGroupId: null,
  focusedAgentId: null,
  frozen: {},
  density: 'auto',
  paletteOpen: false,
  railOpen: true,

  setTab: (tab) => set({ tab }),
  setActiveGroup: (activeGroupId) => set({ activeGroupId }),
  focusAgent: (focusedAgentId) => set({ focusedAgentId }),
  toggleFrozen: (id) =>
    set((state) => {
      const frozen = { ...state.frozen }
      if (frozen[id]) delete frozen[id]
      else frozen[id] = true
      return { frozen }
    }),
  clearFrozen: (id) =>
    set((state) => {
      if (!state.frozen[id]) return state
      const frozen = { ...state.frozen }
      delete frozen[id]
      return { frozen }
    }),
  setDensity: (density) => set({ density }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  toggleRail: () => set((state) => ({ railOpen: !state.railOpen })),
}))

/**
 * Columns for `count` agents. Mirrors the source app's ladder (1/2/3/4) but
 * caps at the point where a terminal stops being readable rather than at a
 * fixed agent count.
 */
export function columnsFor(count: number, density: Density): number {
  if (density !== 'auto') return Math.min(density, Math.max(count, 1))
  if (count <= 1) return 1
  if (count <= 4) return 2
  if (count <= 9) return 3
  return 4
}
