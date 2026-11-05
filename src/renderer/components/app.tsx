import { useCallback, useEffect, useRef, useState } from "react"
import { GridView } from "@/components/grid-view"
import { TabStrip, tabLabel } from "@/components/tab-strip"
import { DEFAULT_HEIGHT, DEFAULT_WIDTHS, type Preset } from "@shared/grid"
import { addTab, closeTab, cycleTab, moveTab, patchTab, pickTab, restoreTabs, type GridConfig, type Tab, type TabsState } from "@shared/tabs"

const TABS_KEY = "breakpoints:tabs"
const PRESETS_KEY = "breakpoints:presets"
// Before tabs, the app saved one grid here; it becomes the first tab.
const LEGACY_KEY = "breakpoints:last"

function load(key: string): unknown {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked: the app still works, it just won't remember
  }
}

const DEFAULT: GridConfig = { url: "", widths: DEFAULT_WIDTHS, height: DEFAULT_HEIGHT, emulate: true }
const newTab = (from?: GridConfig): Tab => ({ id: crypto.randomUUID(), title: "", config: { ...DEFAULT, ...(from && { widths: from.widths, height: from.height, emulate: from.emulate }), url: "" } })

function initialTabs(): TabsState {
  const saved = load(TABS_KEY)
  if (saved) return restoreTabs(saved, newTab)
  const legacy = load(LEGACY_KEY) as Partial<GridConfig> | null
  return restoreTabs(null, () => ({ ...newTab(), config: { ...DEFAULT, ...legacy } }))
}

export function App() {
  const [state, setState] = useState<TabsState>(initialTabs)
  const [presets, setPresets] = useState<Preset[]>(() => (load(PRESETS_KEY) as Preset[] | null) ?? [])

  useEffect(() => save(TABS_KEY, state), [state])
  useEffect(() => save(PRESETS_KEY, presets), [presets])

  const activeTab = state.tabs.find((t) => t.id === state.active)!
  useEffect(() => {
    document.title = `${tabLabel(activeTab)} – Breakpoints`
  }, [activeTab])

  const open = useCallback(() => setState((s) => addTab(s, newTab(s.tabs.find((t) => t.id === s.active)?.config))), [])
  // Closing the last tab leaves a blank one instead of an empty window.
  const close = useCallback(
    (id: string) =>
      setState((s) => {
        if (s.tabs.length > 1) return closeTab(s, id)
        const t = newTab(s.tabs[0].config)
        return { tabs: [t], active: t.id }
      }),
    [],
  )
  const onConfig = useCallback((id: string, config: GridConfig) => setState((s) => patchTab(s, id, { config, title: "" })), [])
  const onTitle = useCallback((id: string, title: string) => setState((s) => patchTab(s, id, { title })), [])

  const keys = useRef({ open, close, active: state.active })
  keys.current = { open, close, active: state.active }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey) return
      const k = keys.current
      let run: (() => void) | null = null
      if (e.code === "KeyT" && !e.shiftKey) run = k.open
      else if (e.code === "KeyW" && !e.shiftKey) run = () => k.close(k.active)
      else if (e.code === "Tab") run = () => setState((s) => cycleTab(s, e.shiftKey ? -1 : 1))
      else if (e.code === "PageDown" || e.code === "PageUp") run = () => setState((s) => cycleTab(s, e.code === "PageDown" ? 1 : -1))
      else if (/^Digit[1-9]$/.test(e.code) && !e.shiftKey) run = () => setState((s) => pickTab(s, Number(e.code.slice(5))))
      if (!run) return
      e.preventDefault()
      run()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TabStrip
        tabs={state.tabs}
        active={state.active}
        onSelect={(id) => setState((s) => ({ ...s, active: id }))}
        onClose={close}
        onNew={open}
        onMove={(id, to) => setState((s) => moveTab(s, id, to))}
      />
      <div className="relative flex-1">
        {state.tabs.map((t) => (
          <GridView
            key={t.id}
            initial={t.config}
            active={t.id === state.active}
            presets={presets}
            onPresets={setPresets}
            onConfig={(c) => onConfig(t.id, c)}
            onTitle={(title) => onTitle(t.id, title)}
          />
        ))}
      </div>
    </div>
  )
}
