// GroupPage — group detail, member list, composer, and post feed.
// PostComposer shown for members only. Edit/Delete for owner only.

import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { MapPin, ExternalLink, Users, UserPlus, UserCheck, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostList from '../components/posts/PostList'
import PostComposer from '../components/posts/PostComposer'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import CircleIcon from '../components/ui/CircleIcon'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { toggleType, clearTypes } from '../app/feedSlice'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const POLICY_LABELS = {
  open:           'Open — anyone can join',
  serverOpen:     'Server members',
  serverApproval: 'Approval required',
  approvalOnly:   'By invitation',
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_GROUP = {
  id: 'group:jazz@kwln.org',
  name: 'London Jazz Society',
  icon: 'https://picsum.photos/seed/jazzgroup/200/200',
  description: 'A community for jazz lovers in London and beyond. Live music listings, recordings, discussion, and the occasional argument about whether fusion counts.',
  location: { name: 'London, UK' },
  memberCount: 214,
  urls: ['https://londonjazzsociety.co.uk'],
  rsvpPolicy: 'open',
  attributedTo: {
    id: '@recordhead@kwln.org',
    username: 'recordhead',
    displayName: 'Record Head',
    profile: { icon: 'https://picsum.photos/seed/recordhead/200/200' },
  },
  members: [
    { id: '@jzellis@kwln.org',      username: 'jzellis',      displayName: 'Joshua Ellis',    profile: { icon: 'https://picsum.photos/seed/jzellis/200/200' } },
    { id: '@recordhead@kwln.org',   username: 'recordhead',   displayName: 'Record Head',     profile: { icon: 'https://picsum.photos/seed/recordhead/200/200' } },
    { id: '@milesahead@kwln.org',   username: 'milesahead',   displayName: 'Miles Ahead',     profile: { icon: 'https://picsum.photos/seed/milesahead/200/200' } },
    { id: '@bluebird@kwln.org',     username: 'bluebird',     displayName: 'Bluebird Parker', profile: { icon: 'https://picsum.photos/seed/bluebird/200/200' } },
    { id: '@trane@kwln.org',        username: 'trane',        displayName: 'A. Trane',        profile: { icon: 'https://picsum.photos/seed/trane/200/200' } },
    { id: '@mingusmouth@kwln.org',  username: 'mingusmouth',  displayName: 'Mingus Mouth',    profile: { icon: 'https://picsum.photos/seed/mingusmouth/200/200' } },
    { id: '@voiceofeve@kwln.org',   username: 'voiceofeve',   displayName: 'Eve Cassidy-Reed', profile: { icon: 'https://picsum.photos/seed/voiceofeve/200/200' } },
    { id: '@waxpoetic@kwln.org',    username: 'waxpoetic',    displayName: 'Wax Poetic',      profile: { icon: 'https://picsum.photos/seed/waxpoetic/200/200' } },
  ],
}

const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()

const AUTHOR  = MOCK_GROUP.attributedTo
const AUTHOR2 = { id: '@jzellis@kwln.org', username: 'jzellis', displayName: 'Joshua Ellis', profile: { icon: 'https://picsum.photos/seed/jzellis/200/200' } }
const AUTHOR3 = { id: '@milesahead@kwln.org', username: 'milesahead', displayName: 'Miles Ahead', profile: { icon: 'https://picsum.photos/seed/milesahead/200/200' } }

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
    source: "Kind of Blue didn't just change jazz — it changed how musicians think about harmony. Fifty years on, it's still the best-selling jazz album ever recorded.",
    published: H(36),
    visibility: 'Public',
    attributedTo: AUTHOR3,
  },
  {
    id: 'post:med1@kwln.org',
    type: 'Media',
    name: 'Live at The Vortex — "Autumn Leaves"',
    source: 'Recorded last Thursday. Rough mix, but you can hear where it\'s going.',
    published: H(48),
    visibility: 'Public',
    attributedTo: AUTHOR2,
    attachments: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/WPGC_-_Jingle_%22Bright_New_Sound%22.ogg', mediaType: 'audio/ogg', name: 'Autumn Leaves' }],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GroupPage() {
  const { id } = useParams()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const { t } = useTranslation()

  const [group, setGroup]   = useState(null)
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [joined, setJoined] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)

  const containerRef = useRef(null)
  const [shadowProgress, setShadowProgress] = useState(0)

  const load = useCallback(async () => {
    if (!client) {
      setGroup(MOCK_GROUP)
      setPosts(MOCK_POSTS)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [groupRes, postsRes] = await Promise.all([
        client.feeds.getGroup({ groupId: id }),
        client.feeds.getGroupPosts({ groupId: id }),
      ])
      setGroup(groupRes)
      setPosts(postsRes?.orderedItems ?? [])
      if (authUser && groupRes?.members) {
        setJoined(groupRes.members.some((m) => m.id === authUser.id))
      }
    } catch (err) {
      setError(err.message || 'Failed to load group.')
    } finally {
      setLoading(false)
    }
  }, [client, id, authUser])

  useEffect(() => { load() }, [load])

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

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!group)  return null

  const isLoggedIn      = !!authUser
  const isOwner         = authUser && group.attributedTo?.id === authUser.id
  const isMember        = joined || (authUser && group.members?.some((m) => m.id === authUser.id))
  const needsApproval   = group.rsvpPolicy === 'restricted'

  const MEMBER_PREVIEW = 5
  const visibleMembers = showAllMembers ? group.members : group.members.slice(0, MEMBER_PREVIEW)

  return (
    <div ref={containerRef} className="flex flex-col gap-8">

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
            ? <img src={group.icon} alt={group.name} className="w-20 h-20 object-cover shrink-0" style={hexMask} />
            : <div className="w-20 h-20 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
                <CircleIcon type="group" size="lg" className="text-secondary-content opacity-70" />
              </div>
          }

          {/* Name + meta */}
          <div className="flex flex-col gap-2 min-w-0 pt-1 flex-1">
            <h1 className="font-display text-4xl leading-none tracking-wide">{group.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs uppercase tracking-widest text-base-content/60">
              <Link
                to={`/users/${encodeURIComponent(group.attributedTo.id)}`}
                className="font-bold hover:text-primary transition-colors"
              >
                {group.attributedTo.name ?? group.attributedTo.displayName}
              </Link>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={10} />
                {group.memberCount.toLocaleString()} {t('group.members', { defaultValue: 'members' })}
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
              <span>{POLICY_LABELS[group.rsvpPolicy] ?? group.rsvpPolicy}</span>
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
            {isLoggedIn && !isOwner && (
              <button
                onClick={async () => {
                  if (!client) { setJoined((j) => !j); return }
                  try {
                    if (joined) {
                      await client.activities.leaveGroup({ groupId: id })
                    } else {
                      await client.activities.joinGroup({ groupId: id })
                    }
                    setJoined((j) => !j)
                  } catch {}
                }}
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
            {isOwner && (
              <>
                <Link
                  to={`/groups/${encodeURIComponent(group.id)}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
                >
                  <Pencil size={12} /> {t('common.edit', { defaultValue: 'Edit' })}
                </Link>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-error/40 font-ui text-xs uppercase tracking-widest text-error/60 hover:border-error hover:text-error transition-colors">
                  <Trash2 size={12} /> {t('common.delete', { defaultValue: 'Delete' })}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl tracking-wide">{t('group.members', { defaultValue: 'Members' })}</h2>
        <div className="flex flex-col gap-0 border-t border-base-300">
          {visibleMembers.map((member) => (
            <Link
              key={member.id}
              to={`/users/${encodeURIComponent(member.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
            >
              <div
                className="w-8 h-8 shrink-0 bg-primary"
                style={hexMask}
              >
                {member.profile?.icon
                  ? <img src={member.profile.icon} alt={member.name ?? member.displayName} className="w-full h-full object-cover" />
                  : null
                }
              </div>
              <div className="flex flex-col gap-0 min-w-0">
                <span className="font-ui text-sm font-bold text-base-content leading-tight">{member.name ?? member.displayName}</span>
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/50 truncate">{member.id}</span>
              </div>
              {member.id === group.attributedTo.id && (
                <span className="ml-auto font-ui text-xs uppercase tracking-widest text-base-content/40 shrink-0">
                  {t('group.owner', { defaultValue: 'Owner' })}
                </span>
              )}
            </Link>
          ))}
        </div>

        {group.members.length > MEMBER_PREVIEW && (
          <button
            onClick={() => setShowAllMembers((s) => !s)}
            className="self-start flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:text-primary transition-colors"
          >
            {showAllMembers
              ? <><ChevronUp size={13} /> {t('group.showFewer', { defaultValue: 'Show less' })}</>
              : <><ChevronDown size={13} /> {t('group.showAll', { count: group.members.length, defaultValue: `All ${group.members.length} members` })}</>
            }
          </button>
        )}
      </div>

      {/* Composer — members only, no audience picker */}
      {(joined || isMember || isOwner) && isLoggedIn && (
        <PostComposer />
      )}

      {/* Posts */}
      <div className="flex flex-col gap-4">
        <TypeFilter />
        <PostList posts={MOCK_POSTS} />
      </div>

    </div>
  )
}
