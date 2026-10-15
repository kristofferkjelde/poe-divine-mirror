export function Divider() {
  return (
    <svg className="divider" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden>
      <path d="M0 8 H180" stroke="url(#fade-l)" strokeWidth="1" />
      <path d="M220 8 H400" stroke="url(#fade-r)" strokeWidth="1" />
      <path d="M200 1 L207 8 L200 15 L193 8 Z" fill="none" stroke="#c8aa6e" strokeWidth="1.2" />
      <path d="M200 5 L203 8 L200 11 L197 8 Z" fill="#f0c45a" />
      <circle cx="186" cy="8" r="1.6" fill="#c8aa6e" />
      <circle cx="214" cy="8" r="1.6" fill="#c8aa6e" />
      <defs>
        <linearGradient id="fade-l">
          <stop offset="0" stopColor="#c8aa6e" stopOpacity="0" />
          <stop offset="1" stopColor="#c8aa6e" />
        </linearGradient>
        <linearGradient id="fade-r">
          <stop offset="0" stopColor="#c8aa6e" />
          <stop offset="1" stopColor="#c8aa6e" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
