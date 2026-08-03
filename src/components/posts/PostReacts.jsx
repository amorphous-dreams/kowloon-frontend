// PostReacts — distinct emoji reactions on a post, sorted by count desc.
// Renders flush-right above the action bar at ~75% body text size. Reads the
// pre-aggregated string from `post.reactSummary` (server-cached); falls back
// to `post.reactPreview` if summary isn't present yet (un-backfilled post).

export default function PostReacts({ post }) {
  const summary = post?.reactSummary || post?.reactPreview
  if (!summary) return null

  const total = post?.reactCount ?? 0

  return (
    <div className="flex justify-end items-center gap-2 pt-2">
      <span
        className="font-reading text-base-content/70 leading-none tracking-[0.35em]"
        style={{ fontSize: '0.75em' }}
        aria-label="Reactions"
      >
        {summary}
      </span>
      {total > 0 && (
        <span
          className="font-ui text-base-content/60 leading-none"
          style={{ fontSize: '0.75em' }}
        >
          {total}
        </span>
      )}
    </div>
  )
}

// ReactCounts — per-emoji breakdown with counts (e.g. 👍 5  ❤️ 2  🤬 12), shown
// on the post detail view. Reads `post.reactCounts` ([{ emoji, count }], server-
// sorted by count desc) which getPost returns. Mirrors mobile's ReactsBar.
export function ReactCounts({ post }) {
  const counts = post?.reactCounts
  if (!Array.isArray(counts) || counts.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Reactions">
      {counts.map(({ emoji, count }) => (
        <span key={emoji} className="inline-flex items-center gap-1.5">
          <span className="text-base leading-none">{emoji}</span>
          <span className="font-ui text-sm text-base-content/60">{count}</span>
        </span>
      ))}
    </div>
  )
}
