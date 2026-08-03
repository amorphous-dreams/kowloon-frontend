// UsersPage — directory of server users with public (and server-only) profiles.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClient } from '../hooks/useClient'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'

function UserCard({ user }) {
  const name = user.profile?.name ?? user.username
  const bio  = user.profile?.description ?? user.profile?.subtitle

  return (
    <Link
      to={`/users/${encodeURIComponent(user.id)}`}
      className="flex items-start gap-4 py-5 border-b border-base-300 hover:bg-base-200 -mx-3 px-3 transition-colors group"
    >
      <div className="shrink-0 mt-0.5">
        <UserAvatar user={user} size="md" />
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-2xl tracking-wide text-base-content group-hover:text-primary transition-colors leading-tight">
            {name}
          </span>
          <span className="font-ui text-xs uppercase tracking-widest text-base-content/45">
            @{user.username}
          </span>
        </div>

        {bio && (
          <p className="font-reading text-sm text-base-content/70 leading-relaxed line-clamp-2">
            {bio}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async (p = 1) => {
    if (!client) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.http.get('/users', { params: { page: p, limit: 20 } })
      setUsers(res?.orderedItems ?? [])
      const total = res?.totalItems ?? 0
      const perPage = res?.itemsPerPage ?? 20
      setTotalPages(Math.max(1, Math.ceil(total / perPage)))
    } catch (err) {
      setError(err.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load(page) }, [load, page])

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={() => load(page)} />

  return (
    <div className="flex flex-col gap-0">

      <div className="border-b-2 border-base-content pb-4 mb-2">
        <h1 className="font-display text-3xl tracking-wide">
          {t('users.title', { defaultValue: 'Members' })}
        </h1>
      </div>

      {users.length === 0 ? (
        <EmptyState message={t('users.empty', { defaultValue: 'No members found.' })} />
      ) : (
        <>
          <div className="flex flex-col gap-0">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

    </div>
  )
}
