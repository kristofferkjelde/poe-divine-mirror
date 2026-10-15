import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type CapturedItem, type OverlayApi } from '../shared/ipc'

const api: OverlayApi = {
  onItemCaptured: (listener) => {
    const handler = (_event: IpcRendererEvent, item: CapturedItem) => listener(item)
    ipcRenderer.on(IPC.itemCaptured, handler)
    return () => ipcRenderer.off(IPC.itemCaptured, handler)
  },
  resize: (height) => ipcRenderer.send(IPC.overlayResize, height),
  hide: () => ipcRenderer.send(IPC.overlayHide),
}

contextBridge.exposeInMainWorld('overlay', api)
