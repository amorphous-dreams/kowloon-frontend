// UserCirclesPage — circles belonging to a user visible to the current viewer.
// Backend only returns circles to the owner; everyone else sees an empty state.

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Copy } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import sizedUrl from '../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function CircleCard({ circle, isOwner, onCopy }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-4 py-5 border-b border-base-300 group">
      <Link to={`/circles/${encodeURIComponent(circle.id)}`} className="shrink-0 mt-1">
        {circle.icon
          ? <img loading="lazy" src={sizedUrl(circle.icon, 200)} alt={circle.name} className="w-14 h-14 object-cover" style={hexMask} />
          : <div className="w-14 h-14 bg-secondary flex items-center justify-center" style={hexMask}>
              <CircleIcon type="circle" size="lg" className="opacity-70 text-secondary-content" />
            </div>
        }
      </Link>

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              to={`/circles/${encodeURIComponent(circle.id)}`}
              className="font-display text-2xl tracking-wide leading-none hover:text-primary transition-colors"
            >
              {circle.name}
            </Link>
            <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-base-content/60">
              <span>{(circle.memberCount ?? 0).toLocaleString()} {t('circle.members', { defaultValue: 'members' })}</span>
              {(circle.reactCount ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span>{circle.reactCount} {t('circle.reacts', { defaultValue: 'reacts' })}</span>
                </>
              )}
              {circle.to && circle.to !== '@public' && (
                <>
                  <span>·</span>
                  <span className="opacity-60">{circle.to === '@server' ? 'Server only' : 'Private'}</span>
                </>
              )}
            </div>
          </div>

          {!isOwner && (
            <button
              onClick={() => onCopy(circle)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
              <Copy size={12} /> {t('circle.copy', { defaultValue: 'Copy' })}
            </button>
          )}
        </div>

        {circle.summary && (
          <p className="font-reading text-base text-base-content/75 leading-relaxed line-clamp-2">
            {circle.summary}
          </p>
        )}
      </div>
    </div>
  )
}

export default function UserCirclesPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const client = useClient()
  const navigate = useNavigate()
  const authUser = useSelector((state) => state.auth.user)

  const isOwner = authUser?.id === decodeURIComponent(id)

  const [user, setUser]           = useState(null)
  const [circles, setCircles]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const loadUser = useCallback(async () => {
    if (!client) return
    try {
      const res = await client.feeds.http.get(`/users/${encodeURIComponent(id)}`)
      setUser(res?.item ?? res)
    } catch {
      // non-fatal — back link will just show generic label
    }
  }, [client, id])

  const loadCircles = useCallback(async (p = 1) => {
    if (!client || !isOwner) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getUserCircles({ userId: decodeURIComponent(id), page: p })
      setCircles(res?.orderedItems ?? [])
      const total = res?.totalItems ?? 0
      const perPage = res?.itemsPerPage ?? 20
      setTotalItems(total)
      setTotalPages(Math.max(1, Math.ceil(total / perPage)))
    } catch (err) {
      setError(err.message || 'Failed to load circles.')
    } finally {
      setLoading(false)
    }
  }, [client, id, isOwner])

  useEffect(() => { loadUser() }, [loadUser])
  useEffect(() => { loadCircles(page) }, [loadCircles, page])

  const displayName = user?.profile?.name ?? user?.name ?? user?.username ?? decodeURIComponent(id)

  const handleCopy = (circle) => {
    navigate('/circles/new', {
      state: {
        name: circle.name,
        description: circle.summary,
        icon: circle.icon ?? null,
        to: '@public',
        members: [],
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + heading */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/users/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {displayName}
        </Link>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-4xl leading-none tracking-wide">
              {t('circle.circles', { defaultValue: 'Circles' })}
            </h1>
            {isOwner && totalItems > 0 && !loading && (
              <p className="font-ui text-sm uppercase tracking-widest text-base-content/50 mt-1">
                {totalItems.toLocaleString()} {t('circles.total', { defaultValue: 'circles' })}
              </p>
            )}
          </div>
          {isOwner && (
            <Link
              to="/circles/new"
              state={{ to: '@public' }}
              className="px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors shrink-0"
            >
              {t('circle.create', { defaultValue: 'Create Circle' })}
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {!isOwner ? (
        <EmptyState message={t('circles.private', { defaultValue: "This user's circles are only visible to them." })} />
      ) : loading ? (
        <Spinner centered />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadCircles(page)} />
      ) : circles.length === 0 ? (
        <EmptyState message={t('circles.empty', { defaultValue: 'No circles yet.' })} />
      ) : (
        <>
          <div className="flex flex-col">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                isOwner={isOwner}
                onCopy={handleCopy}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-2">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

    </div>
  )
}
