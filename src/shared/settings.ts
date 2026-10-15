export type HotkeyAction = 'compare' | 'equip'

export interface Point {
  x: number
  y: number
}

export interface Settings {
  hotkeys: Record<HotkeyAction, string>
  overlayPosition: Point | null
  overlayLocked: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  hotkeys: {
    compare: 'Alt+D',
    equip: 'Alt+Shift+D',
  },
  overlayPosition: null,
  overlayLocked: false,
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  compare: 'Compare hovered item',
  equip: 'Save hovered item as equipped',
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
    },
    overlayPosition: isPoint(input?.overlayPosition) ? input.overlayPosition : null,
    overlayLocked: input?.overlayLocked === true,
  }
}
