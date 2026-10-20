import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  API_METHODS,
  apiChannel,
  messageChannel,
  SETTINGS_ARGUMENT,
  SETTINGS_CHANGED_CHANNEL,
  TOOLTIP_ARGUMENT,
  TOOLTIP_CHANNEL,
  TOP_BAR_ARGUMENT,
  TOP_BAR_CHANNEL,
  type ApiScope,
  type OverlayBridge,
  type SettingsApi,
  type SettingsBridge,
  type TooltipApi,
  type TooltipBridge,
  type TooltipContent,
  type TopBarApi,
  type TopBarBridge,
  type TopBarState,
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

const settings: SettingsBridge = {
  ...proxy<SettingsApi>('settings'),
  onChanged: (listener) => {
    const handler = () => listener()
    ipcRenderer.on(SETTINGS_CHANGED_CHANNEL, handler)
    return () => ipcRenderer.off(SETTINGS_CHANGED_CHANNEL, handler)
  },
}

const topBar: TopBarBridge = {
  ...proxy<TopBarApi>('topBar'),
  onState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: TopBarState) => listener(state)
    ipcRenderer.on(TOP_BAR_CHANNEL, handler)
    return () => ipcRenderer.off(TOP_BAR_CHANNEL, handler)
  },
}

if (process.argv.includes(SETTINGS_ARGUMENT)) {
  contextBridge.exposeInMainWorld('settings', settings)
} else if (process.argv.includes(TOOLTIP_ARGUMENT)) {
  contextBridge.exposeInMainWorld('tooltip', tooltip)
} else if (process.argv.includes(TOP_BAR_ARGUMENT)) {
  contextBridge.exposeInMainWorld('topBar', topBar)
} else {
  contextBridge.exposeInMainWorld('overlay', overlay)
}
