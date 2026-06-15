// Minimal line icons (currentColor, 24x24). No icon-font dependency.

type P = { size?: number; className?: string }
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconKeyboard = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8" />
  </svg>
)

export const IconCrown = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 7l4 5 5-7 5 7 4-5v11H3z" />
  </svg>
)

export const IconUser = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)

export const IconGear = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3H9l-.3 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.5L2.6 11a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1L9 21h6l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5z" />
  </svg>
)

export const IconBook = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
    <path d="M4 4v14" />
  </svg>
)

export const IconRedo = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v5h-5" />
  </svg>
)

export const IconForward = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconTarget = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.5" />
  </svg>
)

export const IconVolume = ({ size = 20, className, on = true }: P & { on?: boolean }) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    {on ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" /> : <path d="M16 9l5 6M21 9l-5 6" />}
  </svg>
)

export const IconChart = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)

export const IconHome = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
)
