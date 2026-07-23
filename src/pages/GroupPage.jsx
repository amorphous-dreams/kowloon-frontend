// GroupPage — group detail, member list, composer, and post feed.
// PostComposer shown for members only. Edit/Delete for owner only.

import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { MapPin, ExternalLink, Users, UserPlus, UserCheck, Pencil, Trash2, ChevronDown, ChevronUp, Inbox } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { joinNeedsApproval, canJoinGroup, rsvpPolicyLabel } from '../lib/groups'
import { useFeed } from '../hooks/useFeed'
import PostList from '../components/posts/PostList'
import PostComposer from '../components/posts/PostComposer'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { toggleType, clearTypes } from '../app/feedSlice'
import sizedUrl from '../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

// ── TypeFilter ────────────────────────────────────────────────────────────────

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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GroupPage() {
  const { id } = useParams()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeTypes } = useSelector((state) => state.feed)

  const [group, setGroup]     = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [joined, setJoined]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const containerRef = useRef(null)
  const [shadowProgress, setShadowProgress] = useState(0)

  // Load group metadata + members
  const loadGroup = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const [groupRes, membersRes] = await Promise.all([
        client.feeds.getGroup({ groupId: id }),
        client.feeds.getGroupMembers({ groupId: id }).catch(() => null),
      ])
      const g = groupRes?.item ?? groupRes
      setGroup(g)
      const memberList = membersRes?.orderedItems ?? membersRes?.items ?? []
      setMembers(memberList)
      if (authUser) {
        setJoined(memberList.some((m) => m.id === authUser.id))
      }
    } catch (err) {
      setError(err.message || 'Failed to load group.')
    } finally {
      setLoading(false)
    }
  }, [client, id, authUser])

  useEffect(() => { loadGroup() }, [loadGroup])

  // Scroll-driven header shadow
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let parent = el.parentElement
    while (parent && getComputedStyle(parent).overflowY === 'visible') {
      parent = parent.parentElement
    }
    if (!parent) return
    const handleScroll = () => setShadowProgress(Math.min(parent.scrollTop / 60, 1))
    parent.addEventListener('scroll', handleScroll, { passive: true })
    return () => parent.removeEventListener('scroll', handleScroll)
  }, [])

  // Posts feed via useFeed
  const fetchPosts = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getGroupPosts({
      groupId: id,
      page,
      type: activeTypes.length === 1 ? activeTypes[0] : undefined,
    })
    const items = res?.orderedItems ?? []
    const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
    const fetchedPage = res?.page ?? page
    const hasMore = fetchedPage * itemsPerPage < totalItems
    return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
  }, [client, id, activeTypes, refreshKey])

  const { items: posts, hasMore, loading: postsLoading, loadingMore, error: postsError, loadMore, removeItem } = useFeed(
    client && group ? fetchPosts : null
  )

  const handleJoinToggle = async () => {
    if (!client) return
    try {
      if (joined) {
        await client.activities.leaveGroup({ groupId: id })
      } else {
        await client.activities.joinGroup({ groupId: id })
      }
      setJoined((j) => !j)
    } catch {}
  }

  const handleDelete = async () => {
    if (!window.confirm(t('group.confirmDelete', { defaultValue: 'Delete this group? This cannot be undone.' }))) return
    setDeleting(true)
    try {
      await client.activities.deleteGroup({ groupId: id })
      navigate('/groups', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to delete group.')
      setDeleting(false)
    }
  }

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={loadGroup} />
  if (!group)  return null

  const isLoggedIn    = !!authUser
  const isOwner       = authUser && group.actor?.id === authUser.id
  const isMember      = joined
  const needsApproval = joinNeedsApproval(group.rsvpPolicy)
  const canJoin       = canJoinGroup(group.rsvpPolicy)

  const MEMBER_PREVIEW  = 5
  const visibleMembers  = showAllMembers ? members : members.slice(0, MEMBER_PREVIEW)

  return (
    <div ref={containerRef} className="flex flex-col gap-8">

      {/* Hero banner — scrolls away, not sticky */}
      {group.image && (
        <div className="-mx-0 -mt-0 w-full overflow-hidden" style={{ aspectRatio: '3/1' }}>
          <img
            src={sizedUrl(group.image, 1200)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Sticky group header */}
      <div
        className="sticky top-0 bg-base-100 z-10 flex flex-col gap-4 pt-6 pb-6 px-4 border-b-2 border-base-300"
        style={{
          filter: `drop-shadow(${shadowProgress * 8}px ${shadowProgress * 8}px ${shadowProgress * 2}px rgba(0,0,0,${(shadowProgress * 0.35).toFixed(3)}))`,
          transform: `translate(${shadowProgress * -3}px, ${shadowProgress * -3}px)`,
        }}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          {group.icon
            ? <img src={sizedUrl(group.icon, 200)} alt={group.name} className="w-20 h-20 object-cover shrink-0" style={hexMask} />
            : <div className="w-20 h-20 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
                <CircleIcon type="group" size="lg" className="text-secondary-content opacity-70" />
              </div>
          }

          {/* Name + meta */}
          <div className="flex flex-col gap-2 min-w-0 pt-1 flex-1">
            <h1 className="font-display text-4xl leading-none tracking-wide">{group.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs uppercase tracking-widest text-base-content/60">
              <Link
                to={`/users/${encodeURIComponent(group.actor?.id)}`}
                className="font-bold hover:text-primary transition-colors"
              >
                {group.actor?.name ?? group.actor?.id}
              </Link>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={10} />
                {(group.memberCount ?? members.length).toLocaleString()} {t('group.members', { defaultValue: 'members' })}
              </span>
              {group.location?.name && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {group.location.name}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{rsvpPolicyLabel(group.rsvpPolicy)}</span>
            </div>

            {group.description && (
              <p className="font-reading text-base text-base-content/80 leading-relaxed">
                {group.description}
              </p>
            )}

            {group.urls?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {group.urls.map((url) => {
                  let display = url
                  try { display = new URL(url).hostname.replace(/^www\./, '') } catch {}
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-ui text-xs uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                    >
                      <ExternalLink size={10} />
                      {display}
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
            {isLoggedIn && !isOwner && (joined || canJoin) && (
              <button
                onClick={handleJoinToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-ui text-xs uppercase tracking-widest transition-colors ${
                  joined
                    ? 'bg-primary text-primary-content hover:bg-primary/80'
                    : 'border border-base-300 text-base-content/60 hover:border-primary hover:text-primary'
                }`}
              >
                {joined
                  ? <><UserCheck size={12} /> {t('group.joined', { defaultValue: 'Joined' })}</>
                  : needsApproval
                    ? <><UserPlus size={12} /> {t('group.requestJoin', { defaultValue: 'Request to Join' })}</>
                    : <><UserPlus size={12} /> {t('group.join', { defaultValue: 'Join' })}</>
                }
              </button>
            )}
            {isLoggedIn && !isOwner && !joined && !canJoin && (
              <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                {t('group.inviteOnly', { defaultValue: 'Invite only' })}
              </span>
            )}
            {isOwner && (
              <>
                <Link
                  to={`/groups/${encodeURIComponent(group.id)}/pending`}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
                >
                  <Inbox size={12} /> {t('group.pending', { defaultValue: 'Pending' })}
                </Link>
                <Link
                  to={`/groups/${encodeURIComponent(group.id)}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
                >
                  <Pencil size={12} /> {t('common.edit', { defaultValue: 'Edit' })}
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-error/40 font-ui text-xs uppercase tracking-widest text-error/60 hover:border-error hover:text-error disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={12} />
                  {deleting
                    ? t('common.deleting', { defaultValue: 'Deleting\u2026' })
                    : t('common.delete', { defaultValue: 'Delete' })
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-2xl tracking-wide">{t('group.members', { defaultValue: 'Members' })}</h2>
          <div className="flex flex-col gap-0 border-t border-base-300">
            {visibleMembers.map((member) => (
              <Link
                key={member.id}
                to={`/users/${encodeURIComponent(member.id)}`}
                className="flex items-center gap-3 py-3 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
              >
                <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-primary">
                  {member.profile?.icon
                    ? <img loading="lazy" src={sizedUrl(member.profile.icon, 200)} alt={member.name ?? member.displayName} className="w-full h-full object-cover" />
                    : null
                  }
                </div>
                <div className="flex flex-col gap-0 min-w-0">
                  <span className="font-ui text-sm font-bold text-base-content leading-tight">{member.name ?? member.displayName}</span>
                  <span className="font-ui text-xs uppercase tracking-widest text-base-content/50 truncate">{member.id}</span>
                </div>
                {member.id === group.actor?.id && (
                  <span className="ml-auto font-ui text-xs uppercase tracking-widest text-base-content/40 shrink-0">
                    {t('group.owner', { defaultValue: 'Owner' })}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {members.length > MEMBER_PREVIEW && (
            <button
              onClick={() => setShowAllMembers((s) => !s)}
              className="self-start flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:text-primary transition-colors"
            >
              {showAllMembers
                ? <><ChevronUp size={13} /> {t('group.showFewer', { defaultValue: 'Show less' })}</>
                : <><ChevronDown size={13} /> {t('group.showAll', { count: members.length, defaultValue: `All ${members.length} members` })}</>
              }
            </button>
          )}
        </div>
      )}

      {/* Composer — members only, no audience picker */}
      {(isMember || isOwner) && isLoggedIn && (
        <PostComposer
          onPostCreated={() => setRefreshKey((k) => k + 1)}
          initialValues={{ to: id }}
          prompt={t('composer.promptGroup', { name: group?.name ?? '\u2026', defaultValue: `Write a post to ${group?.name ?? '\u2026'}\u2026` })}
        />
      )}

      {/* Posts */}
      <div className="flex flex-col gap-4">
        <TypeFilter onRefresh={() => setRefreshKey((k) => k + 1)} />
        <PostList onDeleted={removeItem}
          posts={posts}
          loading={postsLoading}
          error={postsError}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          ignoreTypeFilter
        />
      </div>

    </div>
  )
}
