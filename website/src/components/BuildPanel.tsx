type Weight = { stat: string; weight: string; star?: boolean; off?: boolean }

const weights: Weight[] = [
  { stat: '#% increased Attack Speed', weight: '1.8', star: true },
  { stat: 'Adds # to # Lightning Damage to Attacks', weight: '1.6', star: true },
  { stat: '+# to maximum Life', weight: '1.2', star: true },
  { stat: '+# to Evasion Rating', weight: '1.0', star: true },
  { stat: '#% increased Cast Speed', weight: '0', off: true },
  { stat: '+# to maximum Energy Shield', weight: '0', off: true },
]

export function BuildPanel() {
  return (
    <div className="ov ov-panel ov-build">
      <div className="ov-build-head">
        <span className="ov-gold ov-caps">Build</span>
        <span className="ov-muted">Settings</span>
      </div>
      <div className="ov-build-body">
        <div className="ov-code">
          <span className="ov-code-text">eNrtXVtz2kiyfvevUPF8MSeSQOCtSm0lJhfvJrEXk2ydp9QgDWYOQqMdjUzYU_t-vZoBDEhcUhBdWoQrV0EbiDvp6vu7pnmkZ</span>
          <span className="ov-caret" aria-hidden />
        </div>
        <div className="ov-build-row">
          <span className="ov-btn">Import build</span>
          <span className="ov-muted">or a pobb.in, poe.ninja or Maxroll link</span>
        </div>
        <p className="ov-build-summary">
          <span className="ov-white">Lightning Spear</span>
          <span className="ov-dot">·</span>Attack<span className="ov-dot">·</span>Evasion
        </p>
        <ul className="ov-weights">
          {weights.map((w) => (
            <li key={w.stat} data-off={w.off}>
              <span className="ov-star">{w.star ? '★' : ''}</span>
              <span className="ov-weight-stat">{w.stat}</span>
              <span className="ov-input">{w.weight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
