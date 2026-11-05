import assert from "node:assert/strict"
import { test } from "node:test"
import { addTab, closeTab, cycleTab, moveTab, pickTab, restoreTabs, type Tab, type TabsState } from "./tabs.ts"

const tab = (id: string): Tab => ({ id, title: id, config: { url: "", widths: [375], height: 800, emulate: true } })
const state = (ids: string[], active: string): TabsState => ({ tabs: ids.map(tab), active })
const ids = (s: TabsState) => s.tabs.map((t) => t.id).join("")

test("addTab opens after the active tab and activates it", () => {
  const s = addTab(state(["a", "b", "c"], "a"), tab("x"))
  assert.equal(ids(s), "axbc")
  assert.equal(s.active, "x")
})

test("closeTab activates the right neighbour, else the left; keeps the last tab", () => {
  assert.equal(closeTab(state(["a", "b", "c"], "b"), "b").active, "c")
  assert.equal(closeTab(state(["a", "b", "c"], "c"), "c").active, "b")
  assert.equal(closeTab(state(["a", "b", "c"], "a"), "c").active, "a")
  assert.equal(ids(closeTab(state(["a"], "a"), "a")), "a")
})

test("moveTab reorders and clamps", () => {
  assert.equal(ids(moveTab(state(["a", "b", "c"], "a"), "a", 2)), "bca")
  assert.equal(ids(moveTab(state(["a", "b", "c"], "a"), "c", -5)), "cab")
})

test("cycleTab wraps both ways; pickTab 9 is the last", () => {
  assert.equal(cycleTab(state(["a", "b", "c"], "c"), 1).active, "a")
  assert.equal(cycleTab(state(["a", "b", "c"], "a"), -1).active, "c")
  assert.equal(pickTab(state(["a", "b", "c"], "a"), 9).active, "c")
  assert.equal(pickTab(state(["a", "b", "c"], "a"), 5).active, "a")
})

test("restoreTabs drops malformed tabs and fixes a missing active id", () => {
  const s = restoreTabs({ tabs: [tab("a"), { id: 1 }, null], active: "zz" }, () => tab("new"))
  assert.equal(ids(s), "a")
  assert.equal(s.active, "a")
  assert.equal(ids(restoreTabs("garbage", () => tab("new"))), "new")
})
