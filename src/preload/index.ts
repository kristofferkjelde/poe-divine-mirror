import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { API_METHODS, apiChannel, messageChannel, type ApiScope, SETTINGS_ARGUMENT, type OverlayBridge, type SettingsApi } from '../shared/ipc'

function proxy<T>(scope: ApiScope): T {
  return Object.fromEntries(
    API_METHODS[scope].map((method) => [method, (...args: unknown[]) => ipcRenderer.invoke(apiChannel(scope, method), ...args)]),
  ) as T
}

const overlay: OverlayBridge = {
  ...proxy<Omit<OverlayBridge, 'on'>>('overlay'),
  on: (name, listener) => {
    const handler = (_event: IpcRendererEvent, payload: Parameters<typeof listener>[0]) => listener(payload)
    ipcRenderer.on(messageChannel(name), handler)
    return () => ipcRenderer.off(messageChannel(name), handler)
  },
}

if (process.argv.includes(SETTINGS_ARGUMENT)) {
  contextBridge.exposeInMainWorld('settings', proxy<SettingsApi>('settings'))
} else {
  contextBridge.exposeInMainWorld('overlay', overlay)
}
