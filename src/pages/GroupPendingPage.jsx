// GroupPendingPage — /groups/:id/pending
// Group admins approve or reject pending join requests. Mirrors the mobile
// app/group/[id]/pending.js screen. The list comes from the admins-only
// GET /groups/:id/pending endpoint; approve fires an Add, reject a Reject.

import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { toast } from '../app/toast'
import sizedUrl from '../lib/sizedUrl'

export default function GroupPendingPage() {
  const { id } = useParams()
  const client = useClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.http.get(`/groups/${encodeURIComponent(id)}/pending`)
      setItems(res?.pending || [])
    } catch (e) {
      setError(
        e?.statusCode === 403 || e?.status === 403
          ? t('group.pendingForbidden', { defaultValue: 'Only group admins can see pending requests.' })
          : e?.message || 'Failed to load pending requests.'
      )
    } finally {
      setLoading(false)
    }
  }, [client, id, t])

  useEffect(() => { load() }, [load])

  const approve = async (userId) => {
    if (busyId) return
    setBusyId(userId)
    try {
      await client.activities.approveJoinRequest({ groupId: id, userId })
      setItems((arr) => arr.filter((u) => u.id !== userId))
    } catch (e) {
      toast.error("Couldn't approve", { detail: e?.message })
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (user) => {
    if (busyId) return
    if (!window.confirm(`Reject this request? ${user.name || user.id} won't be added to the group.`)) return
    setBusyId(user.id)
    try {
      await client.activities.rejectJoinRequest({ groupId: id, userId: user.id })
      setItems((arr) => arr.filter((u) => u.id !== user.id))
    } catch (e) {
      toast.error("Couldn't reject", { detail: e?.message })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Spinner centered />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          to={`/groups/${encodeURIComponent(id)}`}
          className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-primary transition-colors self-start"
        >
          {'←'} {t('group.backToGroup', { defaultValue: 'Back to group' })}
        </Link>
        <h1 className="font-display text-4xl tracking-wide">
          {t('group.pendingRequests', { defaultValue: 'Pending Requests' })}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-ui text-lg text-base-content/70 mb-1">
            {t('group.noPending', { defaultValue: 'No pending requests.' })}
          </p>
          <p className="font-ui text-sm text-base-content/50">
            {t('group.noPendingHint', { defaultValue: "When someone asks to join, they'll show up here." })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-t border-base-300">
          {items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3 border-b border-base-300">
              <Link to={`/users/${encodeURIComponent(u.id)}`} className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-primary">
                {(u.profile?.icon || u.icon) && (
                  <img
                    src={sizedUrl(u.profile?.icon || u.icon, 200)}
                    alt={u.name ?? u.id}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </Link>
              <div className="flex flex-col min-w-0 flex-1">
                <Link to={`/users/${encodeURIComponent(u.id)}`} className="font-ui text-sm font-bold text-base-content truncate hover:text-primary transition-colors">
                  {u.name || u.id}
                </Link>
                <span className="font-ui text-xs text-base-content/55 truncate">{u.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => approve(u.id)}
                  disabled={busyId === u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
                >
                  <Check size={13} strokeWidth={2} />
                  {t('group.approve', { defaultValue: 'Approve' })}
                </button>
                <button
                  onClick={() => reject(u)}
                  disabled={busyId === u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-error/40 text-error font-ui text-xs uppercase tracking-widest hover:border-error transition-colors disabled:opacity-40"
                >
                  <X size={13} strokeWidth={1.75} />
                  {t('group.reject', { defaultValue: 'Reject' })}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
