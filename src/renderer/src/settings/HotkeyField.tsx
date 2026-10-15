import { useState, type KeyboardEvent } from 'react'
import { formatAccelerator, toAccelerator } from '../../../shared/accelerator'
import { HOTKEY_LABELS, type HotkeyAction } from '../../../shared/settings'
import { setSettingsState } from './settingsStore'

interface Props {
  action: HotkeyAction
  accelerator: string
  unavailable: boolean
}

export function HotkeyField({ action, accelerator, unavailable }: Props) {
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const stop = () => {
    setRecording(false)
    window.settings.setRecording(false)
  }

  const start = () => {
    setMessage(null)
    setRecording(true)
    window.settings.setRecording(true)
  }

  const handleKeyDown = async (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return
    event.preventDefault()
    if (event.key === 'Escape') {
      stop()
      return
    }

    const result = toAccelerator(event)
    if (result.status === 'pending') return
    if (result.status === 'invalid') {
      setMessage(result.reason)
      return
    }

    setSaving(true)
    const response = await window.settings.setHotkey(action, result.accelerator)
    setSaving(false)
    stop()
    if (response.ok) {
      setSettingsState(response.state)
      setMessage(null)
    } else {
      setMessage(response.error)
    }
  }

  const status = message ?? (unavailable ? 'Taken by another app. Click to pick a different combination.' : null)

  return (
    <div className="hotkey-field">
      <label htmlFor={`hotkey-${action}`}>{HOTKEY_LABELS[action]}</label>
      <button
        id={`hotkey-${action}`}
        type="button"
        className="hotkey-button"
        data-recording={recording}
        data-error={Boolean(status)}
        disabled={saving}
        onClick={() => (recording ? stop() : start())}
        onKeyDown={handleKeyDown}
        onBlur={() => recording && stop()}
      >
        {recording ? 'Press the new keys…' : formatAccelerator(accelerator)}
      </button>
      {status && <p className="hotkey-status">{status}</p>}
    </div>
  )
}
