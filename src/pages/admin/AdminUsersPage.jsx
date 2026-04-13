// AdminUsersPage — list, soft-delete, and restore users.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, RotateCcw } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminUsersPage() {
  const client = useClient()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState('active') // active | deleted | all
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const params = { page }
      if (filter === 'deleted') params.deleted = 'true'
      else if (filter === 'all') params.deleted = 'include'
      const res = await client.admin.getUsers(params)
      setUsers(res?.orderedItems ?? [])
      setTotal(res?.totalItems ?? 0)
    } catch (err) {
      if (err?.status === 403 || err?.statusCode === 403) setDenied(true)
    } finally {
      setLoading(false)
    }
  }, [client, filter, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (userId) => {
    if (!confirm('Soft-delete this user?')) return
    setPending(userId)
    try {
      await client.admin.deleteUser({ userId })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, deletedAt: new Date().toISOString(), active: false } : u))
    } catch {}
    setPending(null)
  }

  const handleRestore = async (userId) => {
    setPending(userId)
    try {
      await client.admin.restoreUser({ userId })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, deletedAt: null, active: true } : u))
    } catch {}
    setPending(null)
  }

  if (denied) return (
    <div className="py-16 text-center">
      <p className="font-display text-3xl tracking-wide">Access Denied</p>
    </div>
  )

  const FILTERS = [['active', 'Active'], ['deleted', 'Deleted'], ['all', 'All']]
  const limit = 20
  const pages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-base-300 pb-4 mb-6">
        <h1 className="font-display text-5xl tracking-wide">Users</h1>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">{total} total</span>
      </div>

      <div className="flex gap-0 mb-6">
        {FILTERS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setFilter(val); setPage(1) }}
            className={`px-4 py-2 font-ui text-xs uppercase tracking-widest border-r border-base-300 last:border-r-0 transition-colors ${
              filter === val ? 'bg-secondary text-secondary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner centered /> : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-base-300">
                {['Username', 'Display Name', 'ID', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left pb-2 pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-base-300 hover:bg-base-200 ${u.deletedAt ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 font-ui text-sm">
                    <Link to={`/users/${encodeURIComponent(u.id)}`} className="hover:text-primary transition-colors">
                      @{u.username}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-ui text-sm">{u.profile?.name ?? '—'}</td>
                  <td className="py-3 pr-4 font-ui text-xs text-base-content/50 max-w-32 truncate">{u.id}</td>
                  <td className="py-3 pr-4 font-ui text-xs text-base-content/50 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-ui text-xs uppercase tracking-widest px-2 py-0.5 ${u.deletedAt ? 'bg-error/15 text-error' : 'bg-success/15 text-success'}`}>
                      {u.deletedAt ? 'Deleted' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {u.deletedAt ? (
                      <button
                        onClick={() => handleRestore(u.id)}
                        disabled={pending === u.id}
                        className="p-1 text-base-content/40 hover:text-success transition-colors disabled:opacity-30"
                        title="Restore"
                      >
                        <RotateCcw size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={pending === u.id}
                        className="p-1 text-base-content/40 hover:text-error transition-colors disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center font-ui text-xs uppercase tracking-widest text-base-content/40">No users found</td></tr>
              )}
            </tbody>
          </table>

          {pages > 1 && (
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="font-ui text-xs uppercase tracking-widest px-3 py-1.5 border border-base-300 disabled:opacity-30 hover:bg-base-200 transition-colors">
                Prev
              </button>
              <span className="font-ui text-xs text-base-content/50">{page} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="font-ui text-xs uppercase tracking-widest px-3 py-1.5 border border-base-300 disabled:opacity-30 hover:bg-base-200 transition-colors">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
