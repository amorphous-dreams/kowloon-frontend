// Shared reply-tree builder used by both the post page and the feed reply modal
// so their threading behavior can't drift apart.
//
// Turns the FLAT replies array into a shallow, two-level (Facebook-style) tree.
// First-level replies have `parent === postId` (or no parent); second-level
// replies have `parent === <a first-level reply id>`. Depth is capped at 2, so
// any reply whose parent isn't the post OR a known first-level reply (e.g. an
// orphan after a delete) is surfaced at the top level rather than dropped.
// Order is chronological at every level.

export const byTime = (a, b) =>
  new Date(a.publishedAt ?? a.createdAt ?? 0) - new Date(b.publishedAt ?? b.createdAt ?? 0)

export function buildReplyTree(replies, postId) {
  const firstLevel = []
  const childrenByParent = new Map()
  const isFirstLevel = (r) => !r.parent || r.parent === postId

  for (const r of replies) {
    if (isFirstLevel(r)) firstLevel.push(r)
  }
  const firstLevelIds = new Set(firstLevel.map((r) => r.id))

  for (const r of replies) {
    if (isFirstLevel(r)) continue
    if (firstLevelIds.has(r.parent)) {
      const bucket = childrenByParent.get(r.parent) ?? []
      bucket.push(r)
      childrenByParent.set(r.parent, bucket)
    } else {
      // Orphan (parent no longer present) — keep it visible at the top level.
      firstLevel.push(r)
    }
  }

  firstLevel.sort(byTime)
  return firstLevel.map((reply) => ({
    reply,
    children: (childrenByParent.get(reply.id) ?? []).sort(byTime),
  }))
}
