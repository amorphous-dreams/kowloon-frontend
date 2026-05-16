// SearchPage — search posts, users, groups, pages, bookmarks.
// Reads ?q= and ?type= from URL; updates on input with debounce.

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostCard from '../components/posts/PostCard'
import CircleIcon from '../components/ui/CircleIcon'
import UserAvatar from '../components/ui/UserAvatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import sizedUrl from '../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

// Backend supports: posts, pages, users, groups, bookmarks (no circles)
const SEARCH_TYPES = ['all', 'posts', 'users', 'groups', 'pages']

// Map frontend type tab → searchIn key the backend understands
const TYPE_TO_SEARCH_IN = {
  posts:  { posts: true },
  users:  { users: true },
  groups: { groups: true },
  pages:  { pages: true },
}

/**
 * Group a flat orderedItems array (each item has _searchType) into buckets.
 * Normalizes field names to what the result renderers expect.
 */
function groupResults(items) {
  const buckets = { posts: [], users: [], groups: [], pages: [], bookmarks: [] }

  for (const item of items) {
    const t = item._searchType
    if (t === 'Post') {
      buckets.posts.push({
        ...item,
        name: item.title ?? item.name,
        actor: item.actor ?? { id: item.actorId },
      })
    } else if (t === 'User') {
      buckets.users.push({
        ...item,
        displayName: item.profile?.name ?? item.username ?? item.id,
      })
    } else if (t === 'Group') {
      buckets.groups.push({
        ...item,
        summary: item.description ?? item.summary,
      })
    } else if (t === 'Page') {
      buckets.pages.push({
        ...item,
        name: item.title ?? item.name,
      })
    } else if (t === 'Bookmark') {
      buckets.bookmarks.push(item)
    }
  }

  return buckets
}

// ── Result renderers ──────────────────────────────────────────────────────────

function UserResult({ user }) {
  return (
    <Link
      to={`/users/${encodeURIComponent(user.id)}`}
      className="flex items-start gap-3 py-4 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      <UserAvatar user={user} size="md" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-ui text-sm font-bold text-base-content">{user.displayName}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/55">{user.id}</span>
        {user.profile?.description && (
          <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">
            {user.profile.description}
          </p>
        )}
      </div>
    </Link>
  )
}

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

  const initialQ    = searchParams.get('q') ?? ''
  const initialType = searchParams.get('type') ?? 'all'

  const [query, setQuery]     = useState(initialQ)
  const [type, setType]       = useState(initialType)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(initialQ)

  const search = useCallback(async (q, activeType) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    try {
      const searchIn = activeType !== 'all' ? TYPE_TO_SEARCH_IN[activeType] : undefined
      const res = await client.search.search({ query: q, searchIn })
      setResults(groupResults(res?.orderedItems ?? []))
    } catch (err) {
      console.warn('[SearchPage] search failed:', err.message)
      setResults({ posts: [], users: [], groups: [], pages: [], bookmarks: [] })
    } finally {
      setLoading(false)
    }
  }, [client])

  // Debounce: update query + URL after 350ms of no typing
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

  const hasResults = results && Object.values(results).some((arr) => arr.length > 0)

  const TYPE_LABELS = {
    all:    t('search.all',    { defaultValue: 'All' }),
    posts:  t('search.posts',  { defaultValue: 'Posts' }),
    users:  t('search.users',  { defaultValue: 'Users' }),
    groups: t('search.groups', { defaultValue: 'Groups' }),
    pages:  t('search.pages',  { defaultValue: 'Pages' }),
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Search input */}
      <div className="flex flex-col gap-4 border-b-2 border-base-300 pb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('search.placeholder', { defaultValue: 'Search\u2026' })}
            autoFocus
            aria-label={t('search.placeholder', { defaultValue: 'Search' })}
            className="w-full pl-12 pr-12 py-4 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-display text-3xl tracking-wide text-base-content placeholder:text-base-content/25 transition-colors"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); setQuery('') }}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Type filter */}
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

      {/* Results */}
      {loading && <Spinner centered />}

      {!loading && !query.trim() && (
        <div className="py-16 text-center">
          <Search size={32} className="mx-auto mb-4 text-base-content/20" />
          <p className="font-ui text-sm uppercase tracking-widest text-base-content/40">
            {t('search.prompt', { defaultValue: 'Type to search' })}
          </p>
        </div>
      )}

      {!loading && query.trim() && !hasResults && results && (
        <EmptyState message={t('search.noResults', { defaultValue: `No results for "${query}"` })} />
      )}

      {!loading && hasResults && (
        <div className="flex flex-col gap-2">

          {(type === 'all' || type === 'posts') && results.posts?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.posts} count={results.posts.length} />}
              {results.posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {(type === 'all' || type === 'users') && results.users?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={TYPE_LABELS.users} count={results.users.length} />}
              {results.users.map((user) => <UserResult key={user.id} user={user} />)}
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

        </div>
      )}

    </div>
  )
}
