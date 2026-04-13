// AdminPostsPage — list, soft-delete, and restore posts.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, RotateCcw, ExternalLink } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import Spinner from '../../components/ui/Spinner'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const TYPE_COLORS = {
  Note: 'bg-[#b76c00]/15 text-[#b76c00]',
  Article: 'bg-[#006893]/15 text-[#006893]',
  Media: 'bg-[#009084]/15 text-[#009084]',
  Link: 'bg-[#417843]/15 text-[#417843]',
  Event: 'bg-[#cc272e]/15 text-[#cc272e]',
}

export default function AdminPostsPage() {
  const client = useClient()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState('active')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    try {
      const params = { page }
      if (filter === 'deleted') params.showDeleted = true
      const res = await client.admin.getPosts(params)
      setPosts(res?.orderedItems ?? [])
      setTotal(res?.totalItems ?? 0)
    } catch (err) {
      if (err?.status === 403 || err?.statusCode === 403) setDenied(true)
    } finally {
      setLoading(false)
    }
  }, [client, filter, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (postId) => {
    if (!confirm('Soft-delete this post?')) return
    setPending(postId)
    try {
      await client.admin.deletePost({ postId })
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, deletedAt: new Date().toISOString() } : p))
    } catch {}
    setPending(null)
  }

  const handleRestore = async (postId) => {
    setPending(postId)
    try {
      await client.admin.restorePost({ postId })
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, deletedAt: null } : p))
    } catch {}
    setPending(null)
  }

  if (denied) return (
    <div className="py-16 text-center"><p className="font-display text-3xl tracking-wide">Access Denied</p></div>
  )

  const FILTERS = [['active', 'Active'], ['deleted', 'Deleted']]
  const limit = 20
  const pages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-base-300 pb-4 mb-6">
        <h1 className="font-display text-5xl tracking-wide">Posts</h1>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">{total} total</span>
      </div>

      <div className="flex gap-0 mb-6">
        {FILTERS.map(([val, label]) => (
          <button key={val} onClick={() => { setFilter(val); setPage(1) }}
            className={`px-4 py-2 font-ui text-xs uppercase tracking-widest border-r border-base-300 last:border-r-0 transition-colors ${
              filter === val ? 'bg-secondary text-secondary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner centered /> : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-base-300">
                {['Type', 'Title / Content', 'Author', 'Date', 'Visibility', ''].map((h) => (
                  <th key={h} className="font-ui text-xs uppercase tracking-widest text-base-content/50 text-left pb-2 pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className={`border-b border-base-300 hover:bg-base-200 ${p.deletedAt ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <span className={`font-ui text-xs uppercase tracking-widest px-2 py-0.5 ${TYPE_COLORS[p.type] ?? 'bg-base-200 text-base-content/60'}`}>
                      {p.type ?? '?'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 max-w-xs">
                    <Link to={`/posts/${encodeURIComponent(p.id)}`} className="hover:text-primary transition-colors">
                      <span className="font-ui text-sm line-clamp-1">
                        {p.title ?? p.name ?? p.summary ?? p.body?.replace(/<[^>]+>/g, '').slice(0, 60) ?? p.id}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-ui text-xs text-base-content/50 max-w-28 truncate">{p.actorId}</td>
                  <td className="py-3 pr-4 font-ui text-xs text-base-content/50 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">{p.to ?? '—'}</span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <Link to={`/posts/${encodeURIComponent(p.id)}`} className="p-1 text-base-content/30 hover:text-base-content transition-colors inline-block mr-1" title="View">
                      <ExternalLink size={13} />
                    </Link>
                    {p.deletedAt ? (
                      <button onClick={() => handleRestore(p.id)} disabled={pending === p.id}
                        className="p-1 text-base-content/40 hover:text-success transition-colors disabled:opacity-30" title="Restore">
                        <RotateCcw size={14} />
                      </button>
                    ) : (
                      <button onClick={() => handleDelete(p.id)} disabled={pending === p.id}
                        className="p-1 text-base-content/40 hover:text-error transition-colors disabled:opacity-30" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center font-ui text-xs uppercase tracking-widest text-base-content/40">No posts found</td></tr>
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
