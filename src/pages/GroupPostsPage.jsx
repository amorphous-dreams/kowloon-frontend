// GroupPostsPage — standalone feed of posts in a group, filterable by type.

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

export default function GroupPostsPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const client = useClient()

  const [group, setGroup]         = useState(null)
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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

  const loadPosts = useCallback(async (p = 1, type = null) => {
    if (!client) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getGroupPosts({
        groupId: decodeURIComponent(id),
        page: p,
        type: type ?? undefined,
      })
      setPosts(res?.orderedItems ?? [])
      const total = res?.totalItems ?? 0
      const perPage = res?.itemsPerPage ?? 20
      setTotalPages(Math.max(1, Math.ceil(total / perPage)))
    } catch (err) {
      setError(err.message || 'Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { loadGroup() }, [loadGroup])

  useEffect(() => {
    setPage(1)
    loadPosts(1, activeType)
  }, [activeType, loadPosts])

  useEffect(() => {
    loadPosts(page, activeType)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeClick = (type) => {
    setActiveType((prev) => prev === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-6">

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
      {loading ? (
        <Spinner centered />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadPosts(page, activeType)} />
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
