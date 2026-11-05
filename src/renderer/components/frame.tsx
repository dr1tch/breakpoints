import { useEffect, useRef, useState } from "react"
import type { WebviewTag } from "electron"
import { Popover } from "@base-ui/react/popover"
import { Check, Code, ExternalLink, LoaderCircle, RotateCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeviceIcon } from "@/components/device"
import type { OverflowReport } from "@/lib/overflow"
import { kindOf, type Device } from "@shared/grid"
import { cn } from "@/lib/utils"

// Loads are staggered so frames sharing one session do not race its refresh on load.
const STAGGER_MS = 1500
// Below this on-screen width the overflow details move into a popover.
const NARROW_PX = 150

type Status = { kind: "queued" } | { kind: "loading" } | { kind: "ready" } | { kind: "error"; text: string }

type Props = {
  index: number
  url: string
  width: number
  height: number
  scale: number
  device: Device
  current: string
  overflow: OverflowReport | null | undefined
  onReady: (index: number, wv: WebviewTag) => void
  onNavigate: (index: number, url: string) => void
  // Only the first frame names the tab.
  onTitle?: (title: string) => void
}

export function Frame({ index, url, width, height, scale, device, current, overflow, onReady, onNavigate, onTitle }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const wvRef = useRef<WebviewTag | null>(null)
  const idRef = useRef<number | null>(null)
  const [status, setStatus] = useState<Status>({ kind: "queued" })
  const emu = { width, height, scale, device }
  const emuRef = useRef(emu)
  emuRef.current = emu

  // One webview per mount; the parent remounts (new key) when url, widths, height or device change.
  useEffect(() => {
    const wv = document.createElement("webview") as WebviewTag
    wv.setAttribute("partition", "persist:grid")
    wv.setAttribute("src", "about:blank")
    wv.style.display = "flex"
    host.current!.appendChild(wv)
    wvRef.current = wv
    let started = false
    let timer: ReturnType<typeof setTimeout> | undefined
    // Emulation goes on before the real page loads, so the server sees the mobile user agent too.
    wv.addEventListener("dom-ready", async () => {
      if (started) return
      started = true
      idRef.current = wv.getWebContentsId()
      try {
        await window.api.emulate(idRef.current, emuRef.current)
      } catch (e) {
        console.warn("emulation failed", e)
      }
      timer = setTimeout(() => wv.loadURL(url).catch(() => {}), index * STAGGER_MS)
      onReady(index, wv)
    })
    wv.addEventListener("did-start-loading", () => started && setStatus({ kind: "loading" }))
    wv.addEventListener("did-stop-loading", () => started && setStatus((s) => (s.kind === "error" ? s : { kind: "ready" })))
    wv.addEventListener("did-fail-load", (e) => {
      // -3 is an aborted load, e.g. a redirect replacing it: not an error.
      if (!e.isMainFrame || e.errorCode === -3) return
      setStatus({ kind: "error", text: e.errorDescription.replace(/^ERR_/, "").replace(/_/g, " ").toLowerCase() })
    })
    const nav = (e: Electron.DidNavigateEvent | Electron.DidNavigateInPageEvent) => {
      if ("isMainFrame" in e && !e.isMainFrame) return
      onNavigate(index, e.url)
    }
    if (onTitle) wv.addEventListener("page-title-updated", (e) => started && onTitle(e.title))
    wv.addEventListener("did-navigate", nav)
    wv.addEventListener("did-navigate-in-page", nav)
    return () => {
      clearTimeout(timer)
      wv.remove()
      wvRef.current = null
      idRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scale changes re-emulate in place instead of reloading the page.
  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return
    wv.style.width = `${Math.round(width * scale)}px`
    wv.style.height = `${Math.round(height * scale)}px`
    if (idRef.current !== null) window.api.emulate(idRef.current, emuRef.current).catch(() => {})
  }, [scale, width, height])

  const shown = current.startsWith("http") ? current : url
  const kind = kindOf(width)
  const px = Math.round(width * scale)
  const narrow = px < NARROW_PX
  const bad = !!overflow && (overflow.page > 0 || overflow.items.length > 0)

  return (
    <section aria-label={`${width}px frame`} className="flex flex-col gap-1.5" style={{ width: px }}>
      <header className="flex min-w-0 items-center gap-1.5 text-xs">
        <DeviceIcon kind={kind} />
        <strong className="shrink-0 font-mono tabular-nums">{width}</strong>
        {!narrow && <span className="shrink-0 text-muted-foreground">{kind}</span>}
        {status.kind === "loading" && <LoaderCircle aria-label="Loading" className="size-3 shrink-0 animate-spin text-muted-foreground" />}
        {status.kind === "queued" && <span className="shrink-0 text-muted-foreground">queued</span>}
        {!narrow && (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={shown}>
            {new URL(shown).pathname + new URL(shown).search}
          </span>
        )}
        <span className="ml-auto flex shrink-0">
          {!narrow && (
            <Button size="icon-xs" variant="ghost" title="Open in your browser" aria-label="Open in browser" onClick={() => window.api.openExternal(shown)}>
              <ExternalLink />
            </Button>
          )}
          <Button size="icon-xs" variant="ghost" title="DevTools for this frame" aria-label="DevTools" onClick={() => idRef.current !== null && window.api.devtools(idRef.current)}>
            <Code />
          </Button>
        </span>
      </header>
      <div
        ref={host}
        className={cn("relative overflow-hidden rounded-md border bg-white", bad && "border-danger ring-1 ring-danger")}
        style={{ width: px, height: Math.round(height * scale) }}
      >
        {status.kind === "error" && (
          <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted p-3 text-center text-xs">
            <TriangleAlert aria-hidden className="size-5 text-attention" />
            <p>
              The server isn&apos;t answering
              <span className="block text-muted-foreground">{status.text}</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus({ kind: "loading" })
                wvRef.current?.loadURL(shown).catch(() => {})
              }}
            >
              <RotateCw /> Retry
            </Button>
          </div>
        )}
      </div>
      {overflow !== undefined && <Result report={overflow} narrow={narrow} width={width} />}
    </section>
  )
}

