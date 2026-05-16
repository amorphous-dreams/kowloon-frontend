// UserPage — profile: avatar, bio, links, stats, public circles, and post feed.

import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Share2, Pencil, ExternalLink } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import AddToCircleButton from '../components/circles/AddToCircleButton'
import sizedUrl from '../lib/sizedUrl'
import { toggleType, clearTypes } from '../app/feedSlice'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: '@jzellis@kwln.org',
  username: 'jzellis',
  name: 'Joshua Ellis',
  profile: {
    name: 'Joshua Ellis',
    description: 'Writer, musician, technologist. Making things on the internet since 1994. Currently building Kowloon.',
    icon: 'https://picsum.photos/seed/jzellis/400/400',
    urls: ['https://jzellis.com', 'https://github.com/jzellis'],
    pronouns: 'he/him',
  },
  postsCount: 312,
  followersCount: 847,
  followingCount: 214,
}

const MOCK_CIRCLES = [
  { id: 'circle:writing@kwln.org',   name: 'Writing',         icon: 'https://picsum.photos/seed/writing55/200/200',  memberCount: 34 },
  { id: 'circle:scifi@kwln.org',     name: 'Science Fiction', icon: 'https://picsum.photos/seed/scifi29/200/200',    memberCount: 22 },
  { id: 'circle:localtech@kwln.org', name: 'London Tech',     icon: 'https://picsum.photos/seed/londontech/200/200', memberCount: 143 },
]

const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()

