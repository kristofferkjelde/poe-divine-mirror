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
  setLocked: (locked) => ipcRenderer.invoke(IPC.overlaySetLocked, locked),
  forgetGear: (slot) => ipcRenderer.invoke(IPC.gearForget, slot),
  checkPrice: (text) => ipcRenderer.invoke(IPC.priceCheck, text),
  openTrade: (url) => ipcRenderer.send(IPC.openTrade, url),
}

const settings: SettingsApi = {
  get: () => ipcRenderer.invoke(IPC.settingsGet),
  setHotkey: (action, accelerator) => ipcRenderer.invoke(IPC.settingsSetHotkey, action, accelerator),
  reset: () => ipcRenderer.invoke(IPC.settingsReset),
  resetPosition: () => ipcRenderer.invoke(IPC.settingsResetPosition),
  setLocked: (locked) => ipcRenderer.invoke(IPC.overlaySetLocked, locked),
  setRecording: (recording) => ipcRenderer.send(IPC.settingsRecording, recording),
  importBuild: (input) => ipcRenderer.invoke(IPC.buildImport, input),
  removeBuild: () => ipcRenderer.invoke(IPC.buildRemove),
  setBuildWeight: (stat, weight) => ipcRenderer.invoke(IPC.buildSetWeight, stat, weight),
  resetBuildWeights: () => ipcRenderer.invoke(IPC.buildResetWeights),
  listLeagues: () => ipcRenderer.invoke(IPC.tradeLeagues),
  setLeague: (league) => ipcRenderer.invoke(IPC.settingsSetLeague, league),
}

contextBridge.exposeInMainWorld('overlay', overlay)
contextBridge.exposeInMainWorld('settings', settings)
