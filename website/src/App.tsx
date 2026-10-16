import { useState, type ReactNode } from 'react'
import { Divider } from './components/Divider'
import { EvaluateShots } from './components/EvaluateShots'
import { HeroDemo } from './components/HeroDemo'
import { Keys } from './components/Keys'
import { Screen } from './components/Screen'
import { DOWNLOAD_URL, ISSUES_URL, REPO_URL } from './links'
import { savedTheme, saveTheme, THEME_INFO, THEMES, type Theme } from './theme'

type ThemeProps = { theme: Theme; onTheme: (theme: Theme) => void }

export function App() {
  const [theme, setTheme] = useState<Theme>(savedTheme)

  const chooseTheme = (next: Theme) => {
    setTheme(next)
    saveTheme(next)
  }

  return (
    <div className="site" data-theme={theme}>
      <div className="embers" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <Nav theme={theme} onTheme={chooseTheme} />
      <main>
        <Hero theme={theme} />
        <Steps />
        <Feature
          id="compare"
          eyebrow="Compare"
          title="Equip it or skip it. One look."
          panel={
            <Screen
              name="compare"
              theme={theme}
              alt="Compare window: the boots you wear, the new boots and your build's boots side by side, with the verdict Equip it and a stat ledger"
            />
          }
        >
          <p>
            Press <Keys keys={['Alt', 'Z']} /> on any item: in your inventory, a stash tab, a vendor or on the
            ground. Divine Mirror sets it between what you wear and what your build wants, and gives you one
            answer: <b>Equip it</b>, <b>Wear it for now</b>, <b>Your call</b> or <b>Skip it</b>.
          </p>
          <ul className="ticks">
            <li>Real item art for all three, so you see at a glance what you're comparing</li>
            <li>A stat ledger with what you wear, this item and your build's item, column by column</li>
            <li>Rings are compared against your weaker ring, the one you'd swap out</li>
            <li>Show all stats for the full breakdown, with prefix and suffix tiers on every mod</li>
          </ul>
        </Feature>
        <Feature
          id="build"
          eyebrow="Your build"
          title="Weighted for the stats your build actually uses."
          panel={
            <Screen
              name="build"
              theme={theme}
              alt="Upgrade by 120 percent against the build's boots, scored for Spirit Walker Twister, with the gain or loss on every stat"
            />
          }
          flip
        >
          <p>
            Paste a Path of Building code, or a pobb.in, poe.ninja or Maxroll link. Divine Mirror reads the
            build's gear, main skill and defences, then boosts what matters (★) and ignores what doesn't.
          </p>
          <ul className="ticks">
            <li>Cast speed won't count on an attack build, energy shield won't count on evasion</li>
            <li>Every item is also scored against your build's item for that slot</li>
            <li>Fine-tune any weight yourself in Settings</li>
          </ul>
        </Feature>
        <Feature
          id="evaluate"
          eyebrow="Price check"
          title="What is it worth? Ask the trade site."
          panel={<EvaluateShots theme={theme} />}
          note="Switch between the Filters and Listings tabs."
        >
          <p>
            Press <Keys keys={['Ctrl', 'Alt', 'Z']} /> and Divine Mirror searches the official trade site for items like
            yours in the current league. The price is right at the top, with the real currency icons.
          </p>
          <ul className="ticks">
            <li>Filters: pick the mods that count, with pseudo totals, mod tiers and values at 20% quality</li>
            <li>Loosen or tighten every roll at once with one slider, or switch between Quick and Broad</li>
            <li>Listings: the cheapest matches with item level, quality and when they were listed</li>
            <li>Open the same search on the trade site to fine-tune it</li>
          </ul>
        </Feature>
        <Themes theme={theme} onTheme={chooseTheme} />
        <Safety />
        <Download />
      </main>
      <Footer />
    </div>
  )
}

function Nav({ theme, onTheme }: ThemeProps) {
  return (
    <header className="nav">
      <a className="brand" href="#top">
        <img src="/icon.svg" alt="" width={34} height={34} />
        <span>Divine Mirror</span>
      </a>
      <nav className="nav-links">
        <a href="#compare">Compare</a>
        <a href="#build">Build</a>
        <a href="#evaluate">Price check</a>
        <a href="#themes">Themes</a>
        <a href="#safe">Is it safe?</a>
        <span className="nav-themes" role="group" aria-label="Theme">
          {THEMES.map((id) => (
            <button
              key={id}
              type="button"
              className="theme-swatch"
              data-swatch={id}
              aria-pressed={theme === id}
              aria-label={THEME_INFO[id].label}
              title={THEME_INFO[id].label}
              onClick={() => onTheme(id)}
            >
              <i />
            </button>
          ))}
        </span>
        <a className="nav-cta" href={DOWNLOAD_URL}>
          Download
        </a>
      </nav>
    </header>
  )
}

function Hero({ theme }: { theme: Theme }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <div className="hero-crest">
          <img src="/icon.svg" alt="Divine Mirror icon: a crowned divine orb" width={120} height={120} />
        </div>
        <p className="eyebrow">A free overlay for Path of Exile 2</p>
        <h1>
          Is this item <em>an upgrade?</em>
        </h1>
        <p className="lead">
          Hover it, press <Keys keys={['Alt', 'Z']} />, and know. Divine Mirror puts the item between what you
          wear and what your build wants, stat by stat, without leaving the game.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={DOWNLOAD_URL}>
            <WindowsLogo /> Download for Windows
          </a>
          <a className="btn btn-ghost" href={REPO_URL}>
            View on GitHub
          </a>
        </div>
        <p className="hero-meta">Free and open source · Windows 10 and 11</p>
      </div>
      <HeroDemo theme={theme} />
    </section>
  )
}

