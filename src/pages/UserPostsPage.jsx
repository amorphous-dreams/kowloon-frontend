// UserPostsPage — standalone feed of all posts by a specific user.
// Mirrors /users/:id but feed-only — useful for direct links and embeds.

import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

const MOCK_USER = {
  id: '@jzellis@kwln.org',
  username: 'jzellis',
  displayName: 'Joshua Ellis',
  profile: { icon: 'https://picsum.photos/seed/jzellis/400/400' },
}

const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()

const MOCK_POSTS = [
  {
    id: 'post:1@kwln.org',
    type: 'Note',
    source: 'Just finished reading *The Stars My Destination* for the third time. Still the best science fiction novel ever written, no notes.',
    published: H(1),
    visibility: 'Public',
    attributedTo: MOCK_USER,
  },
  {
    id: 'post:2@kwln.org',
    type: 'Article',
    name: 'On the Aesthetics of Midcentury Design',
    source: 'Reid Miles understood that negative space is content — that what you leave out is as important as what you put in. Every Blue Note sleeve is a lesson in editorial restraint.',
    published: H(10),
    visibility: 'Public',
    attributedTo: MOCK_USER,
  },
  {
    id: 'post:3@kwln.org',
    type: 'Media',
    name: 'New track: "Wanchai Drift"',
    source: 'Recorded this late last night. Somewhere between jazz and something else entirely.',
    published: H(24),
    visibility: 'Public',
    attributedTo: MOCK_USER,
    attachments: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/WPGC_-_Jingle_%22Bright_New_Sound%22.ogg', mediaType: 'audio/ogg', name: 'Wanchai Drift' }],
  },
  {
    id: 'post:4@kwln.org',
    type: 'Link',
    name: 'The Internet We Lost',
    source: 'Everything I loved about the early web is still there — it just takes longer to find.',
    href: 'https://example.com/internet-we-lost',
    published: H(36),
    visibility: 'Public',
    attributedTo: MOCK_USER,
  },
  {
    id: 'post:5@kwln.org',
    type: 'Event',
    name: 'Kowloon Demo Night',
    source: "Come see what we've been building. Drinks provided.",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    location: 'The Backroom, Dalston',
    published: H(48),
    visibility: 'Public',
    attributedTo: MOCK_USER,
  },
]

function TypeFilter() {
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
            className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${
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
    </div>
  )
}

export default function UserPostsPage() {
  const { id } = useParams()
  const user = MOCK_USER // TODO: fetch by id
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + heading */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/users/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {user.displayName}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('user.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      {/* Type filter */}
      <TypeFilter />

      {/* Posts */}
      <PostList posts={MOCK_POSTS} />

    </div>
  )
}
