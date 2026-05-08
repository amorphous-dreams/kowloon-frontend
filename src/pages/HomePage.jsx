// Home — public face of the server for anon users; personal circle feed for logged-in users.
// Anon: shows public posts with type filter.
// Auth: shows circle feed (default: Following), circle selector, type filter, composer.

import { useState, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import { setCircle } from '../app/feedSlice'
import { fetchMyCircles } from '../features/circles/myCirclesSlice'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { Eye } from 'lucide-react'
import CircleSelector from '../components/circles/CircleSelector'
import NewCircleModal from '../components/circles/NewCircleModal'
import RssFeedLink from '../components/ui/RssFeedLink'
import { useTrackScrollAnchor, useRestoreScrollAnchor } from '../hooks/useScrollAnchor'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

// ── Shared type filter + refresh bar ─────────────────────────────────────────

function FilterBar({ activeType, onTypeChange, onRefresh, prefix }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-0 border-b border-base-300 pb-3 mb-2">
      {prefix && (
        <div className="flex items-center gap-2 px-3 py-2 border-b sm:border-b-0 sm:border-r border-base-300 shrink-0">
          <span
            title={t('feed.show', { defaultValue: 'Show' })}
            aria-label={t('feed.show', { defaultValue: 'Show' })}
            className="inline-flex text-base-content/40"
          >
            <Eye size={18} strokeWidth={1.75} />
          </span>
          {prefix}
        </div>
      )}
      <div className="flex items-center gap-0 flex-1 flex-wrap">
        <button
          onClick={() => onTypeChange(null)}
          className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
            !activeType
              ? 'bg-primary text-primary-content'
              : 'bg-base-200 text-base-content/60 hover:bg-base-300'
          }`}
        >
          {t('feed.all', { defaultValue: 'All' })}
        </button>
        {POST_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(activeType === type ? null : type)}
            title={t(`postTypes.${type}`, { defaultValue: type })}
            className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
              activeType === type
                ? 'bg-primary text-primary-content'
                : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}
          >
            <PostTypeIcon type={type} size="sm" />
            <span className="hidden sm:inline">
              {t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}
            </span>
          </button>
        ))}
        <button
          onClick={onRefresh}
          title={t('feed.refresh', { defaultValue: 'Refresh' })}
          className="ml-auto px-3 py-2 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-base-content transition-colors"
          aria-label={t('feed.refresh', { defaultValue: 'Refresh' })}
        >
          ↻
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const dispatch = useDispatch()
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const { circleId } = useSelector((state) => state.feed)
  const { items: myCircles, status: circlesStatus } = useSelector((state) => state.myCircles)
  const client = useClient()
  const { t } = useTranslation()

  const [activeType, setActiveType] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreateCircle, setShowCreateCircle] = useState(false)

  const followingId = user?.following ?? null

  // Set default circle to Following when user logs in
  useEffect(() => {
    if (user && !circleId && followingId) {
      dispatch(setCircle(followingId))
    }
  }, [user, circleId, followingId, dispatch])

  // Load circles once when logged in
  useEffect(() => {
    if (user && circlesStatus === 'idle') {
      dispatch(fetchMyCircles())
    }
  }, [user, circlesStatus, dispatch])

  // Validate the persisted circleId once myCircles loads — if it points at a
  // circle that no longer exists (deleted, or saved by a different user),
  // fall back to Following.
  useEffect(() => {
    if (!user || !followingId || circlesStatus !== 'succeeded') return
    if (!circleId) return
    if (myCircles.some((c) => c.id === circleId)) return
    dispatch(setCircle(followingId))
  }, [user, circleId, followingId, circlesStatus, myCircles, dispatch])

  const activeCircleId = circleId ?? followingId
  const activeCircle = myCircles.find((c) => c.id === activeCircleId)
  const lastSeenAt = activeCircle?.lastSeenAt ?? null

  // ── Fetch function — switches between public feed (anon) and circle feed (auth) ──

  const fetchPublic = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({ type: activeType ?? undefined, page })
    const items = (res?.orderedItems ?? []).map((p) => ({
      ...p,
      attributedTo: p.attributedTo ?? p.actor ?? { id: p.actorId },
      published: p.published ?? p.createdAt,
    }))
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, activeType, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCircle = useCallback(async (cursor) => {
    const res = await client.feeds.getCirclePosts({
      circleId: activeCircleId,
      types: activeType ? [activeType] : undefined,
      before: cursor ?? undefined,
    })
    const items = res?.orderedItems ?? []
    const nc = res?.nextCursor ?? null
    return { items, nextCursor: nc, hasMore: nc !== null }
  }, [client, activeCircleId, activeType, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFn = !sessionChecked
    ? null
    : user
      ? (activeCircleId ? fetchCircle : null)
      : fetchPublic

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(fetchFn)

  // Persist the topmost-visible post id per circle, and restore it on mount
  // (e.g. when navigating back from a post detail page).
  const itemIds = items.map((p) => p.id)
  useRestoreScrollAnchor(activeCircleId, itemIds)
  useTrackScrollAnchor(activeCircleId, itemIds)

  if (!sessionChecked) return null

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  // ── Logged-in view ────────────────────────────────────────────────────────

  if (user) {
    return (
      <div className="flex flex-col">
        <PostComposer
          onPostCreated={handleRefresh}
          initialValues={{ to: activeCircleId ?? 'public' }}
          prompt={t('composer.prompt')}
        />
        <FilterBar
          activeType={activeType}
          onTypeChange={setActiveType}
          onRefresh={handleRefresh}
          prefix={
            <CircleSelector
              circles={myCircles}
              value={activeCircleId ?? ''}
              onChange={(id) => {
                dispatch(setCircle(id))
                setRefreshKey((k) => k + 1)
              }}
              allowCreate
              onCreateCircle={() => setShowCreateCircle(true)}
            />
          }
        />
        {showCreateCircle && (
          <NewCircleModal
            onClose={() => setShowCreateCircle(false)}
            onCreated={(id) => {
              dispatch(setCircle(id))
              setRefreshKey((k) => k + 1)
            }}
          />
        )}
        <PostList onDeleted={removeItem}
          posts={items}
          loading={loading}
          error={error}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          emptyMessage={activeCircleId ? t('post.emptyCircle') : undefined}
          lastSeenAt={lastSeenAt}
        />
      </div>
    )
  }

  // ── Public (anon) view ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <RssFeedLink href="/posts?rss" title="Public Posts" />
      <FilterBar activeType={activeType} onTypeChange={setActiveType} onRefresh={handleRefresh} />
      <PostList onDeleted={removeItem}
        posts={items}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </div>
  )
}
