import assert from "node:assert/strict"
import { test } from "node:test"
import { deviceFor, isCustom, kindOf, toggleWidth, fitScale, normalizeUrl, onNavigated, parseHeight, parseWidths, samePage, startSync, upsertPreset } from "./grid.ts"

test("parseWidths keeps sane integers only", () => {
  assert.deepEqual(parseWidths("375, 768 1024,abc, 50, 5000"), [375, 768, 1024])
})

test("parseHeight rejects out of range", () => {
  assert.equal(parseHeight("800"), 800)
  assert.equal(parseHeight("100"), null)
  assert.equal(parseHeight("x"), null)
})

test("normalizeUrl adds http and refuses other schemes", () => {
  assert.equal(normalizeUrl("localhost:3000/v2"), "http://localhost:3000/v2")
  assert.equal(normalizeUrl("https://a.test/x?y=1"), "https://a.test/x?y=1")
  assert.equal(normalizeUrl("file:///etc/passwd"), null)
  assert.equal(normalizeUrl(""), null)
})

test("fitScale: one row when wide enough, else two columns", () => {
  assert.equal(fitScale(10000, [375, 768]), 1)
  const s = fitScale(1400, [375, 768, 1024, 1280, 1920])
  assert.equal(s, (1400 - 16) / 3840) // below 25 % in one row, so two columns
  // scaled frames plus fixed gaps fill the row exactly
  const w = [375, 768, 1280]
  const k = fitScale(1576, w)
  assert.ok(Math.abs(w.reduce((a, b) => a + b * k, 0) + 32 - 1576) < 1e-9)
  assert.equal(fitScale(1000, [1920, 1920, 1920, 1920, 1920]), (1000 - 16) / 3840)
})

test("deviceFor picks phone / tablet / desktop", () => {
  assert.equal(deviceFor(375, true).label, "phone")
  assert.equal(deviceFor(768, true).label, "tablet")
  assert.equal(deviceFor(1280, true).label, "desktop")
  assert.equal(deviceFor(375, false).mobile, false)
})

test("samePage ignores query and hash", () => {
  assert.ok(samePage("http://a/x?q=1", "http://a/x#h"))
  assert.ok(!samePage("http://a/x", "http://a/y"))
})

test("sync: initial loads and redirects are not copied, user clicks are", () => {
  let s = startSync("http://a/home", 3, 0)
  // frame 0 still on blank while loading: ignored
  let r = onNavigated(s, 0, "about:blank", 100, true)
  assert.deepEqual(r.targets, [])
  // frame 0 lands: expectation cleared, nothing copied
  r = onNavigated(r.state, 0, "http://a/home", 200, true)
  s = r.state
  assert.equal(s.expected[0], null)
  // user clicks in frame 0 while frames 1,2 still loading: copied to 1 and 2
  r = onNavigated(s, 0, "http://a/other", 300, true)
  assert.deepEqual(r.targets, [1, 2])
  assert.equal(r.state.url, "http://a/other")
  // frame 1 arriving at the copied page is not re-copied
  r = onNavigated(r.state, 1, "http://a/other", 400, true)
  assert.deepEqual(r.targets, [])
  // query-only change stays per frame
  r = onNavigated(r.state, 1, "http://a/other?tab=2", 500, true)
  assert.deepEqual(r.targets, [])
})

test("sync off: clicks stay in their frame", () => {
  const s = { url: "http://a/home", expected: [null, null] }
  assert.deepEqual(onNavigated(s, 0, "http://a/x", 0, false).targets, [])
})

test("upsertPreset replaces by name and sorts", () => {
  const a = { name: "b", url: "u", widths: [1], height: 1 }
  const list = upsertPreset(upsertPreset([a], { ...a, name: "a" }), { ...a, url: "v" })
  assert.deepEqual(list.map((p) => [p.name, p.url]), [["a", "u"], ["b", "v"]])
})

test("toggleWidth adds sorted, removes, keeps the last one", () => {
  assert.deepEqual(toggleWidth([375, 1280], 768), [375, 768, 1280])
  assert.deepEqual(toggleWidth([375, 768], 375), [768])
  assert.deepEqual(toggleWidth([768], 768), [768])
})

test("kindOf and isCustom", () => {
  assert.deepEqual([kindOf(375), kindOf(820), kindOf(1024)], ["phone", "tablet", "desktop"])
  assert.ok(isCustom(1600) && !isCustom(1280))
})
