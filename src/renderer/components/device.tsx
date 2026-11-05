import { Monitor, Smartphone, Tablet } from "lucide-react"
import type { DeviceKind } from "@shared/grid"
import { cn } from "@/lib/utils"

const ICON = { phone: Smartphone, tablet: Tablet, desktop: Monitor }
export const TEXT = { phone: "text-phone", tablet: "text-tablet", desktop: "text-desktop" }

export function DeviceIcon({ kind, className }: { kind: DeviceKind; className?: string }) {
  const Icon = ICON[kind]
  return <Icon aria-hidden className={cn("size-3.5 shrink-0", TEXT[kind], className)} />
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border whitespace-nowrap bg-background px-1 font-mono text-[10px] text-muted-foreground">{children}</kbd>
}

// The app icon's three devices, for the empty state.
export function DevicesMark() {
  return (
    <svg width="112" height="56" viewBox="84 172 344 168" fill="none" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="84" y="228" width="60" height="112" rx="12" stroke="var(--phone)" />
      <rect x="166" y="188" width="100" height="152" rx="14" stroke="var(--tablet)" />
      <rect x="288" y="172" width="140" height="120" rx="14" stroke="var(--desktop)" />
      <line x1="358" y1="292" x2="358" y2="330" stroke="var(--desktop)" />
    </svg>
  )
}
