type StatRow = {
  stat: string
  now: string
  next: string
  delta: number
}

const rows: StatRow[] = [
  { stat: '+# to maximum Life', now: '28', next: '72', delta: 44 },
  { stat: '+#% to Lightning Resistance', now: '–', next: '24', delta: 24 },
  { stat: '+#% to Fire Resistance', now: '18', next: '31', delta: 13 },
  { stat: 'Adds # to # Physical Damage to Attacks', now: '4–11', next: '1–4', delta: -5 },
  { stat: '#% increased Attack Speed', now: '–', next: '6', delta: 6 },
]

type Mod = { tier: string; text: string; top?: boolean }

const mods: Mod[] = [
  { tier: 'P2', text: '+72 to maximum Life', top: true },
  { tier: 'S2', text: '+31% to Fire Resistance', top: true },
  { tier: 'S4', text: '+24% to Lightning Resistance' },
  { tier: 'S3', text: '6% increased Attack Speed' },
]

export function ComparePanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className="ov ov-panel">
      <div className="ov-verdict">
        <div className="ov-verdict-title">
          <span className="ov-up">▲ Upgrade</span>
          <span className="ov-score">+57%</span>
        </div>
        <p className="ov-vs">
          vs your Ring 1: <span className="ov-white">Dusk Knuckle</span>
        </p>
      </div>
      <table className="ov-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Now</th>
            <th>New</th>
            <th>±</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stat}>
              <td>{row.stat}</td>
              <td>{row.now}</td>
              <td>{row.next}</td>
              <td className={row.delta > 0 ? 'ov-pos' : 'ov-neg'}>
                {row.delta > 0 ? `+${row.delta}` : row.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && (
        <div className="ov-item" data-rarity="rare">
          <header className="ov-item-header">
            <h3>Storm Loop</h3>
            <h3>Iron Ring</h3>
          </header>
          <div className="ov-item-body">
            <p className="ov-muted">
              Item Level: <span className="ov-white">70</span>
            </p>
            <hr className="ov-sep" />
            <p className="ov-magic">Adds 1 to 4 Physical Damage to Attacks</p>
            <hr className="ov-sep" />
            <ul className="ov-mods">
              {mods.map((mod) => (
                <li key={mod.text}>
                  <span className={mod.top ? 'ov-tier ov-tier-top' : 'ov-tier'}>{mod.tier}</span>
                  {mod.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <footer className="ov-footer">
        <span>Alt+D compare · Ctrl+D price</span>
        <span>Esc close</span>
      </footer>
    </div>
  )
}
