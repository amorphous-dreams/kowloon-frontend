// UserPostsPage — standalone feed of all posts by a specific user.

import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

const MOCK_USER = {
  id: '@jzellis@kwln.org',
  username: 'jzellis',
  name: 'Joshua Ellis',
  profile: { icon: 'https://picsum.photos/seed/jzellis/400/400' },
}

const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()
const MOCK_POSTS = [
  { id: 'post:1@kwln.org', type: 'Note',    source: 'Just finished reading *The Stars My Destination* for the third time. Still the best science fiction novel ever written, no notes.', published: H(1),  visibility: 'Public', attributedTo: MOCK_USER },
  { id: 'post:2@kwln.org', type: 'Article', name: 'On the Aesthetics of Midcentury Design', source: 'Reid Miles understood that negative space is content.', published: H(10), visibility: 'Public', attributedTo: MOCK_USER },
  { id: 'post:3@kwln.org', type: 'Link',    name: 'The Internet We Lost', source: 'Everything I loved about the early web is still there.', href: 'https://example.com/internet-we-lost', published: H(36), visibility: 'Public', attributedTo: MOCK_USER },
]

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

  const [user, setUser]   = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!client) {
      setUser(MOCK_USER)
      setPosts(MOCK_POSTS)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [userRes, postsRes] = await Promise.all([
        client.feeds.getUser({ userId: id }),
        client.feeds.getUserPosts({ userId: id }),
      ])

      const raw = userRes?.item ?? userRes
      const normalized = {
        id: raw?.id ?? raw?.actorId,
        username: raw?.preferredUsername ?? raw?.username,
        name: raw?.name ?? raw?.preferredUsername ?? raw?.username,
        profile: { icon: raw?.icon ?? raw?.profile?.icon },
      }
      setUser(normalized)

      const attributedTo = {
        id: normalized.id,
        name: normalized.name,
        username: normalized.username,
        icon: normalized.profile?.icon,
      }
      const rawPosts = postsRes?.orderedItems ?? postsRes ?? []
      setPosts(rawPosts.map((p) => ({
        ...p,
        attributedTo: p.attributedTo ?? attributedTo,
        published: p.published ?? p.publishedAt ?? p.createdAt,
        visibility: p.visibility ?? (p.to === '@public' ? 'Public' : p.to?.startsWith('@') ? 'Server' : 'Audience'),
      })))
    } catch (err) {
      setError(err.message || 'Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />

  const displayName = user?.name ?? id

  return (
    <div className="flex flex-col gap-6">

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

      <PostList posts={posts} />

    </div>
  )
}
