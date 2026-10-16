import type { Verdict } from '../../../shared/compare/compare'

const GLYPHS: Record<Verdict, string> = {
  upgrade: 'M8 11.5 12 7.5 16 11.5M8 15.5 12 11.5 16 15.5',
  downgrade: 'M8 8.5 12 12.5 16 8.5M8 12.5 12 16.5 16 12.5',
  sidegrade: 'M8 10H16M8 14H16',
}

export function VerdictMark({ verdict }: { verdict: Verdict }) {
  return (
    <svg className="verdict-mark" data-verdict={verdict} viewBox="0 0 24 24" aria-hidden="true">
      <path className="verdict-mark-frame" d="M12 1 23 12 12 23 1 12Z" />
      <path className="verdict-mark-inner" d="M12 4.2 19.8 12 12 19.8 4.2 12Z" />
      <path className="verdict-mark-glyph" d={GLYPHS[verdict]} />
    </svg>
  )
}
