// UserPostsPage — standalone feed of all posts by a specific user.

import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostList from '../components/posts/PostList'
import RssFeedLink from '../components/ui/RssFeedLink'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

function TypeFilter() {
  const dispatch = useDispatch()
  const { activeTypes } = useSelector((state) => state.feed)
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0 border-b border-base-300 pb-3">
      <button
        onClick={() => dispatch(clearTypes())}
        className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${activeTypes.length === 0 ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'}`}
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
            className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${active ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'}`}
          >
            <PostTypeIcon type={type} size="sm" />
            <span className="hidden sm:inline">
              {t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function UserPostsPage() {
  const { id } = useParams()
  const client = useClient()
  const { t } = useTranslation()
  const { activeTypes } = useSelector((state) => state.feed)

  const [user, setUser]       = useState(null)
  const [userLoading, setUserLoading] = useState(true)
  const [userError, setUserError]     = useState(null)

  // Load user profile once
  useEffect(() => {
    if (!client) return
    client.feeds.getUser({ userId: id })
      .then((res) => {
        const raw = res?.item ?? res
        setUser({
          id: raw?.id ?? raw?.actorId,
          username: raw?.preferredUsername ?? raw?.username,
          name: raw?.name ?? raw?.preferredUsername ?? raw?.username,
          profile: { icon: raw?.icon ?? raw?.profile?.icon },
        })
      })
      .catch((err) => setUserError(err.message || 'Failed to load user'))
      .finally(() => setUserLoading(false))
  }, [client, id])

  const fetchPosts = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getUserPosts({
      userId: id,
      type: activeTypes.length === 1 ? activeTypes[0] : undefined,
      page,
    })
    const attributedTo = user ? {
      id: user.id,
      name: user.name,
      username: user.username,
      icon: user.profile?.icon,
    } : undefined
    const rawPosts = res?.orderedItems ?? res ?? []
    const items = rawPosts.map((p) => ({
      ...p,
      attributedTo: p.attributedTo ?? attributedTo,
      published: p.published ?? p.publishedAt ?? p.createdAt,
      visibility: p.visibility ?? (p.to === '@public' ? 'Public' : p.to?.startsWith('@') ? 'Server' : 'Audience'),
    }))
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, id, activeTypes, user])

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(
    client ? fetchPosts : null
  )

  if (userLoading) return <Spinner centered />
  if (userError)   return <ErrorState message={userError} />

  const displayName = user?.name ?? id

  return (
    <div className="flex flex-col gap-6">
      <RssFeedLink href={`/users/${encodeURIComponent(id)}/posts?rss`} title={`${displayName} — Posts`} />
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/users/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {displayName}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('user.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      <TypeFilter />

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
