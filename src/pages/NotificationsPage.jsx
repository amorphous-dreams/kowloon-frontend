// NotificationsPage — user notifications: replies, reacts, follows, join requests.
// Authenticated users only.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import { MessageSquare, Heart, UserPlus, Users, Bell, X, Check, CheckCheck } from 'lucide-react'
import Timestamp from '../components/ui/Timestamp'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTER_TYPES = ['all', 'reply', 'react', 'follow', 'new_post', 'join_request', 'join_approved']

const NOTIF_ICONS = {
  reply:         <MessageSquare size={14} />,
  react:         <Heart         size={14} />,
  follow:        <UserPlus      size={14} />,
  new_post:      <Bell          size={14} />,
  join_request:  <Users         size={14} />,
  join_approved: <Users         size={14} />,
}

const NOTIF_COLORS = {
  reply:         'text-primary',
  react:         'text-error',
  follow:        'text-success',
  new_post:      'text-base-content/60',
  join_request:  'text-secondary',
  join_approved: 'text-secondary',
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Renders the notification body using backend-supplied summary + href.
// actorId is used to make the actor name a profile link.
function NotifBody({ notif }) {
  const actorProfileUrl = `/users/${encodeURIComponent(notif.actorId)}`
  // summary is e.g. "Miles Ahead reacted to your post" — we link the actor name portion
  const actorName = notif.actorName || notif.actorId
  const restOfSummary = notif.summary?.replace(actorName, '').trim()

  return (
    <p className="font-ui text-sm text-base-content/80 leading-snug">
      <Link to={actorProfileUrl} className="font-bold hover:text-primary transition-colors">
        {actorName}
      </Link>
      {restOfSummary && <> {restOfSummary}</>}
      {notif.href && (
        <Link to={notif.href.replace(/^https?:\/\/[^/]+/, '')} className="block font-reading text-xs text-base-content/60 mt-1 italic hover:text-primary transition-colors">
          {notif.href.replace(/^https?:\/\/[^/]+/, '')}
        </Link>
      )}
    </p>
  )
}

function NotifCard({ notif, onMarkRead, onDismiss }) {
  const iconClass = NOTIF_COLORS[notif.type] ?? 'text-base-content/60'
  // Build a minimal actor shape for UserAvatar
  const actor = {
    id: notif.actorId,
    username: notif.actorName,
    profile: { icon: notif.actorIcon },
  }
  return (
    <div className={`flex items-start gap-3 py-4 border-b border-base-300 group transition-colors ${notif.read ? 'opacity-60' : ''}`}>
      <div className={`shrink-0 mt-1 ${iconClass}`}>{NOTIF_ICONS[notif.type] ?? <Bell size={14} />}</div>
      <div className="shrink-0"><UserAvatar user={actor} size="sm" /></div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <NotifBody notif={notif} />
        <Timestamp date={notif.createdAt} />
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
    if (!client) { setLoading(false); return }
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
    if (client) await client.notifications.markRead(id).catch(() => {})
  }

  const dismiss = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (client) await client.notifications.dismiss(id).catch(() => {})
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (client) await client.notifications.markAllRead().catch(() => {})
  }

  const visible = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)
  const unreadCount = notifications.filter((n) => !n.read).length

  const FILTER_LABELS = {
    all:           t('notif.all',          { defaultValue: 'All' }),
    reply:         t('notif.replies',      { defaultValue: 'Replies' }),
    react:         t('notif.reacts',       { defaultValue: 'Reacts' }),
    follow:        t('notif.follows',      { defaultValue: 'Follows' }),
    new_post:      t('notif.newPosts',     { defaultValue: 'New Posts' }),
    join_request:  t('notif.joinRequests', { defaultValue: 'Join Requests' }),
    join_approved: t('notif.joinApproved', { defaultValue: 'Approved' }),
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
