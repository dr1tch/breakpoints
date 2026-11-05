# Breakpoints

See one web page at every device width side by side, with real phone and tablet emulation, overflow checks and screenshots.

[![Breakpoints demo: one page at several widths, tabs, sessions and the overflow check](https://github.com/dr1tch/breakpoints/releases/download/media/demo.gif)](https://github.com/dr1tch/breakpoints/releases/download/v0.3.0/breakpoints-demo.mp4)

▶ **[Watch the 50-second demo with sound](https://github.com/dr1tch/breakpoints/releases/download/v0.3.0/breakpoints-demo.mp4)** (MP4)

Breakpoints is a desktop app for Linux and Windows. Enter the URL of the page you are building and it loads that page once per width, scaled to fit the window. Each phone or tablet frame behaves like the device: mobile user agent, touch support and a high pixel ratio. Click a link in one frame and every frame follows. One click finds the elements that stick out past the screen edge at each width.

## Features

- **Tabs:** like Chrome. Each tab has its own page, widths and height; background tabs stay loaded. Drag to reorder, middle-click to close, and tabs come back after a restart.
- **Breakpoint ruler:** common widths grouped by phone (360, 375, 390, 414), tablet (768, 820) and desktop (1024 to 2560). Click a width to add or remove its frame, or add custom widths from 200 to 3840 px.
- **Real device emulation:** each frame is emulated over the Chrome DevTools Protocol, so pages see a real viewport, not a squeezed iframe. Below 600 px a frame is a phone (iPhone user agent, touch, pixel ratio 3); below 1024 px a tablet (iPad user agent, touch, pixel ratio 2); wider frames are desktop. Turn it off with **Emulate**.
- **Sessions:** like Firefox containers. Each tab uses a named session with its own cookies and storage, so the same page can be open as different users side by side. Tabs on the same session share one sign-in, which survives restarts. **Default** always exists; deleting another session signs it out and wipes its data.
- **Sync navigation:** a click in one frame loads the same page in the others. Query and hash changes stay per frame. Turn it off with **Sync**.
- **Overflow check:** finds elements cut off by the left or right screen edge (ignoring intentional scrollers and carousels), outlines them in red inside the frame and lists them under it with how many pixels stick out. Narrow frames show the details in a popover.
- **Screenshots:** saves every frame at its real resolution (width × pixel ratio, e.g. 1125 px wide for a 375 px phone) to `~/Pictures/breakpoints/<timestamp>/`.
- **Presets:** save the current URL, widths and height under a name and reapply them from the dock.
- **Per-frame tools:** open a frame's page in your browser, or open DevTools for just that frame.
- **Clear states:** an empty state on first run, a loading indicator while frames load one after another, and a "server isn't answering" message with **Retry** when a page fails.

## Install

### Ubuntu / Debian (apt)

Add the repository once, then install and update with apt:

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://dr1tch.github.io/breakpoints/breakpoints.asc | sudo tee /etc/apt/keyrings/breakpoints.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/breakpoints.asc] https://dr1tch.github.io/breakpoints ./" | sudo tee /etc/apt/sources.list.d/breakpoints.list
sudo apt update && sudo apt install breakpoints
```

New versions arrive with `sudo apt upgrade`.

### Other downloads

Get the `.deb`, AppImage or Windows installer from [Releases](https://github.com/dr1tch/breakpoints/releases). The latest `.deb` is always at [`releases/latest/download/breakpoints_amd64.deb`](https://github.com/dr1tch/breakpoints/releases/latest/download/breakpoints_amd64.deb). On Ubuntu 24.04+, prefer the `.deb`: AppArmor blocks the AppImage's sandbox unless you start it with `--no-sandbox`.

## Usage

1. Type the page's URL in the address bar and press **Enter** (or **Go**). Any `http` or `https` URL works, e.g. `localhost:3000/dashboard`.
2. Pick widths on the ruler. **Fit** scales all frames to the window: one row when they stay readable, otherwise two columns.
3. If the page needs a login, sign in inside any frame once. To compare accounts, open a new tab, pick **New session** in the session menu left of the address bar, and sign in as the other user.
4. Click **Overflow** to check every width, or **Screenshots** to save them.

| Shortcut | Action |
|---|---|
| `Ctrl+T` / `Ctrl+W` | New tab / close tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+1` … `Ctrl+9` | Go to tab 1 … 8, or the last tab |
| `Ctrl+L` | Focus the address bar |
| `Ctrl+R` | Reload all frames |
| `Ctrl+0` | Fit frames to the window |
| `Ctrl+Shift+O` | Check overflow |
| `Ctrl+Shift+S` | Save screenshots |

Shortcuts work while focus is outside a frame; a focused frame keeps its own keys.

Frames start 1.5 s apart, so apps that refresh a shared session on load don't race each other. Everything you click inside a frame is real: it talks to whatever server the page uses.

## Screenshots

| Same page, three accounts: one tab per session | Session menu |
|---|---|
| ![Three tabs signed in as different users, with overflow results](https://github.com/dr1tch/breakpoints/releases/download/media/overview.png) | ![Session menu with Default, Admin and Client](https://github.com/dr1tch/breakpoints/releases/download/media/sessions.png) |
| **Five widths, overflow details in a popover** | **Presets** |
| ![Five frames with overflow results](https://github.com/dr1tch/breakpoints/releases/download/media/five-widths.png) | ![Presets menu in the dock](https://github.com/dr1tch/breakpoints/releases/download/media/presets.png) |
| **New tab** | |
| ![Empty state of a new tab](https://github.com/dr1tch/breakpoints/releases/download/media/empty.png) | |

## Development

Electron, React and Tailwind. Needs Node 24.

```bash
npm install
npm run dev                  # run with hot reload (add -- --no-sandbox if chrome-sandbox isn't setuid root)
npm test && npm run typecheck
npm run dist:linux           # dist/*.AppImage + dist/*.deb
npm run dist:win             # dist/Breakpoints Setup *.exe (needs wine on Linux)
```

The session, settings and presets live in the app's user-data folder: `~/.config/breakpoints/` on Linux, `%APPDATA%\breakpoints\` on Windows.

### Releasing

Push a version tag. `.github/workflows/release.yml` builds the Linux and Windows installers and attaches them to a GitHub release. Then `.github/workflows/apt.yml` publishes that release's `.deb` to the APT repository on GitHub Pages, signed with the `APT_GPG_KEY` secret.

```bash
git tag v0.3.0 && git push origin v0.3.0
```

## License

[MIT](LICENSE)
