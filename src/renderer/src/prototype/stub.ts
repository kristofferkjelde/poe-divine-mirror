const noop = async () => {}

window.overlay = {
  resize: noop,
  hide: noop,
  openSettings: noop,
  setLocked: noop,
  forgetGear: noop,
  prepareSearch: async () => ({ ok: false, error: 'Prototype' }),
  runSearch: async () => ({ ok: false, error: 'Prototype' }),
  openTrade: noop,
  on: () => () => {},
}
