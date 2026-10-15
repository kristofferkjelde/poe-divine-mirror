import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type CapturedItem, type OverlayApi, type SettingsApi } from '../shared/ipc'

const overlay: OverlayApi = {
  onItemCaptured: (listener) => {
    const handler = (_event: IpcRendererEvent, item: CapturedItem) => listener(item)
    ipcRenderer.on(IPC.itemCaptured, handler)
    return () => ipcRenderer.off(IPC.itemCaptured, handler)
  },
  resize: (height) => ipcRenderer.send(IPC.overlayResize, height),
  hide: () => ipcRenderer.send(IPC.overlayHide),
  openSettings: () => ipcRenderer.send(IPC.settingsOpen),
}

const settings: SettingsApi = {
  get: () => ipcRenderer.invoke(IPC.settingsGet),
  setHotkey: (action, accelerator) => ipcRenderer.invoke(IPC.settingsSetHotkey, action, accelerator),
  reset: () => ipcRenderer.invoke(IPC.settingsReset),
  setRecording: (recording) => ipcRenderer.send(IPC.settingsRecording, recording),
}

contextBridge.exposeInMainWorld('overlay', overlay)
contextBridge.exposeInMainWorld('settings', settings)
