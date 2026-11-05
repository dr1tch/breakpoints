import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, BrowserWindow, ipcMain, Menu, shell, webContents } from "electron"
import type { Emulation } from "@shared/grid"

// Every frame shares this persistent session: sign in once, it survives restarts.
export const PARTITION = "persist:grid"

let win: BrowserWindow | null = null
// Only the folder this app just wrote can be opened from the renderer.
let lastShotDir: string | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0d1117",
    title: "Breakpoints",
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, "../preload/index.js"), contextIsolation: true, sandbox: true, webviewTag: true, backgroundThrottling: false },
  })
  win.webContents.on("will-navigate", (e, url) => {
    if (url !== win?.webContents.getURL()) e.preventDefault()
  })
  // Frames are untrusted pages: no preload, no node, fixed shared partition.
  win.webContents.on("will-attach-webview", (_e, prefs, params) => {
    delete prefs.preload
    prefs.nodeIntegration = false
    prefs.contextIsolation = true
    prefs.sandbox = true
    // Hidden or covered frames must keep painting, or screenshots wait forever for a frame.
    prefs.backgroundThrottling = false
    params.partition = PARTITION
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, "../renderer/index.html"))
}

// Pop-ups from a frame open in the real browser instead of a bare Electron window.
app.on("web-contents-created", (_e, wc) => {
  if (wc.getType() !== "webview") return
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: "deny" }
  })
})

function guest(id: number) {
  const wc = webContents.fromId(id)
  if (!wc || wc.getType() !== "webview" || wc.hostWebContents !== win?.webContents) throw new Error("Unknown frame")
  if (!wc.debugger.isAttached()) wc.debugger.attach("1.3")
  return wc
}

async function emulate(id: number, e: Emulation) {
  const d = guest(id).debugger
  const { device } = e
  await d.sendCommand("Emulation.setDeviceMetricsOverride", {
    width: e.width,
    height: e.height,
    deviceScaleFactor: device.dpr,
    mobile: device.mobile,
    scale: e.scale,
    screenWidth: e.width,
    screenHeight: e.height,
  })
  // CDP rejects maxTouchPoints 0, so only send it with touch on.
  await d.sendCommand("Emulation.setTouchEmulationEnabled", device.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
  // An empty string clears the override.
  await d.sendCommand("Emulation.setUserAgentOverride", { userAgent: device.userAgent ?? "" })
}

// Captures each frame's viewport at its CSS width x device pixel ratio, not at the on-screen scale.
async function screenshot(frames: { id: number; width: number; label: string }[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const dir = join(app.getPath("pictures"), "breakpoints", stamp)
  await mkdir(dir, { recursive: true })
  for (const f of frames) {
    const wc = guest(f.id)
    const capture = wc.debugger.sendCommand("Page.captureScreenshot", { format: "png" }) as Promise<{ data: string }>
    // The capture waits for a fresh frame; a static page may never paint one unless asked to.
    const repaint = setInterval(() => wc.invalidate(), 500)
    let res: { data: string }
    try {
      res = await Promise.race([
        capture,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`the ${f.width}px frame didn't render within 15 s`)), 15000)),
      ])
    } finally {
      clearInterval(repaint)
    }
    await writeFile(join(dir, `${f.width}px-${f.label.replace(/[^a-z0-9-]/gi, "")}.png`), Buffer.from(res.data, "base64"))
  }
  lastShotDir = dir
  return dir
}

function registerIpc() {
  ipcMain.handle("frame:emulate", (_e, id: number, em: Emulation) => emulate(Number(id), em))
  ipcMain.handle("frame:devtools", (_e, id: number) => guest(Number(id)).openDevTools({ mode: "detach" }))
  ipcMain.handle("frames:screenshot", (_e, frames: { id: number; width: number; label: string }[]) => screenshot(frames))
  ipcMain.handle("screenshots:open", () => {
    if (lastShotDir) shell.openPath(lastShotDir)
  })
  ipcMain.handle("open:external", (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })
}

app.whenReady().then(() => {
  // The default menu's accelerators (Ctrl+R reload, Ctrl+0 zoom) would steal the app's shortcuts.
  Menu.setApplicationMenu(null)
  registerIpc()
  createWindow()
})
app.on("window-all-closed", () => app.quit())
