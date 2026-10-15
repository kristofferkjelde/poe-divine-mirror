export type HotkeyAction = 'compare' | 'equip' | 'price'

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
    hotkeys: {
      compare: typeof hotkeys?.compare === 'string' ? hotkeys.compare : DEFAULT_SETTINGS.hotkeys.compare,
      equip: typeof hotkeys?.equip === 'string' ? hotkeys.equip : DEFAULT_SETTINGS.hotkeys.equip,
      price: typeof hotkeys?.price === 'string' ? hotkeys.price : DEFAULT_SETTINGS.hotkeys.price,
    },
    overlayPosition: isPoint(input?.overlayPosition) ? input.overlayPosition : null,
    overlayLocked: input?.overlayLocked === true,
    league: typeof input?.league === 'string' && input.league.trim() !== '' ? input.league : null,
  }
}
