# PoE Item Checker

A Path of Exile 2 overlay that compares the item under your cursor with what you have equipped and tells you whether it is an upgrade for your build.

## How it works

Hover an item in game and press **Alt+D**. The app sends the game's advanced copy shortcut (Ctrl+Alt+C), reads the item text from the clipboard, restores whatever was on your clipboard before, and shows the item in a panel next to your cursor. Press **Esc** or click back into the game to close it.

It never reads game memory. Like PoE Overlay 2 and Exiled Exchange 2, it only sends a single keypress per hotkey, which is the approach GGG allows.

Run the game in **Windowed** or **Windowed Fullscreen** mode, otherwise the overlay can't draw on top of it.

## Development

Requires Node 22+ and Windows for the in-game hotkey.

```sh
npm install
npm run dev        # start the overlay with hot reload
npm test           # item parser tests
npm run typecheck
npm run dist       # build a Windows installer into release/
```

## Project layout

- `src/main` – Electron main process: hotkey, clipboard capture, overlay window
- `src/preload` – the small, typed bridge the overlay UI talks to
- `src/renderer` – React UI styled like the in-game tooltip
- `src/shared/item` – item text parser and types, shared and unit tested

## Roadmap

1. Overlay shell: hotkey, item parsing, tooltip-style panel
2. Build profile: import a Mobalytics build or Path of Building code as stat weights
3. Remember your gear: mark hovered items as equipped, per slot
4. Compare on hover: stat-by-stat diff and a build-weighted upgrade score