const steps = [
  {
    keys: ['Alt', 'Shift', 'Z'],
    title: 'Save what you wear',
    text: 'Hover each item you have equipped once. Divine Mirror remembers it, even after a restart.',
  },
  {
    keys: ['Alt', 'Z'],
    title: 'Compare anything',
    text: 'Hover any other item and the verdict pops up in the middle of your screen.',
  },
  {
    keys: ['Ctrl', 'Alt', 'Z'],
    title: 'Check the price',
    text: 'See what similar items sell for on the trade site before you vendor or list it.',
  },
]

function Steps() {
  return (
    <section className="steps" aria-labelledby="steps-title">
      <SectionTitle id="steps-title" eyebrow="How it works" title="Three hotkeys. That's it." />
      <ol className="steps-list">
        {steps.map((step, i) => (
          <li key={step.title} className="card">
            <span className="step-num">{['I', 'II', 'III'][i]}</span>
            <Keys keys={step.keys} className="keys-lg" />
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

type FeatureProps = {
  id: string
  eyebrow: string
  title: string
  panel: ReactNode
  note?: string
  flip?: boolean
  children: ReactNode
}

function Feature({ id, eyebrow, title, panel, note, flip, children }: FeatureProps) {
  return (
    <section className={flip ? 'feature feature-flip' : 'feature'} id={id}>
      <div className="feature-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {children}
      </div>
      <div className="feature-panel">
        <div className="panel-glow">{panel}</div>
        {note && <p className="panel-note">{note}</p>}
      </div>
    </section>
  )
}

function Themes({ theme, onTheme }: ThemeProps) {
  return (
    <section className="themes" id="themes" aria-labelledby="themes-title">
      <SectionTitle id="themes-title" eyebrow="Themes" title="Three looks. Pick yours." />
      <div className="theme-picker" role="radiogroup" aria-label="Theme">
        {THEMES.map((id) => (
          <label key={id} className="theme-option card">
            <input type="radio" name="theme" checked={theme === id} onChange={() => onTheme(id)} />
            <span className="theme-swatch" data-swatch={id}>
              <i />
            </span>
            <b>{THEME_INFO[id].label}</b>
            <span>{THEME_INFO[id].text}</span>
          </label>
        ))}
      </div>
      <p className="themes-note">
        Every screenshot on this page follows your pick. In the app it's one click in Settings, and every window
        changes with it.
      </p>
      <div className="themes-gallery">
        <Screen
          name="item"
          theme={theme}
          alt="Item window: Storm Trail, Daggerfoot Shoes, with its properties and the tier of every mod"
        />
        <Screen
          name="worn"
          theme={theme}
          alt="Upgrade by 145 percent against the boots you wear, with the gain or loss on every stat"
        />
      </div>
    </section>
  )
}

const safety = [
  { title: 'No memory reading', text: 'It never reads or changes game memory or files.' },
  {
    title: 'One keypress',
    text: "Each hotkey sends the game's own copy-item shortcut, Ctrl+Alt+C, and nothing more.",
  },
  { title: 'No automation', text: "It doesn't play the game for you in any way." },
  {
    title: 'Polite to the trade site',
    text: 'Price checks are normal public searches that respect the rate limits.',
  },
]

function Safety() {
  return (
    <section className="safety" id="safe" aria-labelledby="safe-title">
      <SectionTitle
        id="safe-title"
        eyebrow="Is it safe?"
        title="Built by the same rules as the overlays you already trust."
      />
      <ul className="safety-grid">
        {safety.map((item) => (
          <li key={item.title} className="card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
      <p className="safety-note">
        Your clipboard is put back the way it was right after the item is read.
      </p>
    </section>
  )
}

function Download() {
  return (
    <section className="download" id="download" aria-labelledby="download-title">
      <div className="download-card">
        <img src="/icon.svg" alt="" width={96} height={96} className="download-icon" />
        <h2 id="download-title">Get Divine Mirror</h2>
        <ol className="download-steps">
          <li>
            Download <code>Divine-Mirror-Setup.exe</code> from the latest release and run it.
          </li>
          <li>
            If Windows says <q>Windows protected your PC</q>, click <b>More info</b> and then <b>Run anyway</b>.
            The app isn't code-signed yet.
          </li>
          <li>
            In the game, set <b>Options → Graphics → Display Mode</b> to <b>Windowed Fullscreen</b> so the
            overlay can draw on top.
          </li>
        </ol>
        <p className="download-note">
          From version 0.5.0 on, Divine Mirror tells you when a new version is out. Click the notification, or use
          the tray menu, to update without leaving the app.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={DOWNLOAD_URL}>
            <WindowsLogo /> Download for Windows
          </a>
          <a className="btn btn-ghost" href={ISSUES_URL}>
            Report a problem
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <Divider />
      <p>
        Divine Mirror is a free fan-made tool. It is not affiliated with or endorsed by Grinding Gear Games.
        Path of Exile is a trademark of Grinding Gear Games.
      </p>
      <p>
        Inspired by PoE Overlay and Exiled Exchange 2 · <a href={REPO_URL}>Source on GitHub</a>
      </p>
    </footer>
  )
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <Divider />
    </div>
  )
}

function WindowsLogo() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path fill="currentColor" d="M0 2.2 6.5 1.3v6.2H0zM7.3 1.2 16 0v7.5H7.3zM0 8.3h6.5v6.3L0 13.7zM7.3 8.3H16V16l-8.7-1.2z" />
    </svg>
  )
}
