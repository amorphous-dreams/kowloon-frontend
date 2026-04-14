// Home — public face of the server. Always shows the @public post feed.
// Authenticated users can also compose here.

import { useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

function TypeFilter({ activeType, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-0 border-b border-base-300 pb-3 mb-2">
      <button
        onClick={() => onChange(null)}
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
          onClick={() => onChange(activeType === type ? null : type)}
          title={t(`postTypes.${type}`, { defaultValue: type })}
          className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${
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
    </div>
  )
}

export default function HomePage() {
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const client = useClient()
  const { t } = useTranslation()

  const [activeType, setActiveType] = useState(null)

  const fetchPosts = useCallback(async (cursor) => {
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
  }, [client, activeType]) // eslint-disable-line react-hooks/exhaustive-deps

  const { items, hasMore, loading, loadingMore, error, loadMore } = useFeed(
    sessionChecked ? fetchPosts : null
  )

  if (!sessionChecked) return null

  return (
    <div className="flex flex-col">
      {user && (
        <PostComposer
          onPostCreated={() => {}}
          initialValues={{ to: 'public' }}
          prompt={t('composer.promptPublic', { defaultValue: 'Write a public post\u2026' })}
        />
      )}
      <TypeFilter activeType={activeType} onChange={setActiveType} />
      <PostList
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
