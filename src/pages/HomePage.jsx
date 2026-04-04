// Home — public face of the server. Always shows the @public post feed.
// Authenticated users are redirected to their Following circle on login;
// this page is the server landing for everyone.

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import Spinner from '../components/ui/Spinner'

export default function HomePage() {
  const { sessionChecked } = useSelector((state) => state.auth)
  const client = useClient()

  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  const loadFeed = useCallback(async () => {
    if (!sessionChecked) return
    setLoading(true)
    try {
      const res = await client.feeds.getServerPosts()
      const items = (res?.orderedItems ?? []).map((p) => ({
        ...p,
        attributedTo: p.attributedTo ?? p.actor ?? { id: p.actorId },
        published: p.published ?? p.createdAt,
      }))
      setPosts(items)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [client, sessionChecked])

  useEffect(() => { loadFeed() }, [loadFeed])

  if (!sessionChecked) return null

  return (
    <div className="flex flex-col">
      {loading
        ? <Spinner centered />
        : <PostList posts={posts} />
      }
    </div>
  )
}
