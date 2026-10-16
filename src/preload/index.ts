import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  API_METHODS,
  apiChannel,
  messageChannel,
  SETTINGS_ARGUMENT,
  TOOLTIP_ARGUMENT,
  TOOLTIP_CHANNEL,
  type ApiScope,
  type OverlayBridge,
  type SettingsApi,
  type TooltipApi,
  type TooltipBridge,
  type TooltipContent,
} from '../shared/ipc'

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

const tooltip: TooltipBridge = {
  ...proxy<TooltipApi>('tooltip'),
  onContent: (listener) => {
    const handler = (_event: IpcRendererEvent, content: TooltipContent | null) => listener(content)
    ipcRenderer.on(TOOLTIP_CHANNEL, handler)
    return () => ipcRenderer.off(TOOLTIP_CHANNEL, handler)
  },
}

if (process.argv.includes(SETTINGS_ARGUMENT)) {
  contextBridge.exposeInMainWorld('settings', proxy<SettingsApi>('settings'))
} else if (process.argv.includes(TOOLTIP_ARGUMENT)) {
  contextBridge.exposeInMainWorld('tooltip', tooltip)
} else {
  contextBridge.exposeInMainWorld('overlay', overlay)
}