const MOCK_POSTS = [
  { id: 'post:1@kwln.org', type: 'Note',    source: 'Just finished reading *The Stars My Destination* for the third time. Still the best science fiction novel ever written, no notes.', published: H(1),  visibility: 'Public', attributedTo: MOCK_USER },
  { id: 'post:2@kwln.org', type: 'Article', name: 'On the Aesthetics of Midcentury Design', source: 'Reid Miles understood that negative space is content.', published: H(10), visibility: 'Public', attributedTo: MOCK_USER },
  { id: 'post:3@kwln.org', type: 'Media',   name: 'New track: "Wanchai Drift"', source: 'Recorded this late last night.', published: H(24), visibility: 'Public', attributedTo: MOCK_USER, attachments: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/WPGC_-_Jingle_%22Bright_New_Sound%22.ogg', mediaType: 'audio/ogg', name: 'Wanchai Drift' }] },
  { id: 'post:4@kwln.org', type: 'Link',    name: 'The Internet We Lost', source: 'Everything I loved about the early web is still there.', href: 'https://example.com', published: H(36), visibility: 'Public', attributedTo: MOCK_USER },
]

// ── Sub-components ────────────────────────────────────────────────────────────

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

function TypeFilter() {
  const dispatch = useDispatch()
  const { activeTypes } = useSelector((state) => state.feed)
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-0 border-b border-base-300 pb-3">
      <button onClick={() => dispatch(clearTypes())} className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${activeTypes.length === 0 ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'}`}>
        {t('feed.all')}
      </button>
      {POST_TYPES.map((type) => {
        const active = activeTypes.includes(type)
        return (
          <button key={type} onClick={() => dispatch(toggleType(type))} title={type} className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${active ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'}`}>
            <PostTypeIcon type={type} size="sm" />
            <span className="hidden sm:inline">{t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}</span>
          </button>
        )
      })}
    </div>
  )
}

function CircleChip({ circle }) {
  return (
    <Link to={`/circles/${encodeURIComponent(circle.id)}`} className="flex items-center gap-2 px-3 py-2 border border-base-300 hover:border-primary hover:bg-base-200 transition-colors">
      {circle.icon
        ? <img loading="lazy" src={sizedUrl(circle.icon, 200)} alt={circle.name} className="w-6 h-6 object-cover" style={hexMask} />
        : <CircleIcon type="circle" size="sm" />
      }
      <span className="font-ui text-xs uppercase tracking-widest text-base-content/80">{circle.name}</span>
      <span className="font-ui text-xs uppercase tracking-widest text-base-content/45">{circle.memberCount}</span>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserPage() {
  const { id } = useParams()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const { t } = useTranslation()

  const [user, setUser]         = useState(null)
  const [posts, setPosts]       = useState([])
  const [circles, setCircles]   = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  // follow state kept for legacy API compat but UI now uses AddToCircleButton
  const [isFollowing, setIsFollowing] = useState(false)

  const containerRef = useRef(null)
  const [shadowProgress, setShadowProgress] = useState(0)

  const load = useCallback(async () => {
    if (!client) {
      setUser(MOCK_USER)
      setPosts(MOCK_POSTS)
      setCircles(MOCK_CIRCLES)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [userRes, postsRes, circlesRes, bookmarksRes] = await Promise.all([
        client.feeds.getUser({ userId: id }),
        client.feeds.getUserPosts({ userId: id }),
        client.feeds.getUserCircles({ userId: id }),
        client.feeds.getUserBookmarks({ userId: id, type: 'Bookmark' }).catch(() => null),
      ])

      // Unwrap { item: {...} } envelope and normalize ActivityPub → component shape
      const raw = userRes?.item ?? userRes
      // Prefer the Kowloon @user@domain handle; fall back to id only when it
      // already looks like a handle (id can be the actorId URL in AP shape).
      const looksLikeHandle = (s) => typeof s === 'string' && /^@[^@]+@[^@]+$/.test(s)
      const handle = raw?.handle
        ?? (looksLikeHandle(raw?.id) ? raw.id : null)
        ?? (raw?.preferredUsername && raw?.domain ? `@${raw.preferredUsername}@${raw.domain}` : null)
      const normalized = {
        id: handle ?? raw?.id ?? raw?.actorId,
        handle,
        username: raw?.preferredUsername ?? raw?.username,
        name: raw?.name ?? raw?.preferredUsername ?? raw?.username,
        profile: {
          description: raw?.summary ?? raw?.profile?.description,
          icon: (() => {
            const rawIcon = raw?.icon ?? raw?.profile?.icon
            return typeof rawIcon === 'string' ? rawIcon : (rawIcon?.url ?? null)
          })(),
          pronouns: raw?.profile?.pronouns,
          urls: raw?.profile?.urls ?? (raw?.url ? [raw.url] : []),
        },
        postsCount: raw?.postsCount,
        followersCount: raw?.followersCount,
        followingCount: raw?.followingCount,
      }
      setUser(normalized)

      const fallbackActor = {
        id: normalized.id,
        name: normalized.name,
        icon: normalized.profile?.icon,
      }
      const rawPosts = postsRes?.orderedItems ?? postsRes ?? []
      setPosts(rawPosts.map((p) => ({
        ...p,
        actor: p.actor ?? fallbackActor,
        published: p.published ?? p.publishedAt ?? p.createdAt,
        visibility: p.visibility ?? (p.to === '@public' ? 'Public' : p.to?.startsWith('@') ? 'Server' : 'Audience'),
      })))

      setCircles(circlesRes?.orderedItems ?? circlesRes ?? [])
      setBookmarks((bookmarksRes?.orderedItems ?? bookmarksRes ?? []).slice(0, 5))
    } catch (err) {
      setError(err.message || 'Failed to load user.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let parent = el.parentElement
    while (parent && getComputedStyle(parent).overflowY === 'visible') parent = parent.parentElement
    if (!parent) return
    const handleScroll = () => setShadowProgress(Math.min(parent.scrollTop / 60, 1))
    parent.addEventListener('scroll', handleScroll, { passive: true })
    return () => parent.removeEventListener('scroll', handleScroll)
  }, [])

  const handleFollow = async () => {
    if (!client) { setIsFollowing((f) => !f); return }
    try {
      if (isFollowing) {
        await client.activities.unfollow({ userId: id })
      } else {
        await client.activities.follow({ userId: id })
      }
      setIsFollowing((f) => !f)
    } catch {}
  }

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!user)   return null

  const isOwnProfile = authUser && (authUser.id === user.id || authUser.username === user.username)
  const isLoggedIn   = !!authUser

  return (
    <div ref={containerRef} className="flex flex-col gap-8">

      {/* Sticky profile header */}
      <div
        className="sticky top-0 bg-base-100 z-10 flex flex-col gap-4 pt-6 pb-6 px-4 border-b-2 border-base-300"
        style={{
          filter: `drop-shadow(${shadowProgress * 8}px ${shadowProgress * 8}px ${shadowProgress * 2}px rgba(0,0,0,${(shadowProgress * 0.35).toFixed(3)}))`,
          transform: `translate(${shadowProgress * -3}px, ${shadowProgress * -3}px)`,
        }}
      >
        <div className="flex items-start gap-4">
          <img src={sizedUrl(isOwnProfile ? (authUser.profile?.icon ?? user.profile?.icon) : user.profile?.icon, 400)} alt={user.name} className="w-20 h-20 rounded-full object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div className="flex flex-col gap-2 min-w-0 pt-1 flex-1">
            <h1 className="font-display text-4xl leading-none tracking-wide">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-ui text-xs uppercase tracking-widest text-base-content/65">{user.handle ?? user.id}</span>
              {user.profile?.pronouns && <span className="font-ui text-xs uppercase tracking-widest text-base-content/45">{user.profile.pronouns}</span>}
            </div>
            {(user.postsCount != null || user.followersCount != null) && (
              <div className="flex items-center gap-3 font-ui text-xs uppercase tracking-widest text-base-content/60">
                {user.postsCount != null && <span><strong className="text-base-content">{user.postsCount}</strong> {t('user.posts', { defaultValue: 'posts' })}</span>}
                {user.followersCount != null && <><span className="text-base-content/30">·</span><span><strong className="text-base-content">{user.followersCount}</strong> {t('user.followers', { defaultValue: 'followers' })}</span></>}
                {user.followingCount != null && <><span className="text-base-content/30">·</span><span><strong className="text-base-content">{user.followingCount}</strong> {t('user.following', { defaultValue: 'following' })}</span></>}
              </div>
            )}
            {user.profile?.description && <p className="font-reading text-base text-base-content/80 leading-relaxed">{user.profile.description}</p>}
            {user.profile?.urls?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {user.profile.urls.map((url) => {
                  let display = url
                  try { display = new URL(url).hostname.replace(/^www\./, '') } catch {}
                  return (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-ui text-xs uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
                      <ExternalLink size={10} />{display}
                    </a>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
            {isLoggedIn && !isOwnProfile && (
              <AddToCircleButton user={user} />
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors">
              <Share2 size={12} /> {t('common.share', { defaultValue: 'Share' })}
            </button>
            {isOwnProfile && (
              <Link to="/profile" className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors">
                <Pencil size={12} /> {t('user.editProfile', { defaultValue: 'Edit Profile' })}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Public circles */}
      {circles.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-2xl tracking-wide">{t('circle.circles', { defaultValue: 'Circles' })}</h2>
          <div className="flex flex-wrap gap-2">
            {circles.map((c) => <CircleChip key={c.id} circle={c} />)}
          </div>
        </div>
      )}

      {/* Public bookmarks */}
      {bookmarks.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide">{t('bookmark.bookmarks', { defaultValue: 'Bookmarks' })}</h2>
            <Link
              to={`/users/${encodeURIComponent(user.id)}/bookmarks`}
              className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-primary transition-colors"
            >
              {t('common.viewAll', { defaultValue: 'View all' })} →
            </Link>
          </div>
          <div className="flex flex-col border border-base-300">
            {bookmarks.map((b) => {
              const href = b.href ?? b.target
              return (
                <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-base-300 last:border-b-0 hover:bg-base-200 transition-colors">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-ui text-sm text-primary hover:opacity-70 transition-opacity flex-1 min-w-0 truncate">
                      {b.title}
                    </a>
                  ) : (
                    <span className="font-ui text-sm flex-1 min-w-0 truncate">{b.title}</span>
                  )}
                  {b.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="font-ui text-xs uppercase tracking-widest text-base-content/45 bg-base-300 px-1.5 py-0.5 shrink-0">
                      {tag}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-wide">{t('user.posts', { defaultValue: 'Posts' })}</h2>
        <TypeFilter />
        <PostList posts={posts} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} />
      </div>

    </div>
  )
}
