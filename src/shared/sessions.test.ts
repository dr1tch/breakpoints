import assert from "node:assert/strict"
import { test } from "node:test"
import { createSession, DEFAULT_SESSION, isSessionPartition, partitionFor, restoreSessions } from "./sessions.ts"

test("Default keeps the pre-session partition", () => {
  assert.equal(partitionFor("default"), "persist:grid")
  assert.equal(partitionFor("ab12"), "persist:s-ab12")
})

test("only session partitions are allowed", () => {
  assert.ok(isSessionPartition("persist:grid"))
  assert.ok(isSessionPartition("persist:s-9f2c-11"))
  assert.ok(!isSessionPartition("persist:s-../x"))
  assert.ok(!isSessionPartition("other"))
})

test("createSession picks an unused color and a fallback name", () => {
  const a = createSession([DEFAULT_SESSION], "Admin", "a")
  const b = createSession(a, "  ", "b")
  assert.notEqual(a[1].color, b[2].color)
  assert.equal(b[2].name, "Session 3")
})

test("restoreSessions always starts with Default and drops bad entries", () => {
  const list = restoreSessions([{ id: "x", name: "X", color: "#fff" }, { id: "x", name: "dup", color: "#fff" }, { id: "../bad", name: "B", color: "#fff" }, { id: "default", name: "fake", color: "#000" }, null])
  assert.deepEqual(list.map((s) => s.id), ["default", "x"])
  assert.equal(list[0].name, "Default")
  assert.deepEqual(restoreSessions("junk"), [DEFAULT_SESSION])
})
