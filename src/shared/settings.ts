export const HOTKEY_ACTIONS = ['compare', 'equip', 'price'] as const

export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number]

export const isHotkeyAction = (value: unknown): value is HotkeyAction =>
  HOTKEY_ACTIONS.includes(value as HotkeyAction)

export interface Point {
  x: number
  y: number
}

export interface Settings {
  hotkeys: Record<HotkeyAction, string>
  overlayPosition: Point | null
  overlayLocked: boolean
  league: string | null
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
  }
}
