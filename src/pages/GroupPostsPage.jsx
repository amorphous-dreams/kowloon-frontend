// GroupPostsPage — standalone feed of posts in a group, filterable by type.

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostList from '../components/posts/PostList'
import RssFeedLink from '../components/ui/RssFeedLink'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import ErrorState from '../components/ui/ErrorState'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

export default function GroupPostsPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const client = useClient()

  const [group, setGroup]         = useState(null)
  const [activeType, setActiveType] = useState(null)

  const loadGroup = useCallback(async () => {
    if (!client) return
    try {
      const res = await client.feeds.getGroup({ groupId: decodeURIComponent(id) })
      setGroup(res?.item ?? res)
    } catch {
      // non-fatal — heading falls back to "Posts"
    }
  }, [client, id])

  useEffect(() => { loadGroup() }, [loadGroup])

  const fetchPosts = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getGroupPosts({
      groupId: decodeURIComponent(id),
      page,
      type: activeType ?? undefined,
    })
    const items = res?.orderedItems ?? []
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, id, activeType])

  const { items, hasMore, loading, loadingMore, error, loadMore } = useFeed(
    client ? fetchPosts : null
  )

  const handleTypeClick = (type) => {
    setActiveType((prev) => prev === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-6">
      {group?.to === '@public' && (
        <RssFeedLink href={`/groups/${encodeURIComponent(id)}/posts?rss`} title={`${group.name ?? id} — Posts`} />
      )}
      {/* Back link + heading */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/groups/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {group?.name ?? t('group.group', { defaultValue: 'Group' })}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('group.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {POST_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeClick(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest border transition-colors ${
              activeType === type
                ? 'bg-base-content text-base-100 border-base-content'
                : 'border-base-300 text-base-content/60 hover:border-base-content/40 hover:text-base-content'
            }`}
          >
            <PostTypeIcon type={type} size="xs" />
            {type}
          </button>
        ))}
      </div>

      {/* Posts */}
      {error && !loading ? (
        <ErrorState message={error} onRetry={() => {}} />
      ) : (
        <PostList
          posts={items}
          loading={loading}
          error={null}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          ignoreTypeFilter
        />
      )}

    </div>
  )
}
