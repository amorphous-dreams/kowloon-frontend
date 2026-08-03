// PostsPage — server-wide public post firehose, filterable by type.

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import ErrorState from '../components/ui/ErrorState'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

export default function PostsPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [activeType, setActiveType] = useState(null)

  const fetchPosts = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({ page, type: activeType ?? undefined })
    const items = res?.orderedItems ?? []
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, activeType])

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(
    client ? fetchPosts : null
  )

  const handleTypeClick = (type) => {
    setActiveType((prev) => prev === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-0">

      <div className="border-b-2 border-base-content pb-4 mb-4">
        <h1 className="font-display text-3xl tracking-wide">
          {t('posts.title', { defaultValue: 'Posts' })}
        </h1>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
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

      {error && !loading ? (
        <ErrorState message={error} />
      ) : (
        <PostList onDeleted={removeItem}
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
