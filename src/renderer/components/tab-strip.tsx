import { useState } from "react"
import { Globe, Plus, X } from "lucide-react"
import type { Tab } from "@shared/tabs"
import { cn } from "@/lib/utils"

type Props = {
  tabs: Tab[]
  active: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  onMove: (id: string, to: number) => void
}

export function tabLabel(t: Tab): string {
  if (t.title) return t.title
  if (!t.config.url) return "New tab"
  try {
    const u = new URL(t.config.url)
    return u.host + (u.pathname === "/" ? "" : u.pathname)
  } catch {
    return t.config.url
  }
}

// Chrome-style strip: click to switch, middle-click or ✕ to close, drag to reorder,
// double-click the empty area for a new tab.
export function TabStrip({ tabs, active, onSelect, onClose, onNew, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  // Where the dragged tab would land: index of the gap, 0 = before the first tab.
  const [dropAt, setDropAt] = useState<number | null>(null)

  const over = (e: React.DragEvent, i: number) => {
    if (!dragId) return
    e.preventDefault()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDropAt(e.clientX < r.left + r.width / 2 ? i : i + 1)
  }
  const drop = () => {
    if (dragId && dropAt !== null) {
      const from = tabs.findIndex((t) => t.id === dragId)
      // Removing the tab first shifts later gaps one to the left.
      onMove(dragId, dropAt > from ? dropAt - 1 : dropAt)
    }
    setDragId(null)
    setDropAt(null)
  }

  return (
    <div className="flex h-9 shrink-0 items-end bg-inset pt-1.5 pl-2" onDoubleClick={(e) => e.target === e.currentTarget && onNew()}>
      <div role="tablist" aria-label="Tabs" className="flex min-w-0 items-end" onDragOver={(e) => dragId && e.preventDefault()} onDrop={drop}>
        {tabs.map((t, i) => {
          const on = t.id === active
          const label = tabLabel(t)
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              title={label}
              draggable
              onDragStart={(e) => {
                setDragId(t.id)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragEnd={() => {
                setDragId(null)
                setDropAt(null)
              }}
              onDragOver={(e) => over(e, i)}
              onMouseDown={(e) => e.button === 0 && onSelect(t.id)}
              onAuxClick={(e) => e.button === 1 && onClose(t.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]
                  onSelect(next.id)
                  e.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=tab]")[tabs.indexOf(next)]?.focus()
                }
                if (e.key === "Delete") onClose(t.id)
              }}
              className={cn(
                "group relative flex h-[30px] w-56 min-w-16 shrink cursor-default items-center gap-2 rounded-t-lg px-3 text-xs outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                on ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/70",
                dragId === t.id && "opacity-50",
                dropAt === i && "shadow-[inset_2px_0_0_var(--ring)]",
                dropAt === i + 1 && i === tabs.length - 1 && "shadow-[inset_-2px_0_0_var(--ring)]",
              )}
            >
              {/* Separator between two inactive tabs, like Chrome. */}
              {!on && i > 0 && tabs[i - 1].id !== active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-px bg-border" />}
              <Globe aria-hidden className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <button
                type="button"
                aria-label={`Close ${label}`}
                tabIndex={-1}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onClose(t.id)}
                className={cn("shrink-0 rounded-full p-0.5 hover:bg-accent hover:text-foreground", on ? "visible" : "invisible group-hover:visible")}
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" aria-label="New tab (Ctrl+T)" title="New tab (Ctrl+T)" onClick={onNew} className="mb-1 ml-1 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none">
        <Plus className="size-4" />
      </button>
    </div>
  )
}
