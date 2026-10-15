# PoE Item Checker

**Is this item an upgrade?** Hover it in Path of Exile 2, press **Alt+D**, and find out without leaving the game.

<p align="center">
  <img src="docs/overlay.png" alt="The overlay showing a rare ring with its mods and tier badges" width="420" />
</p>

PoE Item Checker is a small overlay for Path of Exile 2. It shows the item under your cursor next to what you have equipped, stat by stat, and tells you whether it's an upgrade.

> **Early days:** the upgrade score uses sensible default weights (life, resistances, damage and so on). Tuning it to your build is next on the [roadmap](#roadmap).

---

## Install

1. Go to the [**Releases**](https://github.com/kristofferkjelde/poe-item-checker/releases/latest) page.
2. Download `PoE-Item-Checker-Setup-x.y.z.exe` and run it.
3. Windows may show **"Windows protected your PC"** because the app isn't code-signed. Click **More info → Run anyway**.

The app starts in the system tray (bottom-right, near the clock). Right-click the icon to quit.

**Requirements:** Windows 10 or 11.

## Set up the game

In Path of Exile 2, open **Options → Graphics** and set **Display Mode** to **Windowed Fullscreen** (or **Windowed**). In exclusive **Fullscreen**, nothing can draw on top of the game.

## Use it

| Do this | What happens |
| --- | --- |
| Hover an item you're **wearing** and press **Alt+Shift+D** | It's saved as your equipped item for that slot (do this once per slot) |
| Hover any other item and press **Alt+D** | It pops up next to your cursor with ▲ Upgrade, ▼ Downgrade or ≈ Sidegrade, and every stat that changes |
| Press **Esc** or click the game | The popup closes |
| Right-click the tray icon → **Quit** | The app closes |

Works anywhere you can hover an item: your inventory, stash, vendors, or the ground.

**Reading the popup**

- The **verdict** at the top adds up every stat difference, weighted by how much it usually matters. The percentage next to it is how much better or worse the new item is overall, e.g. **+57%**. Within ±2% counts as a sidegrade.
- The table lists each stat that changes: what you have **now**, what the **new** item has, and the difference in green or red. Greyed-out rows aren't counted in the score yet.
- Rings compare against whichever of your two rings is weaker, since that's the one you'd swap out.
- Saved gear survives restarts. Right-click the tray icon → **Clear saved gear** to start over.
- **P1–P6 / S1–S7** badges show whether a mod is a **P**refix or **S**uffix and its tier. Tier 1 is the best roll. T1 and T2 are highlighted in gold.
- Mod colors match the game: blue for normal mods, light blue for runes, red for corrupted.

## Is it safe? Will I get banned?

The app follows the same rules as popular tools like PoE Overlay and Exiled Exchange:

- It **never reads or changes game memory or files**.
- Each hotkey press sends **one** keypress to the game (Ctrl+Alt+C, the game's own "copy item" shortcut), which is what GGG allows.
- It doesn't automate gameplay in any way.

Your clipboard is put back the way it was right after the item is read.

## Troubleshooting

**Nothing happens when I press Alt+D**
- Check that the tray icon is there. Hover it: if it says the hotkey is taken, another app (often another overlay) already uses Alt+D. Close that app or let us know.
- Make sure your mouse is actually over an item and the game window is focused.

**The popup appears behind the game**
- Switch the game to **Windowed Fullscreen** (see [Set up the game](#set-up-the-game)).

**An item looks wrong**
- Hover it, press **Ctrl+Alt+C** in game, paste the text into a [new issue](https://github.com/kristofferkjelde/poe-item-checker/issues/new), and say what's off.

## Roadmap

- [x] **Overlay:** hotkey, item reading, tooltip with mod tiers
- [ ] **Build profile:** paste a Mobalytics build link or Path of Building code so the app knows which stats matter to you
- [x] **Remember your gear:** mark the items you're wearing once, per slot
- [x] **Compare on hover:** stat-by-stat differences against your equipped item, plus an overall upgrade score
- [ ] **Import your gear:** fetch what your character is wearing from your pathofexile.com profile
- [ ] **Later:** trade site search

---

## For developers

Built with Electron, React 19, TypeScript and Vite ([electron-vite](https://electron-vite.org)). Requires Node 22+. The hotkey and overlay only work on Windows, but the UI and tests run anywhere.

```sh
npm install        # also downloads Electron
npm run dev        # start the overlay with hot reload
npm test           # item parser tests
npm run typecheck
npm run dist       # build a Windows installer into release/
```

| Folder | What's inside |
| --- | --- |
| `src/main` | Electron main process: hotkey, clipboard capture, overlay window |
| `src/preload` | The small typed bridge between the window and the main process |
| `src/renderer` | React UI styled like the in-game tooltip |
| `src/shared/item` | Item text parser and types, unit tested against real item text |
| `src/shared/compare` | Stat extraction, weights, and the upgrade comparison |

**Releasing:** bump `version` in `package.json`, then push a tag like `v0.1.0`. GitHub Actions builds the Windows installer and publishes it on the Releases page.

## Credits

Inspired by [PoE Overlay](https://github.com/PoE-Overlay-Community/PoE-Overlay-Community-Fork) and [Exiled Exchange 2](https://github.com/Kvan7/Exiled-Exchange-2). Not affiliated with or endorsed by Grinding Gear Games.
