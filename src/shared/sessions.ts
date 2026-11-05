// Named browser sessions (like Firefox containers). Each maps to its own persistent Electron
// partition, so cookies and storage are separate; tabs on the same session share a sign-in.

export type Session = { id: string; name: string; color: string }

export const DEFAULT_SESSION: Session = { id: "default", name: "Default", color: "#9198a1" }
const COLORS = ["#4493f8", "#ab7df8", "#db6d28", "#f778ba", "#3fb950", "#d29922"]

// "persist:grid" predates sessions; keeping it as Default keeps existing sign-ins.
export function partitionFor(id: string): string {
  return id === DEFAULT_SESSION.id ? "persist:grid" : `persist:s-${id}`
}

// The main process only lets a frame attach with a partition of this shape.
export function isSessionPartition(p: string): boolean {
  return p === "persist:grid" || /^persist:s-[a-z0-9-]{1,40}$/.test(p)
}

export function createSession(list: Session[], name: string, id: string): Session[] {
  const used = new Set(list.map((s) => s.color))
  const color = COLORS.find((c) => !used.has(c)) ?? COLORS[list.length % COLORS.length]
  return [...list, { id, name: name.trim() || `Session ${list.length + 1}`, color }]
}

// Default always exists and comes first; malformed or duplicate entries are dropped.
export function restoreSessions(raw: unknown): Session[] {
  const seen = new Set([DEFAULT_SESSION.id])
  const rest = (Array.isArray(raw) ? raw : []).filter((s): s is Session => {
    const ok = !!s && typeof s.id === "string" && isSessionPartition(partitionFor(s.id)) && typeof s.name === "string" && typeof s.color === "string" && !seen.has(s.id)
    if (ok) seen.add(s.id)
    return ok
  })
  return [DEFAULT_SESSION, ...rest]
}
