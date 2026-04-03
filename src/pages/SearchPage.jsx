// SearchPage — search posts, users, groups, circles, pages.
// Reads ?q= and ?type= from URL; updates on input.

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

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const SEARCH_TYPES = ['all', 'posts', 'users', 'groups', 'circles', 'pages']

// ── Mock results ──────────────────────────────────────────────────────────────

const AUTHOR = { id: '@recordhead@kwln.org', username: 'recordhead', displayName: 'Record Head', profile: { icon: 'https://picsum.photos/seed/recordhead/200/200' } }
const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()

const MOCK_RESULTS = {
  posts: [
    {
      id: 'post:2@kwln.org',
      type: 'Article',
      name: 'On the Aesthetics of Midcentury Design',
      source: 'Reid Miles understood that negative space *is* content.',
      published: H(2),
      visibility: 'Public',
      attributedTo: AUTHOR,
    },
    {
      id: 'post:3@kwln.org',
      type: 'Link',
      name: 'Blue Note Records: The Complete Discography',
      source: 'An absolutely essential resource.',
      href: 'https://www.discogs.com/label/3073-Blue-Note-Records',
      published: H(12),
      visibility: 'Public',
      attributedTo: AUTHOR,
    },
  ],
  users: [
    { id: '@recordhead@kwln.org',  username: 'recordhead',  displayName: 'Record Head',     profile: { icon: 'https://picsum.photos/seed/recordhead/200/200',  description: 'Collector, obsessive, and occasional DJ. Blue Note completist.' } },
    { id: '@jzellis@kwln.org',     username: 'jzellis',     displayName: 'Joshua Ellis',    profile: { icon: 'https://picsum.photos/seed/jzellis/200/200',     description: 'Writer, musician, technologist.' } },
    { id: '@milesahead@kwln.org',  username: 'milesahead',  displayName: 'Miles Ahead',     profile: { icon: 'https://picsum.photos/seed/milesahead/200/200',  description: 'Trumpet player and armchair theorist.' } },
  ],
  groups: [
    { id: 'group:jazz@kwln.org',   name: 'London Jazz Society',       icon: 'https://picsum.photos/seed/jazzgroup/200/200',   memberCount: 214, summary: 'Jazz lovers in London and beyond.' },
    { id: 'group:design@kwln.org', name: 'Midcentury Design Guild',   icon: 'https://picsum.photos/seed/designguild/200/200', memberCount: 89,  summary: 'Eames, Noguchi, Saarinen, and everything in between.' },
  ],
  circles: [
    { id: 'circle:jazz@kwln.org',   name: 'Jazz & Improvised Music', icon: 'https://picsum.photos/seed/jazz11/200/200',      memberCount: 91,  summary: 'From bebop to free jazz.' },
    { id: 'circle:design@kwln.org', name: 'Midcentury Design',       icon: 'https://picsum.photos/seed/design77/200/200',    memberCount: 89,  summary: 'Post your finds.' },
  ],
  pages: [
    { id: 'page:manifesto@kwln.org', name: 'The Kowloon Manifesto', summary: 'What we are building and why.', updatedAt: H(48) },
    { id: 'page:style@kwln.org',     name: 'Style Guide',            summary: 'Visual language and conventions.', updatedAt: H(120) },
  ],
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
        ? <img src={group.icon} alt={group.name} className="w-10 h-10 object-cover shrink-0" style={hexMask} />
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

function CircleResult({ circle }) {
  return (
    <Link
      to={`/circles/${encodeURIComponent(circle.id)}`}
      className="flex items-start gap-3 py-4 border-b border-base-300 hover:bg-base-200 px-2 -mx-2 transition-colors"
    >
      {circle.icon
        ? <img src={circle.icon} alt={circle.name} className="w-10 h-10 object-cover shrink-0" style={hexMask} />
        : <div className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
            <CircleIcon type="circle" size="md" className="opacity-70 text-secondary-content" />
          </div>
      }
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-display text-xl tracking-wide leading-none">{circle.name}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/55">{circle.memberCount} members</span>
        {circle.summary && (
          <p className="font-reading text-sm text-base-content/70 leading-snug mt-0.5 line-clamp-2">{circle.summary}</p>
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

  const [query, setQuery]   = useState(initialQ)
  const [type, setType]     = useState(initialType)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(initialQ)

  const search = useCallback(async (q, t) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    try {
      if (!client) {
        // Mock: filter results by query string (case-insensitive substring match)
        const lq = q.toLowerCase()
        const filtered = {
          posts:   MOCK_RESULTS.posts.filter((p) => (p.name ?? p.source ?? '').toLowerCase().includes(lq)),
          users:   MOCK_RESULTS.users.filter((u) => (u.displayName + u.id).toLowerCase().includes(lq)),
          groups:  MOCK_RESULTS.groups.filter((g) => (g.name + (g.summary ?? '')).toLowerCase().includes(lq)),
          circles: MOCK_RESULTS.circles.filter((c) => (c.name + (c.summary ?? '')).toLowerCase().includes(lq)),
          pages:   MOCK_RESULTS.pages.filter((p) => (p.name + (p.summary ?? '')).toLowerCase().includes(lq)),
        }
        setResults(filtered)
        return
      }
      const res = await client.search.search({ q, type: t === 'all' ? undefined : t })
      setResults(res)
    } catch {}
    finally { setLoading(false) }
  }, [client])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue)
      setSearchParams(inputValue ? { q: inputValue, ...(type !== 'all' ? { type } : {}) } : {}, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [inputValue, type])

  useEffect(() => {
    if (query) search(query, type)
    else setResults(null)
  }, [query, type, search])

  const hasResults = results && Object.values(results).some((arr) => arr.length > 0)

  const TYPE_LABELS = {
    all:     t('search.all',     { defaultValue: 'All' }),
    posts:   t('search.posts',   { defaultValue: 'Posts' }),
    users:   t('search.users',   { defaultValue: 'Users' }),
    groups:  t('search.groups',  { defaultValue: 'Groups' }),
    circles: t('search.circles', { defaultValue: 'Circles' }),
    pages:   t('search.pages',   { defaultValue: 'Pages' }),
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
            placeholder={t('search.placeholder', { defaultValue: 'Search…' })}
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
              {type === 'all' && <SectionHeader title={t('search.posts', { defaultValue: 'Posts' })} count={results.posts.length} />}
              {results.posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {(type === 'all' || type === 'users') && results.users?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={t('search.users', { defaultValue: 'Users' })} count={results.users.length} />}
              {results.users.map((user) => <UserResult key={user.id} user={user} />)}
            </div>
          )}

          {(type === 'all' || type === 'groups') && results.groups?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={t('search.groups', { defaultValue: 'Groups' })} count={results.groups.length} />}
              {results.groups.map((group) => <GroupResult key={group.id} group={group} />)}
            </div>
          )}

          {(type === 'all' || type === 'circles') && results.circles?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={t('search.circles', { defaultValue: 'Circles' })} count={results.circles.length} />}
              {results.circles.map((circle) => <CircleResult key={circle.id} circle={circle} />)}
            </div>
          )}

          {(type === 'all' || type === 'pages') && results.pages?.length > 0 && (
            <div>
              {type === 'all' && <SectionHeader title={t('search.pages', { defaultValue: 'Pages' })} count={results.pages.length} />}
              {results.pages.map((page) => <PageResult key={page.id} page={page} />)}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
