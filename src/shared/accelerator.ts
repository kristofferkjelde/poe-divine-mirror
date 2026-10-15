export interface KeyLike {
  key: string
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const MODIFIER_CODES = /^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/
const NAMED_CODES: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
}

export type AcceleratorResult =
  | { status: 'pending' }
  | { status: 'invalid'; reason: string }
  | { status: 'ok'; accelerator: string }

export function toAccelerator(event: KeyLike): AcceleratorResult {
  if (MODIFIER_CODES.test(event.code)) return { status: 'pending' }

  const key = keyName(event.code)
  if (!key) return { status: 'invalid', reason: `${event.key} can't be used as a hotkey` }

  const modifiers = [
    event.ctrlKey && 'Ctrl',
    event.altKey && 'Alt',
    event.shiftKey && 'Shift',
    event.metaKey && 'Super',
  ].filter((modifier): modifier is string => Boolean(modifier))

  const isFunctionKey = /^F\d{1,2}$/.test(key)
  if (!isFunctionKey && !event.ctrlKey && !event.altKey) {
    return { status: 'invalid', reason: 'Add Ctrl or Alt so the hotkey doesn’t clash with typing in game' }
  }

  return { status: 'ok', accelerator: [...modifiers, key].join('+') }
}

function keyName(code: string): string | undefined {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit) return code.startsWith('Numpad') ? `num${digit[1]}` : digit[1]
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code
  return NAMED_CODES[code]
}

export function formatAccelerator(accelerator: string): string {
  return accelerator.replace(/\+/g, ' + ')
}
