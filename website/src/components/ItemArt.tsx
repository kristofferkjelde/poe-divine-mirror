export type ItemKind = 'ring' | 'amulet' | 'spear' | 'helm' | 'boots' | 'gloves' | 'orb'

export function ItemArt({ kind }: { kind: ItemKind }) {
  switch (kind) {
    case 'ring':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="22" r="11" fill="none" stroke="url(#metal)" strokeWidth="4.5" />
          <path d="M14 12 L20 5 L26 12 Z" fill="#5fb0ff" stroke="#c9e6ff" strokeWidth="1" />
        </svg>
      )
    case 'amulet':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <path d="M8 4 Q20 22 32 4" fill="none" stroke="url(#metal)" strokeWidth="2" />
          <circle cx="20" cy="26" r="8" fill="#b4232f" stroke="url(#metal)" strokeWidth="3" />
        </svg>
      )
    case 'spear':
      return (
        <svg viewBox="0 0 40 80" aria-hidden>
          <path d="M20 2 L27 20 L20 26 L13 20 Z" fill="#d7dbe0" stroke="#7d8792" strokeWidth="1" />
          <rect x="18.5" y="24" width="3" height="54" rx="1.5" fill="#7a4c22" />
          <rect x="16" y="25" width="8" height="3" fill="url(#metal)" />
        </svg>
      )
    case 'helm':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <path d="M6 30 Q6 6 20 6 Q34 6 34 30 L28 34 L28 22 L12 22 L12 34 Z" fill="url(#metal)" stroke="#3a2a12" strokeWidth="1.5" />
          <rect x="18.5" y="22" width="3" height="10" fill="#3a2a12" />
        </svg>
      )
    case 'boots':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <path d="M10 4 L22 4 L22 24 L34 30 L34 36 L10 36 Z" fill="#5a3b1e" stroke="url(#metal)" strokeWidth="2" />
        </svg>
      )
    case 'gloves':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <path d="M10 36 L10 14 L14 6 L18 14 L18 6 L22 14 L22 6 L26 14 L30 10 L30 36 Z" fill="#6b4a2a" stroke="url(#metal)" strokeWidth="2" />
        </svg>
      )
    case 'orb':
      return (
        <svg viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r="11" fill="url(#divine)" />
          <circle cx="16" cy="16" r="3" fill="#fff" opacity="0.8" />
        </svg>
      )
  }
}

export function ItemArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2c4" />
          <stop offset="0.45" stopColor="#c9a052" />
          <stop offset="1" stopColor="#6b4a14" />
        </linearGradient>
        <radialGradient id="divine" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.5" stopColor="#f0c45a" />
          <stop offset="1" stopColor="#6b4a14" />
        </radialGradient>
      </defs>
    </svg>
  )
}
