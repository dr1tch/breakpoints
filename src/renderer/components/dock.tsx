import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { Bookmark, Camera, ChevronUp, Maximize, Minus, MoveHorizontal, Plus, RotateCw, Trash2 } from "lucide-react"
import type { Preset } from "@shared/grid"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/device"

type Props = {
  sync: boolean
  emulate: boolean
  scale: number
  busy: boolean
  presets: Preset[]
  onSync: (v: boolean) => void
  onEmulate: (v: boolean) => void
  onScale: (v: number) => void
  onFit: () => void
  onReload: () => void
  onOverflow: () => void
  onScreenshots: () => void
  onApplyPreset: (p: Preset) => void
  onSavePreset: (name: string) => void
  onDeletePreset: (name: string) => void
}

const clamp = (v: number) => Math.min(1, Math.max(0.15, Math.round(v * 100) / 100))

// Floating controls at the bottom, so the frames get the whole width of the window.
export function Dock(p: Props) {
  return (
    <div role="toolbar" aria-label="Controls" className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-popover/95 p-2.5 shadow-2xl backdrop-blur">
      <Toggle on={p.sync} onClick={() => p.onSync(!p.sync)} title="Clicking a link in one frame loads that page in all frames">
        Sync
      </Toggle>
      <Toggle on={p.emulate} onClick={() => p.onEmulate(!p.emulate)} title="Phone and tablet frames get a mobile user agent, touch and a high pixel ratio">
        Emulate
      </Toggle>
      <Sep />
      <DockButton aria-label="Zoom out" onClick={() => p.onScale(clamp(p.scale - 0.05))}>
        <Minus />
      </DockButton>
      <input type="range" aria-label="Scale" min={0.15} max={1} step={0.01} value={p.scale} onChange={(e) => p.onScale(Number(e.target.value))} className="w-24 accent-foreground" />
      <span className="w-9 text-center font-mono text-xs tabular-nums">{Math.round(p.scale * 100)}%</span>
      <DockButton aria-label="Zoom in" onClick={() => p.onScale(clamp(p.scale + 0.05))}>
        <Plus />
      </DockButton>
      <DockButton onClick={p.onFit} title="Fit all frames in the window">
        <Maximize /> Fit <Kbd>Ctrl 0</Kbd>
      </DockButton>
      <Sep />
      <DockButton onClick={p.onReload}>
        <RotateCw /> Reload <Kbd>Ctrl R</Kbd>
      </DockButton>
      <DockButton onClick={p.onOverflow} disabled={p.busy} className="border-ring text-foreground">
        <MoveHorizontal /> Overflow <Kbd>Ctrl ⇧ O</Kbd>
      </DockButton>
      <DockButton onClick={p.onScreenshots} disabled={p.busy}>
        <Camera /> Screenshots <Kbd>Ctrl ⇧ S</Kbd>
      </DockButton>
      <Sep />
      <Presets {...p} />
    </div>
  )
}

function Presets({ presets, onApplyPreset, onSavePreset, onDeletePreset }: Props) {
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)
  const save = () => {
    if (!name.trim()) return
    onSavePreset(name.trim())
    setName("")
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <Bookmark className="size-3.5" /> Presets <ChevronUp className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="end" sideOffset={10} className="z-50">
          <Popover.Popup className="w-72 rounded-lg border bg-popover p-2 text-xs shadow-xl">
            {presets.length === 0 && <p className="px-2 py-1.5 text-muted-foreground">No presets yet. Save the current URL, widths and height below.</p>}
            <ul className="flex flex-col">
              {presets.map((pr) => (
                <li key={pr.name} className="group flex items-center rounded-md hover:bg-accent">
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      onApplyPreset(pr)
                      setOpen(false)
                    }}
                  >
                    <span className="block truncate font-medium">{pr.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{pr.widths.join(" · ")}</span>
                  </button>
                  <button type="button" aria-label={`Delete preset ${pr.name}`} className="mr-1 rounded p-1 text-muted-foreground hover:text-danger focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onDeletePreset(pr.name)}>
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1 border-t pt-2">
              <input
                aria-label="New preset name"
                placeholder="Save current as…"
                className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 outline-none focus:border-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <button type="button" onClick={save} disabled={!name.trim()} className="h-7 rounded-md bg-primary px-2.5 font-medium text-primary-foreground disabled:opacity-50">
                Save
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Toggle({ on, children, ...props }: { on: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-2 rounded-full border", on ? "border-success bg-success" : "border-muted-foreground")} />
      {children}
    </button>
  )
}

function DockButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />
}
