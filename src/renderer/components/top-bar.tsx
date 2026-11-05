import type { ReactNode, Ref } from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/device"

type Props = {
  url: string
  height: string
  onUrl: (v: string) => void
  onHeight: (v: string) => void
  onGo: () => void
  urlRef: Ref<HTMLInputElement>
  // Shown before the address bar (the session picker).
  start?: ReactNode
}

export function TopBar({ url, height, onUrl, onHeight, onGo, urlRef, start }: Props) {
  return (
    <form
      className="flex items-center justify-center gap-2 px-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        onGo()
      }}
    >
      {start}
      <label className="flex h-8 w-full max-w-2xl items-center gap-2 rounded-lg border bg-muted px-2.5 focus-within:border-ring">
        <Globe aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={urlRef}
          aria-label="Page URL (Ctrl+L)"
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-muted-foreground"
          placeholder="http://localhost:3000/..."
          value={url}
          onChange={(e) => onUrl(e.target.value)}
        />
        <Kbd>Enter</Kbd>
      </label>
      <label className="flex h-8 items-center gap-1.5 rounded-lg border bg-muted px-2.5 text-xs text-muted-foreground focus-within:border-ring">
        Height
        <input aria-label="Frame height" className="w-11 bg-transparent font-mono text-[13px] text-foreground outline-none" value={height} onChange={(e) => onHeight(e.target.value)} />
      </label>
      <Button type="submit">Go</Button>
    </form>
  )
}
