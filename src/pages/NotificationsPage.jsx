// NotificationsPage — user notifications: mentions, reacts, follows, invites.
// Authenticated users only.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { AtSign, Heart, UserPlus, Users, Bell, X, Check, CheckCheck } from 'lucide-react'
import Timestamp from '../components/ui/Timestamp'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

// ── Mock fallback ─────────────────────────────────────────────────────────────

const H = (n) => new Date(Date.now() - 1000 * 60 * n).toISOString()
const ACTOR_R = { id: '@recordhead@kwln.org',  username: 'recordhead',  displayName: 'Record Head',     profile: { icon: 'https://picsum.photos/seed/recordhead/200/200' } }
const ACTOR_M = { id: '@milesahead@kwln.org',  username: 'milesahead',  displayName: 'Miles Ahead',     profile: { icon: 'https://picsum.photos/seed/milesahead/200/200' } }
const ACTOR_B = { id: '@bluebird@kwln.org',    username: 'bluebird',    displayName: 'Bluebird Parker', profile: { icon: 'https://picsum.photos/seed/bluebird/200/200' } }
const ACTOR_C = { id: '@cityhacker@kwln.org',  username: 'cityhacker',  displayName: 'City Hacker',     profile: { icon: 'https://picsum.photos/seed/cityhacker/200/200' } }

const MOCK_NOTIFICATIONS = [
  { id: 'notif:1', type: 'mention',      actor: ACTOR_R, published: H(12),  read: false, context: { postId: 'post:note1@kwln.org', excerpt: "@jzellis you make a compelling case but I think you're missing the influence of Swiss typography." } },
  { id: 'notif:2', type: 'react',        actor: ACTOR_M, published: H(35),  read: false, context: { postId: 'post:2@kwln.org', excerpt: 'On the Aesthetics of Midcentury Design' } },
  { id: 'notif:3', type: 'follow',       actor: ACTOR_B, published: H(72),  read: false, context: null },
  { id: 'notif:4', type: 'react',        actor: ACTOR_C, published: H(120), read: true,  context: { postId: 'post:1@kwln.org', excerpt: 'The Stars My Destination is still the best science fiction novel ever written, no notes.' } },
  { id: 'notif:5', type: 'circle_invite', actor: ACTOR_R, published: H(180), read: true, context: { circleId: 'circle:jazz@kwln.org', circleName: 'Jazz & Improvised Music' } },
  { id: 'notif:6', type: 'group_invite',  actor: ACTOR_M, published: H(300), read: true, context: { groupId: 'group:jazz@kwln.org', groupName: 'London Jazz Society' } },
]

const FILTER_TYPES = ['all', 'mention', 'react', 'follow', 'circle_invite', 'group_invite']

const NOTIF_ICONS = {
  mention:       <AtSign   size={14} />,
  react:         <Heart    size={14} />,
  follow:        <UserPlus size={14} />,
  circle_invite: <Users    size={14} />,
  group_invite:  <Users    size={14} />,
}

