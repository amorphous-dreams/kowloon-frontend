// Home — public face of the server for anon users; personal feed for logged-in users.
// Anon: shows public posts with type filter.
// Auth: a view selector (Community Posts / My Posts / circles / groups) drives the
// feed, matching the mobile app's FeedViewSelector. Default view is Community Posts.

import { useState, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import { useJoinedGroups } from '../hooks/useJoinedGroups'
import { setView, toggleType, clearTypes } from '../app/feedSlice'
import { fetchMyCircles } from '../features/circles/myCirclesSlice'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { Eye } from 'lucide-react'
import FeedViewSelector from '../components/posts/FeedViewSelector'
import NewCircleModal from '../components/circles/NewCircleModal'
import RssFeedLink from '../components/ui/RssFeedLink'
import { useTrackScrollAnchor, useRestoreScrollAnchor } from '../hooks/useScrollAnchor'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

// Normalize a page-based feed response into { items, nextCursor, hasMore }.
function pageResult(res, page, { mapPublished = false } = {}) {
  let items = res?.orderedItems ?? []
  if (mapPublished) items = items.map((p) => ({ ...p, published: p.published ?? p.createdAt }))
  const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
  const fetchedPage = res?.page ?? page
  const hasMore = fetchedPage * itemsPerPage < totalItems
  return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
}

// ── Shared type filter + refresh bar ─────────────────────────────────────────

function FilterBar({ activeTypes, onToggleType, onClearTypes, onRefresh, prefix }) {
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
          onClick={onClearTypes}
          className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
            activeTypes.length === 0
              ? 'bg-primary text-primary-content'
              : 'bg-base-200 text-base-content/60 hover:bg-base-300'
          }`}
        >
          {t('feed.all', { defaultValue: 'All' })}
        </button>
        {POST_TYPES.map((type) => {
          const active = activeTypes.includes(type)
          return (
            <button
              key={type}
              onClick={() => onToggleType(type)}
              title={t(`postTypes.${type}`, { defaultValue: type })}
              className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
                active
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content/60 hover:bg-base-300'
              }`}
            >
              <PostTypeIcon type={type} size="sm" />
              <span className="hidden sm:inline">
                {t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}
              </span>
            </button>
          )
        })}
        <button
          onClick={onRefresh}
          title={t('feed.refresh', { defaultValue: 'Refresh' })}
          className="ml-auto px-3 py-2 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-base-content transition-colors"
          aria-label={t('feed.refresh', { defaultValue: 'Refresh' })}
        >
          ↻
        </button>
      </div>
      {activeTypes.length > 0 && (
        <p className="pt-2 text-sm text-base-content/50 tracking-wide">
          {activeTypes.map((type) => t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)).join(' / ')}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const dispatch = useDispatch()
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const { view, activeTypes } = useSelector((state) => state.feed)
  const { items: myCircles, status: circlesStatus } = useSelector((state) => state.myCircles)
  const joinedGroups = useJoinedGroups()
  const client = useClient()
  const { t } = useTranslation()

  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreateCircle, setShowCreateCircle] = useState(false)

  // Load circles once when logged in (for the view selector).
  useEffect(() => {
    if (user && circlesStatus === 'idle') {
      dispatch(fetchMyCircles())
    }
  }, [user, circlesStatus, dispatch])

  // If the persisted view points at a circle that no longer exists (deleted, or
  // saved by a different user), fall back to Community Posts.
  useEffect(() => {
    if (!user || circlesStatus !== 'succeeded') return
    if (view?.startsWith?.('circle:') && !myCircles.some((c) => c.id === view)) {
      dispatch(setView('all'))
    }
  }, [user, view, circlesStatus, myCircles, dispatch])

  // Same for a group you've since left (only once groups have loaded).
  useEffect(() => {
    if (view?.startsWith?.('group:') && joinedGroups.length > 0 && !joinedGroups.some((g) => g.id === view)) {
      dispatch(setView('all'))
    }
  }, [view, joinedGroups, dispatch])

  const isCircleView = typeof view === 'string' && view.startsWith('circle:')
  const isGroupView = typeof view === 'string' && view.startsWith('group:')
  const activeCircle = myCircles.find((c) => c.id === view)
  const lastSeenAt = activeCircle?.lastSeenAt ?? null

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchPublic = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({
      types: activeTypes.length ? activeTypes : undefined,
      page,
    })
    return pageResult(res, page, { mapPublished: true })
  }, [client, activeTypes, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Logged-in fetch — branches on the current view, mirroring mobile useFeed.
  const fetchAuthed = useCallback(async (cursor) => {
    const single = activeTypes.length === 1 ? activeTypes[0] : undefined
    if (view === 'mine') {
      const page = cursor ?? 1
      const res = await client.feeds.getUserPosts({ userId: user.id, type: single, page })
      return pageResult(res, page)
    }
    if (isGroupView) {
      const page = cursor ?? 1
      const res = await client.feeds.getGroupPosts({ groupId: view, type: single, page })
      return pageResult(res, page)
    }
    if (isCircleView) {
      const res = await client.feeds.getCirclePosts({
        circleId: view,
        types: activeTypes.length ? activeTypes : undefined,
        before: cursor ?? undefined,
      })
      const items = res?.orderedItems ?? []
      const nc = res?.nextCursor ?? null
      return { items, nextCursor: nc, hasMore: nc !== null }
    }
    // 'all' — merged public + server firehose.
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({
      types: activeTypes.length ? activeTypes : undefined,
      page,
    })
    return pageResult(res, page, { mapPublished: true })
  }, [client, view, isGroupView, isCircleView, activeTypes, user?.id, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFn = !sessionChecked ? null : user ? fetchAuthed : fetchPublic

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(fetchFn)

  // Persist the topmost-visible post id per view, and restore it on mount.
  const anchorKey = user ? view : 'public'
  const itemIds = items.map((p) => p.id)
  useRestoreScrollAnchor(anchorKey, itemIds)
  useTrackScrollAnchor(anchorKey, itemIds)

  if (!sessionChecked) return null

  const handleRefresh = () => setRefreshKey((k) => k + 1)
  const handleSelectView = (v) => {
    dispatch(setView(v))
    setRefreshKey((k) => k + 1)
  }

  // ── Logged-in view ────────────────────────────────────────────────────────

  if (user) {
    const composerTo = (isCircleView || isGroupView) ? view : 'public'
    return (
      <div className="flex flex-col">
        <PostComposer
          onPostCreated={handleRefresh}
          initialValues={{ to: composerTo }}
          prompt={t('composer.prompt')}
        />
        <FilterBar
          activeTypes={activeTypes}
          onToggleType={(type) => dispatch(toggleType(type))}
          onClearTypes={() => dispatch(clearTypes())}
          onRefresh={handleRefresh}
          prefix={
            <FeedViewSelector
              value={view}
              onChange={handleSelectView}
              circles={myCircles}
              groups={joinedGroups}
              account={user}
              allowCreate
              onCreateCircle={() => setShowCreateCircle(true)}
            />
          }
        />
        {showCreateCircle && (
          <NewCircleModal
            onClose={() => setShowCreateCircle(false)}
            onCreated={(id) => {
              dispatch(setView(id))
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
          emptyMessage={isCircleView ? t('post.emptyCircle') : undefined}
          lastSeenAt={lastSeenAt}
        />
      </div>
    )
  }

  // ── Public (anon) view ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <RssFeedLink href="/posts?rss" title="Public Posts" />
      <FilterBar
        activeTypes={activeTypes}
        onToggleType={(type) => dispatch(toggleType(type))}
        onClearTypes={() => dispatch(clearTypes())}
        onRefresh={handleRefresh}
      />
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
