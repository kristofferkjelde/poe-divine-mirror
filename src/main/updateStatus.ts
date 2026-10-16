export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; manual: boolean }
  | { kind: 'latest' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'failed'; message: string }

export interface UpdateMenuItem {
  label: string
  action?: 'check' | 'download' | 'install'
}

export function updateMenuItem(status: UpdateStatus): UpdateMenuItem {
  switch (status.kind) {
    case 'checking':
      return { label: 'Checking for updates…' }
    case 'available':
      return { label: `Update to ${status.version}`, action: 'download' }
    case 'downloading':
      return { label: `Downloading ${status.version}… ${Math.floor(status.percent)}%` }
    case 'ready':
      return { label: `Restart to update to ${status.version}`, action: 'install' }
    default:
      return { label: 'Check for updates', action: 'check' }
  }
}

export function trayTooltip(version: string, status: UpdateStatus, hint: string): string {
  const update =
    status.kind === 'available' || status.kind === 'downloading'
      ? `Update ${status.version} available`
      : status.kind === 'ready'
        ? `Update ${status.version} ready, restart to install`
        : null
  return [`Divine Mirror ${version}`, update ?? hint].join('\n')
}
