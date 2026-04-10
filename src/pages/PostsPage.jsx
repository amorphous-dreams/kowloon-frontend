// PostsPage — server-wide public post firehose, filterable by type.

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

export default function PostsPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeType, setActiveType] = useState(null)

  const load = useCallback(async (p = 1, type = null) => {
    if (!client) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getServerPosts({ page: p, type: type ?? undefined })
      setPosts(res?.orderedItems ?? [])
      const total  = res?.totalItems ?? 0
      const perPage = res?.itemsPerPage ?? 20
      setTotalPages(Math.max(1, Math.ceil(total / perPage)))
    } catch (err) {
      setError(err.message || 'Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    setPage(1)
    load(1, activeType)
  }, [activeType, load])

  useEffect(() => {
    load(page, activeType)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeClick = (type) => {
    setActiveType((prev) => prev === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-0">

      <div className="border-b-2 border-base-content pb-4 mb-4">
        <h1 className="font-display text-5xl tracking-wide">
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

      {loading ? (
        <Spinner centered />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page, activeType)} />
      ) : (
        <PostList
          posts={posts}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ignoreTypeFilter
        />
      )}

    </div>
  )
}
