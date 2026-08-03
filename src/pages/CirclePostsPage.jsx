// CirclePostsPage — feed of posts addressed to a specific circle.
// Composer + FAB are shown to the circle OWNER only.

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import TypeFilter from '../components/posts/TypeFilter'
import ComposeFab from '../components/posts/ComposeFab'

export default function CirclePostsPage() {
  const { id } = useParams()
  const { activeTypes } = useSelector((state) => state.feed)
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const client = useClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const circleId = decodeURIComponent(id)

  const [circle, setCircle]     = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  // Load circle metadata
  useEffect(() => {
    if (!sessionChecked || !client) return
    client.feeds.getCircle({ circleId })
      .then((res) => setCircle(res?.item ?? res?.circle ?? res))
      .catch(() => setNotFound(true))
  }, [client, circleId, sessionChecked])

  // Only the circle owner may post to it.
  const ownerId = circle?.actorId || circle?.actor?.id
  const isOwner = !!user?.id && (circle?.isOwner === true || ownerId === user.id)

  // Cursor-based fetch: returns nextCursor (ISO string) or null
  const fetchPosts = useCallback(async (cursor) => {
    const res = await client.feeds.getCirclePosts({
      circleId,
      types: activeTypes.length ? activeTypes : undefined,
      before: cursor ?? undefined,
    })
    const items = res?.orderedItems ?? []
    const nc = res?.nextCursor ?? null
    return { items, nextCursor: nc, hasMore: nc !== null }
  }, [client, circleId, activeTypes, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const ready = sessionChecked && !notFound && !!client
  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(
    ready ? fetchPosts : null
  )

  if (!sessionChecked) return null

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 py-16 items-center">
        <p className="font-display text-5xl text-base-content/20">404</p>
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
          {t('circle.notFound', { defaultValue: 'Feed not found' })}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> {t('common.goBack', { defaultValue: 'Go back' })}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + circle name */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/circles/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {circle?.name ?? '…'}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('circle.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      <div className="flex items-center justify-end border-b border-base-300 pb-3">
        <TypeFilter />
      </div>

      <PostList onDeleted={removeItem}
        posts={items}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        lastSeenAt={circle?.lastSeenAt}
      />

      {/* Compose — owner only, via the floating hexagon FAB. */}
      {isOwner && (
        <>
          <PostComposer
            hideTrigger
            open={composerOpen}
            onOpenChange={setComposerOpen}
            onPostCreated={() => setRefreshKey((k) => k + 1)}
            initialValues={{ to: circleId }}
            prompt={t('composer.promptCircle', { name: circle?.name ?? '…', defaultValue: `Write a post to ${circle?.name ?? '…'}…` })}
          />
          <ComposeFab onClick={() => setComposerOpen(true)} />
        </>
      )}
    </div>
  )
}
