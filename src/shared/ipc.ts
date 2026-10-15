export const IPC = {
  itemCaptured: 'item:captured',
  overlayResize: 'overlay:resize',
  overlayHide: 'overlay:hide',
} as const

export interface CapturedItem {
  text: string
  capturedAt: number
}

export interface OverlayApi {
  onItemCaptured: (listener: (item: CapturedItem) => void) => () => void
  resize: (height: number) => void
  hide: () => void
}