const NOTIF_COLORS = {
  mention:       'text-primary',
  react:         'text-error',
  follow:        'text-success',
  circle_invite: 'text-secondary',
  group_invite:  'text-secondary',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotifBody({ notif }) {
  const { t } = useTranslation()
  const actor = notif.actor
  const ctx = notif.context
  const actorLink = (
    <Link to={`/users/${encodeURIComponent(actor.id)}`} className="font-bold hover:text-primary transition-colors">
      {actor.displayName}
    </Link>
  )
  switch (notif.type) {
    case 'mention': return (
      <p className="font-ui text-sm text-base-content/80 leading-snug">
        {actorLink} {t('notif.mentioned', { defaultValue: 'mentioned you in a post' })}
        {ctx?.excerpt && <Link to={`/posts/${encodeURIComponent(ctx.postId)}`} className="block font-reading text-xs text-base-content/60 mt-1 italic hover:text-primary transition-colors">"{ctx.excerpt}"</Link>}
      </p>
    )
    case 'react': return (
      <p className="font-ui text-sm text-base-content/80 leading-snug">
        {actorLink} {t('notif.reacted', { defaultValue: 'reacted to' })}{' '}
        {ctx?.postId ? <Link to={`/posts/${encodeURIComponent(ctx.postId)}`} className="font-reading italic hover:text-primary transition-colors">{ctx.excerpt}</Link> : t('notif.yourPost', { defaultValue: 'your post' })}
      </p>
    )
    case 'follow': return <p className="font-ui text-sm text-base-content/80 leading-snug">{actorLink} {t('notif.followed', { defaultValue: 'followed you' })}</p>
    case 'circle_invite': return (
      <p className="font-ui text-sm text-base-content/80 leading-snug">
        {actorLink} {t('notif.circleInvite', { defaultValue: 'added you to' })}{' '}
        {ctx?.circleId ? <Link to={`/circles/${encodeURIComponent(ctx.circleId)}`} className="font-bold hover:text-primary transition-colors">{ctx.circleName}</Link> : t('notif.aCircle', { defaultValue: 'a circle' })}
      </p>
    )
    case 'group_invite': return (
      <p className="font-ui text-sm text-base-content/80 leading-snug">
        {actorLink} {t('notif.groupInvite', { defaultValue: 'invited you to join' })}{' '}
        {ctx?.groupId ? <Link to={`/groups/${encodeURIComponent(ctx.groupId)}`} className="font-bold hover:text-primary transition-colors">{ctx.groupName}</Link> : t('notif.aGroup', { defaultValue: 'a group' })}
      </p>
    )
    default: return null
  }
}

function NotifCard({ notif, onMarkRead, onDismiss }) {
  const iconClass = NOTIF_COLORS[notif.type] ?? 'text-base-content/60'
  return (
    <div className={`flex items-start gap-3 py-4 border-b border-base-300 group transition-colors ${notif.read ? 'opacity-60' : ''}`}>
      <div className={`shrink-0 mt-1 ${iconClass}`}>{NOTIF_ICONS[notif.type] ?? <Bell size={14} />}</div>
      <div className="shrink-0"><UserAvatar user={notif.actor} size="sm" /></div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <NotifBody notif={notif} />
        <Timestamp date={notif.published} />
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.read && (
          <button onClick={() => onMarkRead(notif.id)} title="Mark as read" className="p-1.5 text-base-content/40 hover:text-primary transition-colors"><Check size={13} /></button>
        )}
        <button onClick={() => onDismiss(notif.id)} title="Dismiss" className="p-1.5 text-base-content/40 hover:text-error transition-colors"><X size={13} /></button>
      </div>
      {!notif.read && <div className="w-2 h-2 bg-primary shrink-0 mt-2" />}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [notifications, setNotifications] = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!client) {
      setNotifications(MOCK_NOTIFICATIONS)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await client.notifications.list()
      setNotifications(res?.orderedItems ?? res ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    if (client) await client.notifications.markRead({ notificationId: id }).catch(() => {})
  }

  const dismiss = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (client) await client.notifications.dismiss({ notificationId: id }).catch(() => {})
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (client) await client.notifications.markAllRead().catch(() => {})
  }

  const visible = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)
  const unreadCount = notifications.filter((n) => !n.read).length

  const FILTER_LABELS = {
    all:           t('notif.all',           { defaultValue: 'All' }),
    mention:       t('notif.mentions',      { defaultValue: 'Mentions' }),
    react:         t('notif.reacts',        { defaultValue: 'Reacts' }),
    follow:        t('notif.follows',       { defaultValue: 'Follows' }),
    circle_invite: t('notif.circleInvites', { defaultValue: 'Circles' }),
    group_invite:  t('notif.groupInvites',  { defaultValue: 'Groups' }),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between border-b-2 border-base-300 pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-5xl tracking-wide leading-none">{t('notif.title', { defaultValue: 'Notifications' })}</h1>
          {unreadCount > 0 && <p className="font-ui text-sm uppercase tracking-widest text-base-content/50">{unreadCount} {t('notif.unread', { defaultValue: 'unread' })}</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors">
            <CheckCheck size={13} /> {t('notif.markAllRead', { defaultValue: 'Mark all read' })}
          </button>
        )}
      </div>

      <div className="flex items-center gap-0 border-b border-base-300 pb-3 flex-wrap">
        {FILTER_TYPES.map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${filter === type ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'}`}>
            {type !== 'all' && <span className={filter === type ? 'text-primary-content' : (NOTIF_COLORS[type] ?? '')}>{NOTIF_ICONS[type]}</span>}
            {FILTER_LABELS[type]}
          </button>
        ))}
      </div>

      {loading && <Spinner centered />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && visible.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-ui text-sm uppercase tracking-widest text-base-content/40">{t('notif.empty', { defaultValue: 'No notifications.' })}</p>
        </div>
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col">
          {visible.map((notif) => <NotifCard key={notif.id} notif={notif} onMarkRead={markRead} onDismiss={dismiss} />)}
        </div>
      )}
    </div>
  )
}
