// Pure tab-strip logic. Rendering and persistence live in the renderer.

export type GridConfig = { url: string; widths: number[]; height: number; emulate: boolean }
// session: id of a Session (see sessions.ts); tabs saved before sessions existed get "default".
export type Tab = { id: string; title: string; session: string; config: GridConfig }
export type TabsState = { tabs: Tab[]; active: string }

// New tabs open right after the active one, like Chrome.
export function addTab(s: TabsState, tab: Tab): TabsState {
  const i = s.tabs.findIndex((t) => t.id === s.active)
  const tabs = [...s.tabs]
  tabs.splice(i + 1, 0, tab)
  return { tabs, active: tab.id }
}

// Closing the active tab activates its right neighbour, else its left one. The last tab can't close;
// the caller replaces it with a blank tab instead.
export function closeTab(s: TabsState, id: string): TabsState {
  const i = s.tabs.findIndex((t) => t.id === id)
  if (i < 0 || s.tabs.length === 1) return s
  const tabs = s.tabs.filter((t) => t.id !== id)
  const active = s.active === id ? (tabs[i] ?? tabs[i - 1]).id : s.active
  return { tabs, active }
}

export function moveTab(s: TabsState, id: string, to: number): TabsState {
  const from = s.tabs.findIndex((t) => t.id === id)
  if (from < 0) return s
  const tabs = [...s.tabs]
  const [tab] = tabs.splice(from, 1)
  tabs.splice(Math.max(0, Math.min(to, tabs.length)), 0, tab)
  return { ...s, tabs }
}

// step +1 / -1 wraps around, like Ctrl+Tab / Ctrl+Shift+Tab.
export function cycleTab(s: TabsState, step: number): TabsState {
  const i = s.tabs.findIndex((t) => t.id === s.active)
  const n = s.tabs.length
  return { ...s, active: s.tabs[(((i + step) % n) + n) % n].id }
}

// Ctrl+1..8 picks that tab, Ctrl+9 the last one.
export function pickTab(s: TabsState, digit: number): TabsState {
  const t = digit === 9 ? s.tabs[s.tabs.length - 1] : s.tabs[digit - 1]
  return t ? { ...s, active: t.id } : s
}

export function patchTab(s: TabsState, id: string, patch: Partial<Omit<Tab, "id">>): TabsState {
  return { ...s, tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
}

// Saved state comes from localStorage: keep only well-formed tabs and an active id that exists.
export function restoreTabs(raw: unknown, blank: () => Tab): TabsState {
  const r = raw as Partial<TabsState> | null
  const tabs = Array.isArray(r?.tabs)
    ? r.tabs.filter((t): t is Tab => !!t && typeof t.id === "string" && typeof t.config?.url === "string" && Array.isArray(t.config?.widths))
    : []
  if (!tabs.length) {
    const t = blank()
    return { tabs: [t], active: t.id }
  }
  const fixed = tabs.map((t) => (typeof t.session === "string" ? t : { ...t, session: "default" }))
  return { tabs: fixed, active: fixed.some((t) => t.id === r?.active) ? r!.active! : fixed[0].id }
}
