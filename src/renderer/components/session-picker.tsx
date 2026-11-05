import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { Check, ChevronDown, Trash2, UserRound } from "lucide-react"
import { DEFAULT_SESSION, type Session } from "@shared/sessions"
import { cn } from "@/lib/utils"

type Props = {
  current: Session
  sessions: Session[]
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
}

// Picks which browser session (cookies, storage, sign-in) this tab's frames use.
export function SessionPicker({ current, sessions, onSelect, onCreate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  // Deleting signs the session out, so it takes a second click.
  const [confirm, setConfirm] = useState<string | null>(null)

  const create = () => {
    onCreate(name)
    setName("")
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setConfirm(null)
      }}
    >
      <Popover.Trigger
        aria-label={`Session: ${current.name}`}
        title="Which browser session (sign-in, cookies) this tab uses"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-muted px-2.5 text-xs outline-none hover:bg-accent focus-visible:border-ring"
      >
        <span aria-hidden className="size-2 rounded-full" style={{ background: current.color }} />
        <span className="max-w-28 truncate">{current.name}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-72 rounded-lg border bg-popover p-2 text-xs shadow-xl">
            <p className="px-2 pb-1.5 text-muted-foreground">Each session has its own sign-in. Tabs on the same session share it.</p>
            <ul className="flex flex-col">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center rounded-md hover:bg-accent">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      onSelect(s.id)
                      setOpen(false)
                    }}
                  >
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {s.id === current.id && <Check aria-label="current" className="size-3.5 text-success" />}
                  </button>
                  {s.id !== DEFAULT_SESSION.id &&
                    (confirm === s.id ? (
                      <button type="button" className="mr-1 rounded bg-destructive/20 px-1.5 py-0.5 text-danger hover:bg-destructive/30" onClick={() => onDelete(s.id)}>
                        Sign out & delete
                      </button>
                    ) : (
                      <button type="button" aria-label={`Delete session ${s.name}`} className="mr-1 rounded p-1 text-muted-foreground hover:text-danger" onClick={() => setConfirm(s.id)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    ))}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1 border-t pt-2">
              <span className="relative min-w-0 flex-1">
                <UserRound aria-hidden className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  aria-label="New session name"
                  placeholder="New session, e.g. Admin"
                  className="h-7 w-full rounded-md border bg-background pr-2 pl-7 outline-none focus:border-ring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                />
              </span>
              <button type="button" onClick={create} className={cn("h-7 rounded-md bg-primary px-2.5 font-medium text-primary-foreground")}>
                Create
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
