// GroupPostsPage — standalone feed of posts in a group, filterable by type.
// Composer + FAB are shown to group MEMBERS (and the owner) only.

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import { useJoinedGroups } from '../hooks/useJoinedGroups'
import PostList from '../components/posts/PostList'
import PostComposer from '../components/posts/PostComposer'
import TypeFilter from '../components/posts/TypeFilter'
import ComposeFab from '../components/posts/ComposeFab'
import RssFeedLink from '../components/ui/RssFeedLink'
import ErrorState from '../components/ui/ErrorState'

export default function GroupPostsPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const client = useClient()
  const user = useSelector((state) => state.auth.user)
  const { activeTypes } = useSelector((state) => state.feed)
  const joinedGroups = useJoinedGroups()

  const groupId = decodeURIComponent(id)
  const [group, setGroup] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  const loadGroup = useCallback(async () => {
    if (!client) return
    try {
      const res = await client.feeds.getGroup({ groupId })
      setGroup(res?.item ?? res)
    } catch {
      // non-fatal — heading falls back to "Posts"
    }
  }, [client, groupId])

  useEffect(() => { loadGroup() }, [loadGroup])

  const ownerId = group?.actorId || group?.actor?.id
  const isOwner = !!user?.id && ownerId === user.id
  const isMember = joinedGroups.some((g) => g.id === groupId)
  const canPost = isOwner || isMember

  const fetchPosts = useCallback(async (cursor) => {
    const page = cursor ?? 1
    // Group feeds filter by a single server-side `type` — send the first active
    // type (matches mobile; the group route can't multi-filter). See item note.
    const res = await client.feeds.getGroupPosts({
      groupId,
      page,
      type: activeTypes[0],
    })
    const items = res?.orderedItems ?? []
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, groupId, activeTypes, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(
    client ? fetchPosts : null
  )

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
      <div className="flex items-center justify-end border-b border-base-300 pb-3">
        <TypeFilter />
      </div>

      {/* Posts */}
      {error && !loading ? (
        <ErrorState message={error} onRetry={() => {}} />
      ) : (
        <PostList onDeleted={removeItem}
          posts={items}
          loading={loading}
          error={null}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      )}

      {/* Compose — members/owner only, via the floating hexagon FAB. */}
      {canPost && (
        <>
          <PostComposer
            hideTrigger
            open={composerOpen}
            onOpenChange={setComposerOpen}
            onPostCreated={() => setRefreshKey((k) => k + 1)}
            initialValues={{ to: groupId }}
            prompt={t('composer.promptGroup', { name: group?.name ?? '…', defaultValue: `Write a post to ${group?.name ?? '…'}…` })}
          />
          <ComposeFab onClick={() => setComposerOpen(true)} />
        </>
      )}
    </div>
  )
}