function Result({ report, narrow, width }: { report: OverflowReport | null; narrow: boolean; width: number }) {
  const line = "border-t-2 pt-1.5 text-xs"
  if (report === null) return <p className={cn(line, "border-attention text-attention")}>Check failed</p>
  if (!report.page && !report.items.length)
    return (
      <p className={cn(line, "flex items-center gap-1 border-border text-muted-foreground")}>
        <Check aria-hidden className="size-3.5 text-success" /> No overflow
      </p>
    )
  const headline = (
    <span className="flex items-center gap-1 font-mono text-sm font-semibold text-danger">
      <TriangleAlert aria-hidden className="size-3.5" />
      {report.page ? `${report.page}px` : `${report.items.length} cut`}
    </span>
  )
  const details = (
    <>
      <p className="text-muted-foreground">{report.page ? "Scrolls sideways." : "No sideways scroll."} Cut off:</p>
      <ul className="mt-1 flex flex-col gap-0.5 font-mono text-[11px]">
        {report.items.map((it, i) => (
          <li key={i} className="truncate" title={it.selector}>
            {it.selector} <span className="text-danger">{it.by}px</span>
          </li>
        ))}
      </ul>
    </>
  )
  if (narrow)
    return (
      <div className={cn(line, "border-danger")}>
        <Popover.Root>
          <Popover.Trigger className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Overflow details for ${width}px`}>
            {headline}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
              <Popover.Popup className="w-64 rounded-lg border bg-popover p-3 text-xs shadow-xl">
                <p className="mb-1 font-semibold">{width}px</p>
                {details}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    )
  return (
    <div className={cn(line, "border-danger")}>
      {headline}
      <div className="max-h-32 overflow-auto">{details}</div>
    </div>
  )
}
