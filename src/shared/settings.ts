export const HOTKEY_ACTIONS = ['compare', 'equip', 'price'] as const

export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number]

export const isHotkeyAction = (value: unknown): value is HotkeyAction =>
  HOTKEY_ACTIONS.includes(value as HotkeyAction)

export const THEMES = ['ember', 'mana', 'iron'] as const

export type Theme = (typeof THEMES)[number]

export const THEME_LABELS: Record<Theme, { name: string; hint: string }> = {
  ember: { name: 'Ember', hint: 'Obsidian and glowing embers' },
  mana: { name: 'Mana', hint: 'Sapphire glow in a bronze frame' },
  iron: { name: 'Iron', hint: 'Gunmetal and pale gold' },
}

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme)

export const UI_SCALES = [100, 110, 120] as const

export type UiScale = (typeof UI_SCALES)[number]

export const isUiScale = (value: unknown): value is UiScale => UI_SCALES.includes(value as UiScale)

export interface Point {
  x: number
  y: number
}

export interface Settings {
  hotkeys: Record<HotkeyAction, string>
  overlayPosition: Point | null
  overlayLocked: boolean
  league: string | null
  theme: Theme
  uiScale: UiScale
}

export const DEFAULT_SETTINGS: Settings = {
  hotkeys: {
    compare: 'Alt+D',
    equip: 'Alt+Shift+D',
    price: 'Ctrl+D',
  },
  overlayPosition: null,
  overlayLocked: false,
  league: null,
  theme: 'ember',
  uiScale: 100,
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  compare: 'Compare hovered item',
  equip: 'Save hovered item as equipped',
  price: 'Price check hovered item',
}

const isPoint = (value: unknown): value is Point =>
  typeof value === 'object' &&
  value !== null &&
  Number.isFinite((value as Point).x) &&
  Number.isFinite((value as Point).y)

export function normalizeSettings(value: unknown): Settings {
  const input = value as Partial<Settings> | null
  const hotkeys = input?.hotkeys
  return {
    hotkeys: Object.fromEntries(
      HOTKEY_ACTIONS.map((action) => {
        const value = hotkeys?.[action]
        return [action, typeof value === 'string' ? value : DEFAULT_SETTINGS.hotkeys[action]]
      }),
    ) as Settings['hotkeys'],
    overlayPosition: isPoint(input?.overlayPosition) ? input.overlayPosition : null,
    overlayLocked: input?.overlayLocked === true,
    league: typeof input?.league === 'string' && input.league.trim() !== '' ? input.league : null,
    theme: isTheme(input?.theme) ? input.theme : DEFAULT_SETTINGS.theme,
    uiScale: isUiScale(input?.uiScale) ? input.uiScale : DEFAULT_SETTINGS.uiScale,
  }
}
