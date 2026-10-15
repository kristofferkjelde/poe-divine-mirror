import { useState, type CSSProperties } from 'react'

type Filter = {
  id: string
  label: string
  value: string
  weight: number
  kind: 'property' | 'mod'
}

const filters: Filter[] = [
  { id: 'dps', label: 'DPS', value: '43.5', weight: 1.7, kind: 'property' },
  { id: 'crit', label: 'Critical Hit Chance', value: '5', weight: 1.15, kind: 'property' },
  { id: 'aps', label: 'Attacks per Second', value: '1.5', weight: 1.2, kind: 'property' },
  { id: 'phys', label: 'Adds 5 to 9 Physical Damage', value: '7', weight: 1.35, kind: 'mod' },
  { id: 'speed', label: '12% increased Attack Speed', value: '12', weight: 1.5, kind: 'mod' },
  { id: 'acc', label: '+31 to Accuracy Rating', value: '31', weight: 1.1, kind: 'mod' },
]

const TOTAL_LISTED = 37

function estimate(checked: Set<string>, range: number) {
  const strictness = filters
    .filter((f) => checked.has(f.id))
    .reduce((product, f) => product * f.weight, 1)
  const tighten = 1 + range * 0.07
  const value = 2.4 * strictness * tighten
  const listed = Math.max(1, Math.round(TOTAL_LISTED / (strictness ** 1.4 * tighten ** 3)))
  const reliability = listed >= 20 ? 'High' : listed >= 6 ? 'Medium' : 'Low'
  return { value, listed, reliability }
}

const formatEx = (ex: number) => `${ex < 10 ? ex.toFixed(1).replace(/\.0$/, '') : Math.round(ex)} ex`

function rangeLabel(range: number) {
  if (range === 0) return 'Exact match'
  return range < 0 ? `${range}% looser` : `+${range}% stricter`
}

export function EvaluatePanel() {
  const [checked, setChecked] = useState(() => new Set(['dps', 'acc']))
  const [range, setRange] = useState(0)
  const { value, listed, reliability } = estimate(checked, range)

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="ov ov-panel ov-evaluate">
      <header className="ov-item-header" data-rarity="rare">
        <h3>Storm Fang</h3>
        <h3>Hardwood Spear</h3>
      </header>
      <div className="ov-eval-body">
        <div className="ov-eval-title">
          <span>⚖ Evaluate</span>
          <span className="ov-muted">← Compare</span>
        </div>
        <ul className="ov-filters">
          {filters.map((f, i) => (
            <li key={f.id} className={i > 0 && f.kind !== filters[i - 1].kind ? 'ov-filter-split' : undefined}>
              <label className={`ov-filter ov-filter-${f.kind}`} data-on={checked.has(f.id)}>
                <input type="checkbox" checked={checked.has(f.id)} onChange={() => toggle(f.id)} />
                <span className="ov-check" aria-hidden />
                <span className="ov-filter-label">{f.label}</span>
                <span className="ov-input">{f.value}</span>
                <span className="ov-input ov-input-empty">max</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="ov-range">
          <span aria-hidden>−</span>
          <input
            type="range"
            min={-5}
            max={5}
            step={1}
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            aria-label="Loosen or tighten every mod"
            style={{ '--fill': `${((range + 5) / 10) * 100}%` } as CSSProperties}
          />
          <span aria-hidden>+</span>
          <span className="ov-range-label">{rangeLabel(range)}</span>
        </div>
        <div className="ov-estimate" aria-live="polite">
          <p className="ov-muted">Estimated value · Rise of the Abyssal</p>
          <p className="ov-estimate-value" key={value.toFixed(2)}>
            ≈ {formatEx(value)}
          </p>
          <p className="ov-muted">
            Range {formatEx(value * 0.55)} – {formatEx(value * 2.2)} · Reliability{' '}
            <span className="ov-gold">{reliability}</span>
          </p>
          <p className="ov-muted">
            {Math.min(listed, 10)} of {listed} listed
          </p>
        </div>
      </div>
    </div>
  )
}
