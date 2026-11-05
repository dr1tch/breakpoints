# Breakpoints

Desktop app that shows one web page at several device widths side by side. Desktop version of the `responsive-grid` Claude skill (`~/.claude/skills/responsive-grid`).

- **Breakpoint ruler**: click common widths grouped by phone / tablet / desktop, or add custom ones.
- **Real device emulation** per frame over the Chrome DevTools Protocol: below 600 px = phone (iPhone UA, touch, DPR 3), below 1024 px = tablet (iPad UA, touch, DPR 2), wider = desktop. Toggle with *Emulate devices*.
- **One shared session** (`persist:grid` partition): sign in once in any frame; it survives restarts.
- **Sync navigation**: a click in one frame loads the same page in the others (query/hash changes stay per frame).
- **Check overflow**: outlines elements cut by the viewport edge in red and lists them under each frame (in a popover when the frame is narrow).
- **Screenshots**: saves each frame at real resolution (width × DPR) to `~/Pictures/breakpoints/<timestamp>/`.
- **Presets**: save URL + widths + height by name, from the dock.
- **Shortcuts**: Ctrl+L address bar, Ctrl+R reload all, Ctrl+0 fit, Ctrl+Shift+O overflow, Ctrl+Shift+S screenshots (while focus is outside a frame).

## Develop

```sh
npm install
npm run dev        # add -- --no-sandbox if chrome-sandbox isn't setuid root
npm test && npm run typecheck
npm run dist:linux # AppImage + dist/breakpoints_amd64.deb
```
