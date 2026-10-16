import { describe, expect, it } from 'vitest'
import { trayTooltip, updateMenuItem } from './updateStatus'

describe('update status', () => {
  it('offers the next step for each state', () => {
    expect(updateMenuItem({ kind: 'idle' })).toEqual({ label: 'Check for updates', action: 'check' })
    expect(updateMenuItem({ kind: 'available', version: '0.5.0' })).toEqual({ label: 'Update to 0.5.0', action: 'download' })
    expect(updateMenuItem({ kind: 'downloading', version: '0.5.0', percent: 42.7 })).toEqual({ label: 'Downloading 0.5.0… 42%' })
    expect(updateMenuItem({ kind: 'ready', version: '0.5.0' })).toEqual({ label: 'Restart to update to 0.5.0', action: 'install' })
    expect(updateMenuItem({ kind: 'failed', message: 'offline' })).toEqual({ label: 'Check for updates', action: 'check' })
  })

  it('shows the version in the tray tooltip and mentions a new release', () => {
    expect(trayTooltip('0.4.0', { kind: 'latest' }, 'Hover an item and press Alt+D')).toBe('Divine Mirror 0.4.0\nHover an item and press Alt+D')
    expect(trayTooltip('0.4.0', { kind: 'available', version: '0.5.0' }, 'hint')).toBe('Divine Mirror 0.4.0\nUpdate 0.5.0 available')
    expect(trayTooltip('0.4.0', { kind: 'ready', version: '0.5.0' }, 'hint')).toBe('Divine Mirror 0.4.0\nUpdate 0.5.0 ready, restart to install')
  })
})
