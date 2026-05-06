// useScrollAnchor — track which post is most-visible at the top of the viewport
// and persist it to localStorage, keyed per circle. Restoration is intentionally
// NOT wired up here — call `getScrollAnchorFor(circleId)` and scroll to it
// yourself when you want to use it (e.g. on mobile after navigating back).
//
// Markup contract: each post container should expose `data-post-id="<post.id>"`.
// PostCard and EventCard already do this.

import { useEffect } from 'react'

const STORAGE_PREFIX = 'kowloon:feed:scrollAnchor:'

export function getScrollAnchorFor(circleId) {
  if (typeof localStorage === 'undefined' || !circleId) return null
  try { return localStorage.getItem(STORAGE_PREFIX + circleId) } catch { return null }
}

export function clearScrollAnchorFor(circleId) {
  if (typeof localStorage === 'undefined' || !circleId) return
  try { localStorage.removeItem(STORAGE_PREFIX + circleId) } catch { /* ignore */ }
}

function persist(circleId, postId) {
  if (typeof localStorage === 'undefined' || !circleId || !postId) return
  try { localStorage.setItem(STORAGE_PREFIX + circleId, postId) } catch { /* ignore */ }
}

/**
 * Track the topmost visible post within the document and persist its id.
 *
 * @param {string|null} circleId  — namespacing key. Pass `null` to disable tracking.
 * @param {string[]}    postIds   — the current set of rendered post ids; the
 *                                  effect re-binds whenever this changes so
 *                                  newly-rendered posts get observed too.
 */
export function useTrackScrollAnchor(circleId, postIds = []) {
  const fingerprint = postIds.join('|') // cheap dependency key

  useEffect(() => {
    if (!circleId || typeof IntersectionObserver === 'undefined') return

    let lastWritten = null

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry currently in the "top band" of the viewport that's
        // closest to the top edge — that's our anchor.
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (!top) return
        const id = top.target.getAttribute('data-post-id')
        if (id && id !== lastWritten) {
          lastWritten = id
          persist(circleId, id)
        }
      },
      // Anchor zone: top ~25% of the viewport. Anything above that doesn't
      // count as "what the user is looking at".
      { rootMargin: '0px 0px -75% 0px', threshold: 0 }
    )

    const els = document.querySelectorAll('[data-post-id]')
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [circleId, fingerprint])
}
