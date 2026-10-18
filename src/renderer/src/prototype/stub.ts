const noop = async () => {}

window.overlay = {
  resize: noop,
  hide: noop,
  openSettings: noop,
  setLocked: noop,
  forgetGear: noop,
  clearGear: noop,
  prepareSearch: async () => ({ ok: false, error: 'Prototype' }),
  runSearch: async () => ({ ok: false, error: 'Prototype' }),
  openTrade: noop,
  ready: noop,
  rendered: noop,
  painted: noop,
  startDrag: noop,
  endDrag: noop,
  showTooltip: noop,
  hideTooltip: noop,
  on: () => () => {},
}
