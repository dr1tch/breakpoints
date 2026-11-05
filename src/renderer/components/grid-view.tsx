import { useCallback, useEffect, useRef, useState } from "react"
import type { WebviewTag } from "electron"
import { CircleCheck, TriangleAlert, X } from "lucide-react"
import { DevicesMark, Kbd } from "@/components/device"
import { Dock } from "@/components/dock"
import { Frame } from "@/components/frame"
import { Ruler } from "@/components/ruler"
import { TopBar } from "@/components/top-bar"
import { OVERFLOW_SCRIPT, type OverflowReport } from "@/lib/overflow"
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTHS,
  deviceFor,
  fitScale,
  normalizeUrl,
  onNavigated,
  parseHeight,
  startSync,
  upsertPreset,
  type Preset,
  type SyncState,
} from "@shared/grid"
import type { GridConfig as Config } from "@shared/tabs"
import { partitionFor, type Session } from "@shared/sessions"
import { SessionPicker } from "@/components/session-picker"
import { cn } from "@/lib/utils"

type Toast = { text: string; tone: "ok" | "error"; action?: { label: string; run: () => void } }

const EXAMPLE = "http://localhost:3000/v2/projects"

type Props = {
  initial: Config
  active: boolean
  presets: Preset[]
  onPresets: (presets: Preset[]) => void
  onConfig: (config: Config) => void
  onTitle: (title: string) => void
  session: Session
  sessions: Session[]
  onSession: (id: string) => void
  onCreateSession: (name: string) => void
  onDeleteSession: (id: string) => void
}

