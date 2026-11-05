export type OverflowReport = { page: number; items: { selector: string; by: number }[] }

// Runs inside a frame. Finds elements cut by the viewport's left/right edge that no ancestor clips
// (an overflow-x: hidden/auto ancestor means a carousel or scroller, which is intentional), keeps the
// outermost ones, and outlines them in red. Running it again clears the previous outlines first.
export const OVERFLOW_SCRIPT = `(() => {
  for (const el of document.querySelectorAll("[data-rg-outline]")) {
    el.style.outline = el.getAttribute("data-rg-outline")
    el.removeAttribute("data-rg-outline")
  }
  const vw = document.documentElement.clientWidth
  const page = Math.max(0, document.documentElement.scrollWidth - vw)
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o !== "visible") return true
    }
    return false
  }
  const hits = []
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const by = Math.max(r.right - vw, -r.left)
    const partlyVisible = r.left < vw && r.right > 0
    if (by <= 1 || !partlyVisible) continue
    if (getComputedStyle(el).visibility === "hidden" || clipped(el)) continue
    if (hits.some((h) => h.el.contains(el))) continue
    hits.push({ el, by: Math.round(by) })
  }
  const name = (el) => {
    let s = el.tagName.toLowerCase()
    if (el.id) return s + "#" + el.id
    const cls = [...el.classList].slice(0, 2).join(".")
    return cls ? s + "." + cls : s
  }
  for (const h of hits.slice(0, 30)) {
    h.el.setAttribute("data-rg-outline", h.el.style.outline)
    h.el.style.outline = "2px solid #f85149"
  }
  return { page, items: hits.slice(0, 30).map((h) => ({ selector: name(h.el), by: h.by })) }
})()`
