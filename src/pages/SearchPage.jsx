// SearchPage — search posts, users, groups, pages.
// Reads ?q= and ?type= from URL; updates on input with debounce.
// User results have inline action buttons (Add to Circle, View Profile, Block, Mute).

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Search, X, Loader, Globe } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { toast } from '../app/toast'
import PostCard from '../components/posts/PostCard'
import CircleIcon from '../components/ui/CircleIcon'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import sizedUrl from '../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const SEARCH_TYPES = ['all', 'posts', 'users', 'groups', 'pages', 'bookmarks']

const TYPE_TO_SEARCH_IN = {
  posts:     { posts: true },
  users:     { users: true },
  groups:    { groups: true },
  pages:     { pages: true },
  bookmarks: { bookmarks: true },
}

function groupResults(items) {
  const buckets = { posts: [], users: [], groups: [], pages: [], bookmarks: [], servers: [] }
  for (const item of items) {
    const t = item._searchType
    if (t === 'Post') {
      buckets.posts.push({ ...item, name: item.title ?? item.name, actor: item.actor ?? { id: item.actorId } })
    } else if (t === 'User') {
      buckets.users.push({ ...item, displayName: item.profile?.name ?? item.username ?? item.id })
    } else if (t === 'Group') {
      buckets.groups.push({ ...item, summary: item.description ?? item.summary })
    } else if (t === 'Page') {
      buckets.pages.push({ ...item, name: item.title ?? item.name })
    } else if (t === 'Bookmark') {
      buckets.bookmarks.push(item)
    } else if (t === 'Server') {
      buckets.servers.push(item)
    }
  }
  return buckets
}

// ── Add-to-Circle modal ───────────────────────────────────────────────────────

