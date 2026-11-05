import { contextBridge, ipcRenderer } from "electron"
import type { Emulation } from "@shared/grid"

// ipcRenderer.invoke wraps errors as "Error invoking remote method 'x': Error: msg"; keep just msg.
const call = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args).catch((e: Error) => {
    throw new Error(e.message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, ""))
  })

const api = {
  emulate: (id: number, e: Emulation) => call<void>("frame:emulate", id, e),
  devtools: (id: number) => call<void>("frame:devtools", id),
  screenshot: (frames: { id: number; width: number; label: string }[]) => call<string>("frames:screenshot", frames),
  openScreenshots: () => call<void>("screenshots:open"),
  openExternal: (url: string) => call<void>("open:external", url),
}

export type Api = typeof api

contextBridge.exposeInMainWorld("api", api)
