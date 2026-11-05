import { useState } from "react"
import { Plus, X } from "lucide-react"
import { isCustom, parseWidths, RULER, toggleWidth } from "@shared/grid"
import { cn } from "@/lib/utils"
import { DeviceIcon, TEXT } from "@/components/device"

const NAMES = { phone: "Phone", tablet: "Tablet", desktop: "Desktop" }

type Props = { widths: number[]; onChange: (widths: number[]) => void; onError: (text: string) => void }

// Common breakpoints grouped by device, one click to add or remove a frame.
export function Ruler({ widths, onChange, onError }: Props) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState("")
  const custom = widths.filter(isCustom)

  const add = () => {
    const parsed = parseWidths(text)
    if (!parsed.length) return onError("Custom width: a whole number from 200 to 3840.")
    onChange(parsed.reduce((list, w) => (list.includes(w) ? list : toggleWidth(list, w)), widths))
    setText("")
    setAdding(false)
  }

  return (
    <nav aria-label="Widths" className="flex flex-wrap items-end justify-center gap-x-6 gap-y-2 border-b px-3 pt-2 pb-2.5">
      {RULER.map((g) => (
        <div key={g.kind} className="flex flex-col gap-1">
          <span className={cn("flex items-center gap-1 border-b border-current pb-0.5 text-[10px] font-semibold tracking-wider uppercase", TEXT[g.kind])}>
            <DeviceIcon kind={g.kind} className="size-3" />
            {NAMES[g.kind]}
          </span>
          <div className="flex gap-1">
            {g.widths.map((w) => (
              <Chip key={w} on={widths.includes(w)} onClick={() => onChange(toggleWidth(widths, w))}>
                {w}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <span className="border-b border-current pb-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Custom</span>
        <div className="flex gap-1">
          {custom.map((w) => (
            <Chip key={w} on onClick={() => onChange(toggleWidth(widths, w))} title={`Remove ${w}px`}>
              {w}
              <X aria-hidden className="size-3" />
            </Chip>
          ))}
          {adding ? (
            <input
              autoFocus
              aria-label="Custom width in px"
              className="h-6 w-20 rounded-md border bg-muted px-1.5 font-mono text-xs outline-none focus:border-ring"
              placeholder="1600"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add()
                if (e.key === "Escape") setAdding(false)
              }}
              onBlur={() => (text ? add() : setAdding(false))}
            />
          ) : (
            <Chip on={false} onClick={() => setAdding(true)}>
              <Plus aria-hidden className="size-3" /> Add
            </Chip>
          )}
        </div>
      </div>
    </nav>
  )
}

function Chip({ on, children, ...props }: { on: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 font-mono text-xs tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "bg-foreground font-semibold text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      {...props}
    >
      {children}
    </button>
  )
}
