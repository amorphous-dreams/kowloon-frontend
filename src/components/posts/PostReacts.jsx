// PostReacts — distinct emoji reactions on a post, sorted by count desc.
// Renders flush-right above the action bar at ~75% body text size. Reads the
// pre-aggregated string from `post.reactSummary` (server-cached); falls back
// to `post.reactPreview` if summary isn't present yet (un-backfilled post).

export default function PostReacts({ post }) {
  const summary = post?.reactSummary || post?.reactPreview
  if (!summary) return null

  return (
    <div className="flex justify-end pt-2">
      <span
        className="font-reading text-base-content/70 leading-none tracking-[0.35em]"
        style={{ fontSize: '0.75em' }}
        aria-label="Reactions"
      >
        {summary}
      </span>
    </div>
  )
}
