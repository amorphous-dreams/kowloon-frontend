// useFitText — keeps a heading on a single line at maxPx if it fits the
// container; otherwise switches to a wrapped 2-line mode at wrapPx with tight
// leading so the row height stays the same.
//
// The element should NOT have `truncate` or `line-clamp-2` applied via class
// — wrap mode is signaled via the `wrapped` boolean so the consumer can pick
// the right class set.

import { useLayoutEffect, useRef, useEffect, useState, useCallback } from 'react'

export default function useFitText({ maxPx = 18, wrapPx = 14, text } = {}) {
  const ref = useRef(null)
  const [wrapped, setWrapped] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return

    // Probe: render single-line at maxPx, measure overflow vs available width.
    // We mutate inline styles temporarily so the probe doesn't depend on the
    // className state (which is driven by the boolean we're about to set).
    const prev = el.getAttribute('style')
    el.style.whiteSpace = 'nowrap'
    el.style.overflow = 'hidden'
    el.style.fontSize = `${maxPx}px`
    el.style.display = 'block'
    el.style.webkitLineClamp = ''

    const overflows = el.scrollWidth > el.clientWidth + 1

    if (prev !== null) el.setAttribute('style', prev)
    else el.removeAttribute('style')

    setWrapped((current) => (current === overflows ? current : overflows))
  }, [maxPx, wrapPx])

  useLayoutEffect(() => { measure() }, [text, measure])

  useEffect(() => {
    const el = ref.current
    if (!el?.parentElement) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [measure])

  return [ref, wrapped]
}
