// GroupsPage — browse groups on the server visible to the current viewer.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MapPin, Users, Plus } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const POLICY_LABELS = {
  open:           'Open',
  serverOpen:     'Server members',
  serverApproval: 'Approval required',
  approvalOnly:   'By invitation',
}

const MOCK_GROUPS = [
  {
    id: 'group:jazz@kwln.org',
    name: 'London Jazz Society',
    icon: 'https://picsum.photos/seed/jazzgroup/200/200',
    summary: 'A community for jazz lovers in London and beyond. Live music listings, recordings, discussion, and the occasional argument about whether fusion counts.',
    memberCount: 214,
    location: { name: 'London, UK' },
    rsvpPolicy: 'open',
    actor: { displayName: 'Record Head' },
    actorId: '@recordhead@kwln.org',
  },
  {
    id: 'group:design@kwln.org',
    name: 'Midcentury Design Guild',
    icon: 'https://picsum.photos/seed/designguild/200/200',
    summary: 'Eames, Noguchi, Saarinen, and everything in between. Post your finds, ask questions, share projects.',
    memberCount: 89,
    location: null,
    rsvpPolicy: 'open',
    actor: { displayName: 'Ray Eames' },
    actorId: '@rayeames@kwln.org',
  },
  {
    id: 'group:film@kwln.org',
    name: 'Film Noir Society',
    icon: 'https://picsum.photos/seed/filmnoir/200/200',
    summary: 'Hard-boiled cinema, femmes fatales, and perpetual rain. Monthly screenings and discussion.',
    memberCount: 57,
    location: { name: 'London, UK' },
    rsvpPolicy: 'serverOpen',
    actor: { displayName: 'Billy Wilder' },
    actorId: '@billywilder@kwln.org',
  },
  {
    id: 'group:print@kwln.org',
    name: 'Letterpress & Print Collective',
    icon: 'https://picsum.photos/seed/printcollective/200/200',
    summary: 'Type nerds, ink lovers, and anyone who thinks movable type was a good idea. Open studio every third Saturday.',
    memberCount: 34,
    location: { name: 'Hackney, London' },
    rsvpPolicy: 'serverApproval',
    actor: { displayName: 'Ben Franklin' },
    actorId: '@benfranklin@kwln.org',
  },
  {
    id: 'group:corner@kwln.org',
    name: 'Corner Diner',
    icon: 'https://picsum.photos/seed/cornerdiner/200/200',
    summary: 'Recipes, dives, and the pursuit of the perfect pie. No fusion. No foam. No exceptions.',
    memberCount: 201,
    location: null,
    rsvpPolicy: 'open',
    actor: { displayName: 'Julia Child' },
    actorId: '@juliachild@kwln.org',
  },
  {
    id: 'group:synth@kwln.org',
    name: 'Analogue Synthesis Lab',
    icon: 'https://picsum.photos/seed/synthlab/200/200',
    summary: 'Modular, vintage, and DIY synthesis. Patch sharing, gear talk, and long discussions about filter topology.',
    memberCount: 128,
    location: null,
    rsvpPolicy: 'open',
    actor: { displayName: 'Wendy Carlos' },
    actorId: '@wendycarlos@kwln.org',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function GroupAvatar({ group }) {
  if (group.icon) {
    return (
      <img src={group.icon} alt={group.name} className="w-14 h-14 object-cover shrink-0" style={hexMask} />
    )
  }
  return (
    <div className="w-14 h-14 bg-secondary flex items-center justify-center shrink-0" style={hexMask}>
      <CircleIcon type="group" size="lg" className="opacity-70 text-secondary-content" />
    </div>
  )
}

function GroupBrowseCard({ group, isLoggedIn }) {
  const { t } = useTranslation()
  const policy = POLICY_LABELS[group.rsvpPolicy] ?? group.rsvpPolicy

  return (
    <div className="flex items-start gap-4 py-5 border-b border-base-300 group">
      <Link to={`/groups/${encodeURIComponent(group.id)}`} className="shrink-0 mt-1">
        <GroupAvatar group={group} />
      </Link>

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              to={`/groups/${encodeURIComponent(group.id)}`}
              className="font-display text-2xl tracking-wide leading-none hover:text-primary transition-colors"
            >
              {group.name}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs uppercase tracking-widest text-base-content/60">
              {group.actor?.displayName && (
                <>
                  <Link
                    to={`/users/${encodeURIComponent(group.actorId)}`}
                    className="font-bold hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.actor.displayName}
                  </Link>
                  <span>·</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Users size={10} />
                {(group.memberCount ?? 0).toLocaleString()} {t('group.members', { defaultValue: 'members' })}
              </span>
              {group.location?.name && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {group.location.name}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{policy}</span>
            </div>
          </div>

          {isLoggedIn && (
            <Link
              to={`/groups/${encodeURIComponent(group.id)}`}
              className="shrink-0 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
              {t('group.view', { defaultValue: 'View' })}
            </Link>
          )}
        </div>

        {group.summary && (
          <p className="font-reading text-base text-base-content/75 leading-relaxed line-clamp-2">
            {group.summary}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { t } = useTranslation()
  const client = useClient()
  const user = useSelector((state) => state.auth.user)

  const [sort, setSort] = useState('date')
  const [groups, setGroups] = useState([])
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (sortOrder, pageNum) => {
    if (!client) {
      const sorted = [...MOCK_GROUPS].sort((a, b) =>
        sortOrder === 'popular' ? b.memberCount - a.memberCount : b.id.localeCompare(a.id)
      )
      setGroups(sorted)
      setTotalItems(sorted.length)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.browseGroups({ sort: sortOrder, page: pageNum })
      setGroups(res.orderedItems ?? [])
      setTotalItems(res.totalItems ?? 0)
      setItemsPerPage(res.itemsPerPage ?? 20)
    } catch (err) {
      setError(err.message || 'Failed to load groups.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load(sort, page) }, [sort, page, load])

  const handleSort = (newSort) => {
    if (newSort === sort) return
    setSort(newSort)
    setPage(1)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-base-300 pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-5xl tracking-wide leading-none">
            {t('groups.browse', { defaultValue: 'Groups' })}
          </h1>
          {totalItems > 0 && !loading && (
            <p className="font-ui text-sm uppercase tracking-widest text-base-content/50">
              {totalItems.toLocaleString()} {t('groups.total', { defaultValue: 'groups' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/groups/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <Plus size={13} /> {t('group.new', { defaultValue: 'New Group' })}
            </Link>
          )}
          <div className="flex items-center gap-0 border border-base-300">
            <button
              onClick={() => handleSort('date')}
              className={`px-4 py-2 font-ui text-xs uppercase tracking-widest transition-colors ${
                sort === 'date'
                  ? 'bg-secondary text-secondary-content'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
              }`}
            >
              {t('sort.newest', { defaultValue: 'Newest' })}
            </button>
            <button
              onClick={() => handleSort('popular')}
              className={`px-4 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-l border-base-300 ${
                sort === 'popular'
                  ? 'bg-secondary text-secondary-content'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
              }`}
            >
              {t('sort.popular', { defaultValue: 'Popular' })}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <Spinner centered />}
      {!loading && error && <ErrorState message={error} onRetry={() => load(sort, page)} />}
      {!loading && !error && groups.length === 0 && (
        <EmptyState message={t('groups.empty', { defaultValue: 'No groups found.' })} />
      )}
      {!loading && !error && groups.length > 0 && (
        <div className="flex flex-col">
          {groups.map((group) => (
            <GroupBrowseCard key={group.id} group={group} isLoggedIn={!!user} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-base-300">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 font-ui text-xs uppercase tracking-widest border border-base-300 text-base-content/60 hover:text-base-content hover:border-base-content transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('pagination.prev', { defaultValue: 'Previous' })}
          </button>
          <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
            {t('pagination.pageOf', { page, total: totalPages, defaultValue: `Page ${page} of ${totalPages}` })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 font-ui text-xs uppercase tracking-widest border border-base-300 text-base-content/60 hover:text-base-content hover:border-base-content transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('pagination.next', { defaultValue: 'Next' })}
          </button>
        </div>
      )}

    </div>
  )
}
