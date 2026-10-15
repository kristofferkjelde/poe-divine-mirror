import type { Gear, GearSlot } from './gear'

export const IPC = {
  itemCaptured: 'item:captured',
  overlayResize: 'overlay:resize',
  overlayHide: 'overlay:hide',
} as const

export const HOTKEYS = {
  compare: 'Alt+D',
  equip: 'Alt+Shift+D',
} as const

export interface CapturedItem {
  text: string
  capturedAt: number
  gear: Gear
  equippedTo?: GearSlot
}

export interface OverlayApi {
  onItemCaptured: (listener: (item: CapturedItem) => void) => () => void
  resize: (height: number) => void
  hide: () => void
}
