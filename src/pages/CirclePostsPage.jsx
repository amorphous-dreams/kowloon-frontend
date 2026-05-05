// CirclePostsPage — feed of posts addressed to a specific circle.

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

function TypeFilter({ onRefresh }) {
  const dispatch = useDispatch()
  const { activeTypes } = useSelector((state) => state.feed)
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0 border-b border-base-300 pb-3">
      <button
        onClick={() => dispatch(clearTypes())}
        className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
          activeTypes.length === 0
            ? 'bg-primary text-primary-content'
            : 'bg-base-200 text-base-content/60 hover:bg-base-300'
        }`}
      >
        {t('feed.all')}
      </button>
      {POST_TYPES.map((type) => {
        const active = activeTypes.includes(type)
        return (
          <button
            key={type}
            onClick={() => dispatch(toggleType(type))}
            title={t(`postTypes.${type}`, { defaultValue: type })}
            className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
              active
                ? 'bg-primary text-primary-content'
                : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}
          >
            <PostTypeIcon type={type} size="sm" />
            <span className="hidden sm:inline">{t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}</span>
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
  )
}

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

  // Load circle metadata
  useEffect(() => {
    if (!sessionChecked || !client) return
    client.feeds.getCircle({ circleId })
      .then((res) => setCircle(res))
      .catch(() => setNotFound(true))
  }, [client, circleId, sessionChecked])

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
          <ArrowLeft size={13} /> {circle?.name ?? '\u2026'}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('circle.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      <TypeFilter onRefresh={() => setRefreshKey((k) => k + 1)} />

      {user && (
        <PostComposer
          onPostCreated={() => setRefreshKey((k) => k + 1)}
          initialValues={{ to: circleId }}
          prompt={t('composer.promptCircle', { name: circle?.name ?? '\u2026', defaultValue: `Write a post to ${circle?.name ?? '\u2026'}\u2026` })}
        />
      )}

      <PostList onDeleted={removeItem}
        posts={items}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        lastSeenAt={circle?.lastSeenAt}
      />
    </div>
  )
}
