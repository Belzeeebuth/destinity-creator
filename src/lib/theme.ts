import type { ITheme } from '@xterm/xterm'

/**
 * xterm palette, kept in step with `src/styles/tokens.css`.
 *
 * The background is transparent so the terminal sits on the card surface
 * instead of punching a black rectangle through it.
 */
export const TERMINAL_THEME: ITheme = {
  background: 'rgba(0, 0, 0, 0)',
  foreground: '#c8c5bf',
  cursor: '#d98e33',
  cursorAccent: '#131416',
  selectionBackground: 'rgba(217, 142, 51, 0.28)',

  black: '#2a2d31',
  red: '#b05c3e',
  green: '#7f9c57',
  yellow: '#c9a13c',
  blue: '#6b7783',
  magenta: '#9179a0',
  cyan: '#6f8f8a',
  white: '#c8c5bf',

  brightBlack: '#6e6b66',
  brightRed: '#cd7455',
  brightGreen: '#98b56d',
  brightYellow: '#dbb653',
  brightBlue: '#85929e',
  brightMagenta: '#a891b6',
  brightWhite: '#e4e1db',
}