// One tab: its own URL, widths and frames. Inactive tabs stay mounted (pages keep their state)
// but are invisible and inert.
export function GridView({ initial, active, presets, onPresets, onConfig, onTitle, session, sessions, onSession, onCreateSession, onDeleteSession }: Props) {
  const [config, setConfig] = useState<Config>(initial)
  // Bumped whenever frames must remount and load fresh.
  const [generation, setGeneration] = useState(0)
  const [urlText, setUrlText] = useState(config.url)
  const [heightText, setHeightText] = useState(String(config.height))
  const [scale, setScale] = useState(0)
  const [sync, setSync] = useState(true)
  const [current, setCurrent] = useState<string[]>([])
  const [overflow, setOverflow] = useState<(OverflowReport | null | undefined)[]>([])
  const [checked, setChecked] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [busy, setBusy] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const views = useRef<(WebviewTag | null)[]>([])
  const syncRef = useRef<SyncState>(startSync(config.url, config.widths.length, Date.now()))
  const syncOn = useRef(sync)
  syncOn.current = sync

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 10000 : 5000)
    return () => clearTimeout(t)
  }, [toast])

  const fit = useCallback(() => {
    // 24 = main's padding; 12 more so a vertical scrollbar appearing doesn't wrap the row.
    const available = (gridRef.current?.clientWidth ?? window.innerWidth) - 36
    setScale(fitScale(available, config.widths))
  }, [config.widths])

  useEffect(() => {
    if (!scale) fit()
  }, [scale, fit])

  const apply = (next: Config) => {
    setConfig(next)
    onConfig(next)
    setUrlText(next.url)
    setHeightText(String(next.height))
    views.current = []
    syncRef.current = startSync(next.url, next.widths.length, Date.now())
    setCurrent([])
    setOverflow([])
    setChecked(false)
    setGeneration((g) => g + 1)
  }

  const error = (text: string) => setToast({ text, tone: "error" })

  const go = (text = urlText) => {
    const url = normalizeUrl(text)
    const height = parseHeight(heightText)
    if (!url) return error("Enter an http(s) URL, e.g. localhost:3000/v2/projects.")
    if (!height) return error("Height: a whole number from 300 to 2400.")
    apply({ ...config, url, height })
  }

  const setWidths = (widths: number[]) => {
    apply({ ...config, widths })
    setScale(0)
  }

  const onReady = useCallback((i: number, wv: WebviewTag) => {
    views.current[i] = wv
  }, [])

  const onNavigate = useCallback((i: number, url: string) => {
    const r = onNavigated(syncRef.current, i, url, Date.now(), syncOn.current)
    syncRef.current = r.state
    setCurrent((c) => Object.assign([...c], { [i]: url }))
    setOverflow((o) => Object.assign([...o], { [i]: undefined }))
    if (r.targets.length) {
      setUrlText(url)
      for (const t of r.targets) views.current[t]?.loadURL(url).catch(() => {})
    }
  }, [])

  const reloadAll = () => {
    views.current.forEach((wv, i) => setTimeout(() => wv?.reload(), i * 1500))
    setOverflow([])
    setChecked(false)
  }

  const checkOverflow = async () => {
    if (!config.url) return
    setBusy(true)
    const results = await Promise.all(
      config.widths.map((_, i) =>
        views.current[i] ? (views.current[i]!.executeJavaScript(OVERFLOW_SCRIPT) as Promise<OverflowReport>).catch(() => null) : Promise.resolve(null),
      ),
    )
    setOverflow(results)
    setChecked(true)
    setBusy(false)
  }

  const screenshot = async () => {
    if (!config.url) return
    setBusy(true)
    try {
      const frames = config.widths
        .map((width, i) => ({ wv: views.current[i], width, label: deviceFor(width, config.emulate).label }))
        .filter((f) => f.wv)
        .map((f) => ({ id: f.wv!.getWebContentsId(), width: f.width, label: f.label }))
      const dir = await window.api.screenshot(frames)
      setToast({ text: `Saved ${frames.length} screenshots · ${dir.replace(/^\/home\/[^/]+/, "~")}`, tone: "ok", action: { label: "Open folder", run: () => window.api.openScreenshots() } })
    } catch (e) {
      error(`Screenshots failed: ${(e as Error).message}`)
    }
    setBusy(false)
  }

  const savePreset = (name: string) => {
    onPresets(upsertPreset(presets, { name, url: config.url, widths: config.widths, height: config.height }))
    setToast({ text: `Saved preset "${name}".`, tone: "ok" })
  }

  const deletePreset = (name: string) => {
    onPresets(presets.filter((p) => p.name !== name))
  }

  // Shortcuts work while focus is in the app's own controls; a focused frame keeps its keys.
  const keys = useRef({ fit, reloadAll, checkOverflow, screenshot, active })
  keys.current = { fit, reloadAll, checkOverflow, screenshot, active }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current
      if (!k.active || !e.ctrlKey || e.altKey) return
      const map: Record<string, () => void> = e.shiftKey
        ? { KeyO: k.checkOverflow, KeyS: k.screenshot }
        : { KeyL: () => urlRef.current?.select(), KeyR: k.reloadAll, Digit0: k.fit }
      const run = map[e.code]
      if (!run) return
      e.preventDefault()
      run()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const bad = overflow.filter((r) => r && (r.page || r.items.length)).length

  return (
    <div role="tabpanel" inert={!active} className={cn("absolute inset-0 flex flex-col", !active && "invisible")}>
      <TopBar
        url={urlText}
        height={heightText}
        onUrl={setUrlText}
        onHeight={setHeightText}
        onGo={() => go()}
        urlRef={urlRef}
        start={<SessionPicker current={session} sessions={sessions} onSelect={onSession} onCreate={onCreateSession} onDelete={onDeleteSession} />}
      />
      <Ruler widths={config.widths} onChange={setWidths} onError={error} />
      <main ref={gridRef} className="flex-1 overflow-auto p-3 pb-24">
        {!config.url ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <DevicesMark />
            <h1 className="text-base font-semibold">Enter a URL to start</h1>
            <p className="max-w-xs text-xs text-muted-foreground">
              Your page loads at every width side by side. Press <Kbd>Ctrl L</Kbd> to jump to the address bar.
            </p>
            <button type="button" className="rounded-md border px-3 py-1.5 font-mono text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" onClick={() => go(EXAMPLE)}>
              {EXAMPLE.replace("http://", "")}
            </button>
          </div>
        ) : (
          <>
            {checked && (
              <p role="status" className="mb-2 flex items-center gap-2 text-xs">
                <span className="font-semibold tracking-wider text-muted-foreground uppercase">Overflow</span>
                {bad ? (
                  <span className="text-danger">
                    {bad} of {overflow.length} frames have overflow
                  </span>
                ) : (
                  <span className="text-success">No overflow in any frame</span>
                )}
                <span className="text-muted-foreground">· checked just now</span>
              </p>
            )}
            <div className="flex flex-wrap content-start items-start gap-4">
              {scale > 0 &&
                config.widths.map((w, i) => (
                  <Frame
                    key={`${generation}-${session.id}-${i}-${w}`}
                    index={i}
                    url={config.url}
                    partition={partitionFor(session.id)}
                    width={w}
                    height={config.height}
                    scale={scale}
                    device={deviceFor(w, config.emulate)}
                    current={current[i] ?? ""}
                    overflow={checked ? overflow[i] : undefined}
                    onReady={onReady}
                    onNavigate={onNavigate}
                    onTitle={i === 0 ? onTitle : undefined}
                  />
                ))}
            </div>
          </>
        )}
      </main>
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className="fixed bottom-20 left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl"
        >
          {toast.tone === "ok" ? <CircleCheck aria-hidden className="size-4 shrink-0 text-success" /> : <TriangleAlert aria-hidden className="size-4 shrink-0 text-danger" />}
          <span className="truncate">{toast.text}</span>
          {toast.action && (
            <button type="button" className="shrink-0 text-link underline-offset-2 hover:underline" onClick={toast.action.run}>
              {toast.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setToast(null)}>
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <Dock
        sync={sync}
        emulate={config.emulate}
        scale={scale || 0.5}
        busy={busy}
        presets={presets}
        onSync={setSync}
        onEmulate={(v) => apply({ ...config, emulate: v })}
        onScale={setScale}
        onFit={fit}
        onReload={reloadAll}
        onOverflow={checkOverflow}
        onScreenshots={screenshot}
        onApplyPreset={(p) => {
          apply({ ...config, url: p.url, widths: p.widths, height: p.height })
          setScale(0)
        }}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
      />
    </div>
  )
}

