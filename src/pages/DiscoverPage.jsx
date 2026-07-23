// DiscoverPage — find people and browse popular public Circles.
// First stop after registration; also linked from the nav.
// Shows a one-time welcome banner for newly registered users.

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Search, Heart, X, Loader } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { toast } from '../app/toast'
import CircleIcon from '../components/ui/CircleIcon'
import CopyCircleMenu from '../components/circles/CopyCircleMenu'
import RecShelf from '../components/discover/RecShelf'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import sizedUrl from '../lib/sizedUrl'

const BANNER_KEY = 'kowloon_discover_welcomed'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

// ── HeartButton ───────────────────────────────────────────────────────────────

function HeartButton({ circle, client }) {
  const [reacted, setReacted] = useState(circle.userReacted ?? false)
  const [count, setCount] = useState(circle.reactCount ?? 0)
  const [busy, setBusy] = useState(false)

  const handleReact = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy || reacted || !client) return
    setBusy(true)
    try {
      await client.activities.react({ postId: circle.id, emoji: '❤️', name: 'heart' })
      setReacted(true)
      setCount((n) => n + 1)
    } catch (err) {
      toast.error('Could not react', { detail: err.message })
    }
    setBusy(false)
  }

  return (
    <button
      onClick={handleReact}
      disabled={busy || reacted}
      title={reacted ? 'Liked' : 'Like this circle'}
      className={`flex items-center gap-1 font-ui text-xs transition-colors shrink-0 disabled:cursor-default ${
        reacted ? 'text-error' : 'text-base-content/30 hover:text-error'
      }`}
    >
      <Heart size={14} fill={reacted ? 'currentColor' : 'none'} />
      {count > 0 ? <span>{count}</span> : null}
    </button>
  )
}

// ── CircleCard ────────────────────────────────────────────────────────────────

