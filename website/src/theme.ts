export const THEMES = ['ember', 'mana', 'iron'] as const

export type Theme = (typeof THEMES)[number]

export const THEME_INFO: Record<Theme, { label: string; text: string }> = {
  ember: { label: 'Ember', text: 'Obsidian and glowing embers' },
  mana: { label: 'Mana', text: 'Sapphire glow in a bronze frame' },
  iron: { label: 'Iron', text: 'Gunmetal and pale gold' },
}

const STORAGE_KEY = 'divine-mirror-theme'

export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return THEMES.find((theme) => theme === value) ?? 'ember'
  } catch {
    return 'ember'
  }
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private windows can refuse storage; the pick then lasts for this visit only.
  }
}
