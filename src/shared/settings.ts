export type HotkeyAction = 'compare' | 'equip'

export interface Settings {
  hotkeys: Record<HotkeyAction, string>
}

export const DEFAULT_SETTINGS: Settings = {
  hotkeys: {
    compare: 'Alt+D',
    equip: 'Alt+Shift+D',
  },
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  compare: 'Compare hovered item',
  equip: 'Save hovered item as equipped',
}

export function normalizeSettings(value: unknown): Settings {
  const hotkeys = (value as Partial<Settings> | null)?.hotkeys
  return {
    hotkeys: {
      compare: typeof hotkeys?.compare === 'string' ? hotkeys.compare : DEFAULT_SETTINGS.hotkeys.compare,
      equip: typeof hotkeys?.equip === 'string' ? hotkeys.equip : DEFAULT_SETTINGS.hotkeys.equip,
    },
  }
}