function CircleCard({ circle, isLoggedIn, client }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-4 py-5 border-b border-base-300 group">
      <Link to={`/circles/${encodeURIComponent(circle.id)}`} className="shrink-0 mt-1">
        {circle.icon ? (
          <img
            loading="lazy"
            src={sizedUrl(circle.icon, 200)}
            alt={circle.name}
            className="w-14 h-14 object-cover"
            style={hexMask}
          />
        ) : (
          <div className="w-14 h-14 bg-secondary flex items-center justify-center" style={hexMask}>
            <CircleIcon type="circle" size="lg" className="opacity-70 text-secondary-content" />
          </div>
        )}
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
              {(circle.actor?.name ?? circle.actor?.displayName) && (
                <>
                  <Link
                    to={`/users/${encodeURIComponent(circle.actorId)}`}
                    className="font-bold hover:text-primary transition-colors"
                  >
                    {circle.actor.name ?? circle.actor.displayName ?? circle.actorId}
                  </Link>
                  <span>·</span>
                </>
              )}
              <span>{circle.memberCount ?? 0} {t('circle.members', { defaultValue: 'members' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn && client && (
              <HeartButton circle={circle} client={client} />
            )}
            {isLoggedIn && (
              <CopyCircleMenu circle={circle} className="opacity-0 group-hover:opacity-100 focus-within:opacity-100" />
            )}
          </div>
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

// ── UserRow ───────────────────────────────────────────────────────────────────

function UserRow({ user }) {
  const displayName = user.profile?.name ?? user.username ?? user.id
  const icon = user.profile?.icon

  return (
    <div className="flex items-center gap-3 py-3 border-b border-base-300">
      {icon ? (
        <img
          src={sizedUrl(icon, 100)}
          alt={displayName}
          className="w-9 h-9 object-cover rounded-full shrink-0"
        />
      ) : (
        <div className="w-9 h-9 bg-base-300 rounded-full shrink-0" />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <Link
          to={`/users/${encodeURIComponent(user.id)}`}
          className="font-ui text-sm font-semibold hover:text-primary transition-colors"
        >
          {displayName}
        </Link>
        <span className="font-ui text-xs text-base-content/50 truncate">{user.id}</span>
      </div>
      <Link
        to={`/users/${encodeURIComponent(user.id)}`}
        className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-primary transition-colors shrink-0"
      >
        View
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { t } = useTranslation()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const isLoggedIn = !!authUser

  const [banner, setBanner] = useState(false)
  const [query, setQuery] = useState('')
  const [sections, setSections] = useState([])
  const [recsLoading, setRecsLoading] = useState(true)
  const [circles, setCircles] = useState([])
  const [circlesLoading, setCirclesLoading] = useState(true)
  const [circlesError, setCirclesError] = useState(null)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const debounceRef = useRef(null)

  // Check banner flag on mount
  useEffect(() => {
    if (localStorage.getItem(BANNER_KEY) === '1') setBanner(true)
  }, [])

  const dismissBanner = () => {
    setBanner(false)
    localStorage.setItem(BANNER_KEY, '0')
  }

  // Load the server's curated recommendation shelves.
  useEffect(() => {
    if (!client) return
    setRecsLoading(true)
    client.feeds
      .getRecommendations()
      .then((res) => setSections(res?.sections ?? []))
      .catch(() => setSections([]))
      .finally(() => setRecsLoading(false))
  }, [client])

  // Load popular circles — fallback content when a server has no curated shelves.
  useEffect(() => {
    if (!client) return
    setCirclesLoading(true)
    setCirclesError(null)
    client.feeds
      .getCircles({ sort: 'reacts', limit: 20 })
      .then((res) => setCircles(res?.orderedItems ?? []))
      .catch((e) => setCirclesError(e?.message || 'Could not load circles.'))
      .finally(() => setCirclesLoading(false))
  }, [client])

  // Debounced user search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setUsers([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      if (!client) return
      setUsersLoading(true)
      try {
        const res = await client.search.searchUsers({ query: q, limit: 10 })
        setUsers(res?.orderedItems ?? res?.items ?? [])
      } catch {
        setUsers([])
      }
      setUsersLoading(false)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, client])

  const showUserResults = query.trim().length >= 2

  return (
    <div className="flex flex-col gap-8">

      {/* Welcome banner */}
      {banner && (
        <div className="relative bg-secondary border-l-4 border-secondary-content px-6 py-5">
          <button
            onClick={dismissBanner}
            className="absolute top-3 right-3 text-secondary-content/60 hover:text-secondary-content transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
          <p className="font-display text-3xl text-secondary-content mb-1">
            Welcome to Kowloon.
          </p>
          <p className="font-reading text-base text-secondary-content/80 leading-relaxed">
            Search for people to add to your circles, or heart a public circle to show your support.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">Explore</p>
        <h1 className="font-display text-5xl tracking-wide leading-none">Discover</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder', { defaultValue: 'Search for people...' })}
          className="w-full border-2 border-base-300 bg-base-100 pl-9 pr-4 py-2.5 font-ui text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* User results */}
      {showUserResults && (
        <div className="flex flex-col gap-2">
          <p className="font-ui text-[10px] uppercase tracking-widest text-base-content/40">People</p>
          {usersLoading ? (
            <Spinner />
          ) : users.length > 0 ? (
            <div className="flex flex-col">
              {users.map((u) => <UserRow key={u.id} user={u} />)}
            </div>
          ) : (
            <EmptyState message={`No people found for "${query.trim()}".`} />
          )}
        </div>
      )}

      {/* Curated shelves (server recommendations); fall back to popular circles. */}
      {!showUserResults && (
        recsLoading ? (
          <Spinner />
        ) : sections.length > 0 ? (
          <div className="flex flex-col">
            {sections.map((s) => <RecShelf key={s.id} section={s} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-ui text-[10px] uppercase tracking-widest text-base-content/40">
              Popular Circles
            </p>
            {circlesLoading ? (
              <Spinner />
            ) : circlesError ? (
              <p className="font-ui text-sm text-error">{circlesError}</p>
            ) : circles.length === 0 ? (
              <EmptyState message="No public circles yet. Be the first to create one." />
            ) : (
              <div className="flex flex-col">
                {circles.map((circle) => (
                  <CircleCard
                    key={circle.id}
                    circle={circle}
                    isLoggedIn={isLoggedIn}
                    client={client}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
