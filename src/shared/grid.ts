// Pure grid logic shared by main and renderer. No DOM or Electron here, so it is testable with node --test.

export const GAP = 16
export const DEFAULT_WIDTHS = [375, 768, 1024, 1280, 1920]
export const DEFAULT_HEIGHT = 800

export type Device = { mobile: boolean; touch: boolean; dpr: number; userAgent: string | null; label: string }

// What a frame emulates, sent to main to apply over the Chrome DevTools Protocol.
export type Emulation = { width: number; height: number; scale: number; device: Device }

export type Preset = { name: string; url: string; widths: number[]; height: number }

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

const DESKTOP: Device = { mobile: false, touch: false, dpr: 1, userAgent: null, label: "desktop" }

// Below 600 px is a phone, below 1024 a tablet; wider frames stay desktop.
export function deviceFor(width: number, emulate: boolean): Device {
  const kind = kindOf(width)
  if (!emulate || kind === "desktop") return DESKTOP
  if (kind === "phone") return { mobile: true, touch: true, dpr: 3, userAgent: IPHONE_UA, label: "phone" }
  return { mobile: true, touch: true, dpr: 2, userAgent: IPAD_UA, label: "tablet" }
}

export function parseWidths(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 200 && n <= 3840)
}

export function parseHeight(text: string): number | null {
  const n = Number(text)
  return Number.isInteger(n) && n >= 300 && n <= 2400 ? n : null
}

// Only http(s) pages load in a frame; a bare host gets http://.
export function normalizeUrl(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(t) ? t : `http://${t}`)
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null
  } catch {
    return null
  }
}

// All widths in one row when that keeps scale >= 25 %, otherwise two columns of the widest.
export function fitScale(available: number, widths: number[]): number {
  if (!widths.length) return 1
  // Gaps are fixed pixels; only the frames scale.
  const oneRow = (available - GAP * (widths.length - 1)) / widths.reduce((s, w) => s + w, 0)
  if (oneRow >= 0.25) return Math.min(1, oneRow)
  return Math.max(0.15, Math.min(1, (available - GAP) / (Math.max(...widths) * 2)))
}

// Same document = same origin + path; query and hash changes stay per frame.
export function samePage(a: string, b: string): boolean {
  try {
    const x = new URL(a)
    const y = new URL(b)
    return x.origin === y.origin && x.pathname === y.pathname
  } catch {
    return a === b
  }
}

// Sync navigation. A frame we sent somewhere is "expected" until it lands there (or 15 s pass,
// covering redirects); its reports are ignored meanwhile. Any other page change is the user's
// click and is copied to the other frames.
export type SyncState = { url: string; expected: ({ url: string; at: number } | null)[] }

export function startSync(url: string, frames: number, now: number): SyncState {
  return { url, expected: Array.from({ length: frames }, () => ({ url, at: now })) }
}

export function onNavigated(s: SyncState, i: number, url: string, now: number, sync: boolean): { state: SyncState; targets: number[] } {
  const exp = s.expected[i]
  if (exp) {
    if (!samePage(url, exp.url) && now - exp.at < 15000) return { state: s, targets: [] }
    const expected = [...s.expected]
    expected[i] = null
    return { state: { ...s, expected }, targets: [] }
  }
  if (!sync || samePage(url, s.url)) return { state: s, targets: [] }
  const targets = s.expected.map((_, j) => j).filter((j) => j !== i)
  const expected = s.expected.map((e, j) => (j === i ? null : { url, at: now }))
  return { state: { url, expected }, targets }
}

export function upsertPreset(list: Preset[], p: Preset): Preset[] {
  return [...list.filter((x) => x.name !== p.name), p].sort((a, b) => a.name.localeCompare(b.name))
}

export type DeviceKind = "phone" | "tablet" | "desktop"

export function kindOf(width: number): DeviceKind {
  return width < 600 ? "phone" : width < 1024 ? "tablet" : "desktop"
}

// The breakpoint ruler: common widths grouped by device. Anything else is a custom width.
export const RULER: { kind: DeviceKind; widths: number[] }[] = [
  { kind: "phone", widths: [360, 375, 390, 414] },
  { kind: "tablet", widths: [768, 820] },
  { kind: "desktop", widths: [1024, 1280, 1440, 1920, 2560] },
]
const RULER_WIDTHS = new Set(RULER.flatMap((g) => g.widths))

export function isCustom(width: number): boolean {
  return !RULER_WIDTHS.has(width)
}

// Adds or removes a width, keeping the list sorted; the last width can't be removed.
export function toggleWidth(widths: number[], w: number): number[] {
  if (widths.includes(w)) return widths.length > 1 ? widths.filter((x) => x !== w) : widths
  return [...widths, w].sort((a, b) => a - b)
}
