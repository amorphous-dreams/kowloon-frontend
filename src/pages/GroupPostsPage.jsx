// GroupPostsPage — standalone feed of posts in a group.
// Mirrors GroupPage feed — useful for direct links and sharing.

import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

const MOCK_GROUP = {
  id: 'group:jazz@kwln.org',
  name: 'London Jazz Society',
}

const AUTHOR  = { id: '@recordhead@kwln.org', username: 'recordhead', displayName: 'Record Head',  profile: { icon: 'https://picsum.photos/seed/recordhead/200/200' } }
const AUTHOR2 = { id: '@jzellis@kwln.org',    username: 'jzellis',    displayName: 'Joshua Ellis', profile: { icon: 'https://picsum.photos/seed/jzellis/200/200' } }
const AUTHOR3 = { id: '@milesahead@kwln.org',  username: 'milesahead', displayName: 'Miles Ahead',  profile: { icon: 'https://picsum.photos/seed/milesahead/200/200' } }
const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()

const MOCK_POSTS = [
  {
    id: 'post:26@kwln.org',
    type: 'Event',
    name: 'Blue Note at The Jazz Cafe',
    source: 'A night of classic Blue Note repertoire performed live by the Blue Note Collective. Two sets. No support act. Come early for a seat.',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    endTime:   new Date(Date.now() + 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 60 * 3).toISOString(),
    location:  { type: 'Place', name: 'The Jazz Cafe, Camden Town, London' },
    published: H(6),
    visibility: 'Public',
    attributedTo: AUTHOR,
  },
  {
    id: 'post:3@kwln.org',
    type: 'Link',
    name: 'Blue Note Records: The Complete Discography',
    source: 'An absolutely essential resource. Every cover, every session date, every pressing.',
    href: 'https://www.discogs.com/label/3073-Blue-Note-Records',
    published: H(12),
    visibility: 'Public',
    attributedTo: AUTHOR,
  },
  {
    id: 'post:note1@kwln.org',
    type: 'Note',
    source: "Anyone catch Empirical at Ronnie's last night? That set in the second half was something else entirely.",
    published: H(20),
    visibility: 'Public',
    attributedTo: AUTHOR2,
  },
  {
    id: 'post:art1@kwln.org',
    type: 'Article',
    name: 'The Modal Revolution: Miles Davis and the Birth of Cool',
    source: "Kind of Blue didn't just change jazz — it changed how musicians think about harmony.",
    published: H(36),
    visibility: 'Public',
    attributedTo: AUTHOR3,
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

export default function GroupPostsPage() {
  const { id } = useParams()
  const group = MOCK_GROUP // TODO: fetch by id
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + heading */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/groups/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {group.name}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('group.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      {/* Type filter */}
      <TypeFilter />

      {/* Posts */}
      <PostList posts={MOCK_POSTS} />

    </div>
  )
}
