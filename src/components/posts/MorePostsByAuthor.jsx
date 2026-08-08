// MorePostsByAuthor — at the bottom of a single post page, feature a couple more
// public posts by the same author, rendered with the full feed PostCard (any
// type, not just the current one). "More Posts By {name}". Renders nothing if
// there are none. Issue #32 — matches the mobile app.
import { useEffect, useState } from 'react'
import { useClient } from '../../hooks/useClient'
import PostCard from './PostCard'

const COUNT = 2

export default function MorePostsByAuthor({ post }) {
  const client = useClient()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!client || !post?.actorId) return
    let cancelled = false
    client.feeds
      .getUserPosts({ userId: post.actorId, sort: 'top' })
      .then((res) => {
        if (cancelled) return
        const all = res?.orderedItems ?? res?.items ?? []
        setItems(all.filter((p) => p.id !== post.id).slice(0, COUNT))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [client, post?.actorId, post?.id])

  if (items.length === 0) return null

  const name = post.actor?.name || post.actor?.id || 'this author'

  return (
    <section className="flex flex-col border-t-2 border-base-300 pt-6">
      <h2 className="font-display text-2xl tracking-wide mb-2">
        More Posts By {name}
      </h2>
      <div className="flex flex-col">
        {items.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  )
}
