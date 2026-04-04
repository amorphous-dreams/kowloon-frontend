// Home — public face of the server. Always shows the @public post feed.
// Authenticated users are redirected to their Following circle on login;
// this page is also where they can compose a post.

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import Spinner from '../components/ui/Spinner'

export default function HomePage() {
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const client = useClient()
  const { t } = useTranslation()

  const [circles, setCircles] = useState([])
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)

  // Load user's circles for the composer audience picker
  useEffect(() => {
    if (!sessionChecked || !user || !client) return
    client.feeds.getUserCircles({ userId: user.id })
      .then((res) => setCircles(res?.orderedItems ?? []))
      .catch(() => setCircles([]))
  }, [client, user?.id, sessionChecked])

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
      {user && <PostComposer circles={circles} onPostCreated={loadFeed} initialValues={{ to: 'public' }} prompt={t('composer.promptPublic', { defaultValue: 'Write a public post…' })} />}
      {loading
        ? <Spinner centered />
        : <PostList posts={posts} />
      }
    </div>
  )
}