function AddToCircleModal({ user, authUser, client, onClose }) {
  const [circles, setCircles] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)

  useEffect(() => {
    client.feeds.getUserCircles({ userId: authUser.id })
      .then((res) => setCircles(res?.orderedItems ?? []))
      .catch(() => setCircles([]))
      .finally(() => setLoading(false))
  }, [authUser.id, client])

  const handleAdd = async (circle) => {
    setAdding(circle.id)
    try {
      await client.activities.addToCircle({ circleId: circle.id, memberId: user.id })
      toast.success(`${user.displayName} added to ${circle.name}`)
      onClose()
    } catch (err) {
      toast.error('Failed to add to circle', { detail: err.message })
      setAdding(null)
    }
  }

  return (
    <Modal open title={`Add ${user.displayName} to Circle`} onClose={onClose}>
      {loading ? (
        <Spinner centered />
      ) : circles.length === 0 ? (
        <p className="font-ui text-sm text-base-content/50 py-2">
          No circles yet. <Link to="/circles/new" className="underline" onClick={onClose}>Create one first.</Link>
        </p>
      ) : (
        <div className="flex flex-col -mx-6">
          {circles.map((circle) => (
            <button
              key={circle.id}
              onClick={() => handleAdd(circle)}
              disabled={!!adding}
              className="flex items-center gap-3 px-6 py-3 text-left hover:bg-base-200 transition-colors border-b border-base-300 last:border-b-0 disabled:opacity-50"
            >
              {adding === circle.id
                ? <Loader size={14} className="animate-spin shrink-0 text-base-content/40" />
                : <CircleIcon type="circle" size="sm" className="shrink-0 opacity-50" />
              }
              <span className="font-ui text-sm">{circle.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── User result ───────────────────────────────────────────────────────────────

function UserResult({ user, authUser, client }) {
  const isRemote = user.url && !user.url.startsWith(window.location.origin)
  const [circleModalOpen, setCircleModalOpen] = useState(false)

  const handleBlock = async () => {
    try {
      await client.activities.block({ userId: user.id })
      toast.success(`${user.id} blocked`)
    } catch (err) {
      toast.error('Block failed', { detail: err.message })
    }
  }

  const handleMute = async () => {
    try {
      await client.activities.mute({ userId: user.id })
      toast.success(`${user.id} muted`)
    } catch (err) {
      toast.error('Mute failed', { detail: err.message })
    }
  }

  const profileLink = isRemote
    ? <a href={user.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/70 hover:border-primary hover:text-primary transition-colors">View Profile</a>
    : <Link to={`/users/${encodeURIComponent(user.id)}`} className="px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/70 hover:border-primary hover:text-primary transition-colors">View Profile</Link>

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-base-300">
      <div className="flex items-start gap-3">
        <UserAvatar user={user} size="md" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-ui text-sm font-bold text-base-content">{user.displayName}</span>
          <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">{user.id}</span>
          {user.profile?.description && (
            <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">
              {user.profile.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-[52px]">
        {authUser && (
          <button
            onClick={() => setCircleModalOpen(true)}
            className="px-3 py-1.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors"
          >
            Add to Circle
          </button>
        )}
        {profileLink}
        {authUser && (
          <>
            <div className="w-px h-4 bg-base-300 mx-1" />
            <button
              onClick={handleMute}
              className="px-3 py-1.5 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-base-content transition-colors"
            >
              Mute
            </button>
            <button
              onClick={handleBlock}
              className="px-3 py-1.5 font-ui text-xs uppercase tracking-widest text-error/50 hover:text-error transition-colors"
            >
              Block
            </button>
          </>
        )}
      </div>

      {circleModalOpen && authUser && (
        <AddToCircleModal
          user={user}
          authUser={authUser}
          client={client}
          onClose={() => setCircleModalOpen(false)}
        />
      )}
    </div>
  )
}

// ── Other result renderers ────────────────────────────────────────────────────

function GroupResult({ group }) {
  return (
    <Link
      to={`/groups/${encodeURIComponent(group.id)}`}
      className="flex items-start gap-3 py-4 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      {group.icon
        ? <img loading="lazy" src={sizedUrl(group.icon, 200)} alt={group.name} className="w-10 h-10 object-cover shrink-0" style={hexMask} />
        : <div className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
            <CircleIcon type="group" size="md" className="opacity-70 text-secondary-content" />
          </div>
      }
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-display text-xl tracking-wide leading-none">{group.name}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/55">{group.memberCount} members</span>
        {group.summary && (
          <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">{group.summary}</p>
        )}
      </div>
    </Link>
  )
}

function BookmarkResult({ bookmark }) {
  const href = bookmark.href ?? bookmark.target
  const inner = (
    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
      <span className="font-ui text-sm font-semibold text-primary truncate">{bookmark.title}</span>
      {bookmark.summary && (
        <p className="font-reading text-sm text-base-content/70 leading-snug line-clamp-2">{bookmark.summary}</p>
      )}
      {bookmark.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {bookmark.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="font-ui text-xs uppercase tracking-widest text-base-content/50 bg-base-300 px-1.5 py-0.5">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
  return (
    <div className="flex items-start gap-3 py-4 border-b border-base-300">
      {bookmark.image && <img src={sizedUrl(bookmark.image, 200)} alt="" className="w-10 h-10 object-cover shrink-0" />}
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:opacity-70 transition-opacity">{inner}</a>
        : inner}
    </div>
  )
}

function PageResult({ page }) {
  return (
    <Link
      to={`/pages/${encodeURIComponent(page.id)}`}
      className="flex items-start gap-3 py-4 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-display text-xl tracking-wide leading-none">{page.name}</span>
        {page.summary && (
          <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">{page.summary}</p>
        )}
      </div>
    </Link>
  )
}

function stripHtml(s) {
  return typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : ''
}

// Shown when the query is a bare @domain — a link to that remote server.
function ServerResultCard({ server, domain }) {
  const name = server?.name || domain
  const desc = stripHtml(server?.description)
  return (
    <Link
      to={`/server/${encodeURIComponent(domain)}`}
      className="flex items-center gap-3 py-4 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      {server?.icon
        ? <img src={server.icon} alt="" className="w-11 h-11 object-cover shrink-0" style={hexMask} />
        : <div className="w-11 h-11 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
            <Globe size={20} className="text-secondary-content opacity-70" />
          </div>
      }
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-display text-xl tracking-wide leading-none">{name}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/55 mt-0.5">
          {domain}{typeof server?.userCount === 'number' ? ` · ${server.userCount.toLocaleString()} users` : ''}
        </span>
        {desc && <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">{desc}</p>}
      </div>
    </Link>
  )
}

function SectionHeader({ title, count }) {
  return (
    <h2 className="font-display text-2xl tracking-wide border-b-2 border-base-300 pb-2 mb-0 mt-6 first:mt-0">
      {title}
      {count > 0 && (
        <span className="ml-2 font-ui text-sm text-base-content/40 normal-case tracking-normal">{count}</span>
      )}
    </h2>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)

  const initialQ    = searchParams.get('q') ?? ''
  const initialType = searchParams.get('type') ?? 'all'

  const [query, setQuery]         = useState(initialQ)
  const [type, setType]           = useState(initialType)
  const [results, setResults]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [inputValue, setInputValue] = useState(initialQ)
  const [serverResult, setServerResult] = useState(null)
  const [serverLoading, setServerLoading] = useState(false)

  // A bare @domain (starts with @, no second @) is a remote-server lookup —
  // mirrors the mobile search. @user@domain has a second @ and is a user search.
  const isServerQuery =
    query.startsWith('@') && !query.slice(1).includes('@') && query.trim().length > 1
  const serverDomain = isServerQuery ? query.slice(1).trim() : ''

  const search = useCallback(async (q, activeType) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    try {
      const searchIn = activeType !== 'all' ? TYPE_TO_SEARCH_IN[activeType] : undefined
      const res = await client.search.search({ query: q, searchIn })
      setResults(groupResults(res?.orderedItems ?? []))
    } catch (err) {
      console.warn('[SearchPage] search failed:', err.message)
      setResults({ posts: [], users: [], groups: [], pages: [] })
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue)
      setSearchParams(
        inputValue ? { q: inputValue, ...(type !== 'all' ? { type } : {}) } : {},
        { replace: true }
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [inputValue, type, setSearchParams])

  useEffect(() => {
    if (query) search(query, type)
    else setResults(null)
  }, [query, type, search])

  // Remote-server lookup when the query is a bare @domain.
  useEffect(() => {
    if (!client || !isServerQuery) { setServerResult(null); return }
    let cancelled = false
    setServerLoading(true)
    client.feeds.getServer({ domain: serverDomain })
      .then((res) => { if (!cancelled) setServerResult(res?.server ?? res?.item ?? res ?? null) })
      .catch(() => { if (!cancelled) setServerResult(null) })
      .finally(() => { if (!cancelled) setServerLoading(false) })
    return () => { cancelled = true }
  }, [client, serverDomain, isServerQuery])

  const hasResults = results && Object.values(results).some((arr) => arr.length > 0)

  const TYPE_LABELS = {
    all:    t('search.all',    { defaultValue: 'All' }),
    posts:  t('search.posts',  { defaultValue: 'Posts' }),
    users:  t('search.users',  { defaultValue: 'Users' }),
    groups: t('search.groups', { defaultValue: 'Groups' }),
    pages:  t('search.pages',  { defaultValue: 'Pages' }),
    bookmarks: t('search.bookmarks', { defaultValue: 'Bookmarks' }),
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Search input */}
      <div className="flex flex-col gap-4 border-b-2 border-base-300 pb-6">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('search.placeholder', { defaultValue: 'Search…' })}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            aria-label={t('search.placeholder', { defaultValue: 'Search' })}
            className="w-full pl-9 pr-9 py-2.5 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm text-base-content placeholder:text-base-content/30 transition-colors"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); setQuery('') }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0 flex-wrap">
          {SEARCH_TYPES.map((st) => (
            <button
              key={st}
              onClick={() => setType(st)}
              className={`px-4 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${
                type === st
                  ? 'bg-secondary text-secondary-content'
                  : 'bg-base-200 text-base-content/60 hover:bg-base-300'
              }`}
            >
              {TYPE_LABELS[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Remote-server lookup result (bare @domain) */}
      {isServerQuery && (
        <div className="flex flex-col gap-2">
          <p className="font-ui text-[10px] uppercase tracking-widest text-base-content/40">Server</p>
          {serverLoading ? (
            <Spinner />
          ) : serverResult ? (
            <ServerResultCard server={serverResult} domain={serverDomain} />
          ) : (
            <EmptyState message={`No Kowloon server found at ${serverDomain}.`} />
          )}
        </div>
      )}

      {loading && <Spinner centered />}

      {!loading && !query.trim() && (
        <div className="py-16 text-center">
          <Search size={28} className="mx-auto mb-4 text-base-content/20" />
          <p className="font-ui text-sm uppercase tracking-widest text-base-content/40">
            {t('search.prompt', { defaultValue: 'Type to search' })}
          </p>
        </div>
      )}

      {!loading && query.trim() && !hasResults && results && !isServerQuery && (
        <EmptyState message={t('search.noResults', { defaultValue: `No results for "${query}"` })} />
      )}

      {!loading && hasResults && (
        <div className="flex flex-col gap-2">

          {/* Partial cached-server matches — only on the "All" tab, and never
              the exact @domain already shown by the live lookup above. */}
          {type === 'all' && (() => {
            const exact = serverResult?.domain?.toLowerCase()
            const servers = (results.servers ?? []).filter(
              (s) => (s?.domain || '').toLowerCase() !== exact
            )
            if (servers.length === 0) return null
            return (
              <div>
                <SectionHeader title={t('search.servers', { defaultValue: 'Servers' })} count={servers.length} />
                {servers.map((s) => (
                  <ServerResultCard key={s.domain} server={s} domain={s.domain} />
                ))}
              </div>
            )
          })()}

          {(type === 'all' || type === 'posts') && results.posts?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.posts} count={results.posts.length} />}
              {results.posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {(type === 'all' || type === 'users') && results.users?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.users} count={results.users.length} />}
              {results.users.map((user) => (
                <UserResult key={user.id} user={user} authUser={authUser} client={client} />
              ))}
            </div>
          )}

          {(type === 'all' || type === 'groups') && results.groups?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.groups} count={results.groups.length} />}
              {results.groups.map((group) => <GroupResult key={group.id} group={group} />)}
            </div>
          )}

          {(type === 'all' || type === 'pages') && results.pages?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.pages} count={results.pages.length} />}
              {results.pages.map((page) => <PageResult key={page.id} page={page} />)}
            </div>
          )}

          {(type === 'all' || type === 'bookmarks') && results.bookmarks?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.bookmarks} count={results.bookmarks.length} />}
              {results.bookmarks.map((bookmark) => <BookmarkResult key={bookmark.id} bookmark={bookmark} />)}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
