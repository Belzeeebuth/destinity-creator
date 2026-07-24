/**
 * Inline 14px stroke icons. Local rather than an icon package so the app
 * has no font/CDN dependency and renders identically offline.
 */

interface IconProps {
  size?: number
}

function Svg({ size = 14, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
)

export const IconFreeze = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4v8M10 4v8" />
  </Svg>
)

export const IconClear = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8" />
  </Svg>
)

export const IconRestart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 8a5 5 0 1 1-1.8-3.85" />
    <path d="M13 2.2V5h-2.8" />
  </Svg>
)

export const IconKill = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
)

export const IconStop = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="8" height="8" />
  </Svg>
)

export const IconRail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="3" width="11" height="10" />
    <path d="M6.5 3v10" />
  </Svg>
)

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8a5 5 0 0 1 8.8-3.2M13 8a5 5 0 0 1-8.8 3.2" />
    <path d="M11.8 2v2.8H9M4.2 14v-2.8H7" />
  </Svg>
)

export const IconTerminal = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="10" />
    <path d="M4.6 6.4L6.6 8l-2 1.6M8.4 10h3" />
  </Svg>
)

export const IconTool = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.2 2.4a3.4 3.4 0 0 0-4 4.4L2.6 10.4l2 2 3.6-3.6a3.4 3.4 0 0 0 4.4-4l-2 2-1.6-.4-.4-1.6z" />
  </Svg>
)

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.4" cy="5.4" r="2.9" />
    <path d="M7.5 7.5L13 13M10.4 10.4l-1.5 1.5M12 12l-1.2 1.2" />
  </Svg>
)

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" />
  </Svg>
)
