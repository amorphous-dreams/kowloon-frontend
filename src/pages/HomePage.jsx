// Home — public face of the server for anon users; personal feed for logged-in users.
// Anon: shows public posts with the shared type filter.
// Auth: a view selector (Community Posts / My Posts / circles / groups) drives the
// feed, matching the mobile app's FeedHeader. Compose is a floating hexagon FAB
// (no inline top-of-feed composer). Default view is Community Posts.

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Check } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import { useFeed } from '../hooks/useFeed'
import { useJoinedGroups } from '../hooks/useJoinedGroups'
import { setView, setDefaultView, setDefaultTypes } from '../app/feedSlice'
import { fetchMyCircles } from '../features/circles/myCirclesSlice'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import TypeFilter from '../components/posts/TypeFilter'
import ComposeFab from '../components/posts/ComposeFab'
import FeedViewSelector from '../components/posts/FeedViewSelector'
import FeedDiscoverRow from '../components/discover/FeedDiscoverRow'
import CopyCircleMenu from '../components/circles/CopyCircleMenu'
import NewCircleModal from '../components/circles/NewCircleModal'
import RssFeedLink from '../components/ui/RssFeedLink'
import { useTrackScrollAnchor, useRestoreScrollAnchor } from '../hooks/useScrollAnchor'

// Normalize a page-based feed response into { items, nextCursor, hasMore }.
function pageResult(res, page, { mapPublished = false } = {}) {
  let items = res?.orderedItems ?? []
  if (mapPublished) items = items.map((p) => ({ ...p, published: p.published ?? p.createdAt }))
  const { totalItems = 0, itemsPerPage = 20 } = res ?? {}
  const fetchedPage = res?.page ?? page
  const hasMore = fetchedPage * itemsPerPage < totalItems
  return { items, nextCursor: hasMore ? fetchedPage + 1 : null, hasMore }
}

// Order-independent equality for the active-types array ([] === all).
function sameTypes(a = [], b = []) {
  const x = [...a].sort()
  const y = [...b].sort()
  return x.length === y.length && x.every((v, i) => v === y[i])
}

// ── Set-as-default overflow menu (⋮) ─────────────────────────────────────────
// Mirrors mobile FeedDefaultsMenu: independently pin the current view and/or the
// current type filter as the account defaults (server prefs + local markers).

function FeedDefaultsMenu({ view, activeTypes, defaultView, defaultTypes, onSetDefaultView, onSetDefaultTypes }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const viewIsDefault = view === defaultView
  const typesAreDefault = sameTypes(activeTypes, defaultTypes)

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('feed.defaults', { defaultValue: 'Feed defaults' })}
        className="p-1 text-base-content/55 hover:text-base-content transition-colors"
      >
        <MoreVertical size={20} strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-60 bg-base-100 border-2 border-base-300 shadow-lg">
          <div className="px-4 pt-3 pb-1 font-ui text-[10px] uppercase tracking-widest text-base-content/40">
            {t('feed.setAsDefault', { defaultValue: 'Set as default' })}
          </div>
          <DefaultRow label={t('feed.currentView', { defaultValue: 'Current view' })} isDefault={viewIsDefault} onSet={onSetDefaultView} t={t} />
          <DefaultRow label={t('feed.currentFilters', { defaultValue: 'Current filters' })} isDefault={typesAreDefault} onSet={onSetDefaultTypes} t={t} />
        </div>
      )}
    </div>
  )
}

// A single "set as default" row inside FeedDefaultsMenu. Hoisted to module
// scope so it isn't recreated on every render.
function DefaultRow({ label, isDefault, onSet, t }) {
  return (
    <button
      type="button"
      disabled={isDefault}
      onClick={onSet}
      className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-base-200 disabled:hover:bg-transparent transition-colors"
    >
      <span className={`font-ui text-sm ${isDefault ? 'text-base-content/45' : 'text-base-content'}`}>{label}</span>
      {isDefault ? (
        <span className="flex items-center gap-1 text-base-content/40">
          <Check size={13} className="text-primary" />
          <span className="font-ui text-[9px] uppercase tracking-widest">{t('feed.defaultLabel', { defaultValue: 'Default' })}</span>
        </span>
      ) : (
        <span className="font-ui text-[10px] uppercase tracking-widest text-primary">{t('feed.setDefault', { defaultValue: 'Set' })}</span>
      )}
    </button>
  )
}

// Feed toolbar content — view selector + contextual Copy (left); type filter +
// set-as-default overflow (right). Shared markup, rendered twice by HomePage:
// once invisible in normal flow (reserves layout space) and once as the real
// fixed overlay. See the comment at the two call sites for why.
function FeedToolbarContent({
  t, view, handleSelectView, myCircles, joinedGroups, user, subject,
  allowCreate, onCreateCircle, showCopy,
  activeTypes, defaultView, defaultTypes, handleSetDefaultView, handleSetDefaultTypes,
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/40">
          {t('feed.currentFeedLabel', { defaultValue: 'Current feed' })}
        </span>
        <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/40">
          {t('feed.postTypesLabel', { defaultValue: 'Post Types' })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FeedViewSelector
            value={view}
            onChange={handleSelectView}
            circles={myCircles}
            groups={joinedGroups}
            account={user}
            subject={subject}
            allowCreate={allowCreate}
            onCreateCircle={onCreateCircle}
          />
          {showCopy && <CopyCircleMenu circle={subject} />}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TypeFilter />
          <FeedDefaultsMenu
            view={view}
            activeTypes={activeTypes}
            defaultView={defaultView}
            defaultTypes={defaultTypes}
            onSetDefaultView={handleSetDefaultView}
            onSetDefaultTypes={handleSetDefaultTypes}
          />
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const dispatch = useDispatch()
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const { view, activeTypes, defaultView, defaultTypes } = useSelector((state) => state.feed)
  const { items: myCircles, status: circlesStatus } = useSelector((state) => state.myCircles)
  const joinedGroups = useJoinedGroups()
  const client = useClient()
  const { t } = useTranslation()

  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreateCircle, setShowCreateCircle] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerType, setComposerType] = useState('Note')
  // Resolved circle/group behind `view` when it isn't one of your own — powers
  // the selector's label/icon fallback and the contextual Copy action.
  const [subject, setSubject] = useState(null)

  const isCircleView = typeof view === 'string' && view.startsWith('circle:')
  const isGroupView = typeof view === 'string' && view.startsWith('group:')
  const ownedCircle = myCircles.find((c) => c.id === view)
  const joinedGroup = joinedGroups.find((g) => g.id === view)

  // Load circles once when logged in (for the view selector).
  useEffect(() => {
    if (user && circlesStatus === 'idle') dispatch(fetchMyCircles())
  }, [user, circlesStatus, dispatch])

  // Resolve a circle/group the user doesn't own/hasn't joined so it still
  // labels and renders (mirrors mobile useFeedSubject). A 404 means it's gone
  // (deleted, or saved by another user) — fall back to Community Posts.
  useEffect(() => {
    // No fetch needed for non-subject views or ones you already own/joined.
    // We leave any stale `subject` in place — every consumer gates on
    // `subject.id === view`, so it's inert until a fresh one lands.
    if (!client || (!isCircleView && !isGroupView) || ownedCircle || joinedGroup) return
    let cancelled = false
    const p = isCircleView
      ? client.feeds.getCircle({ circleId: view })
      : client.feeds.getGroup({ groupId: view })
    Promise.resolve(p)
      .then((res) => { if (!cancelled) setSubject(res?.item || res?.circle || res?.group || res || null) })
      .catch(() => { if (!cancelled) dispatch(setView('all')) })
    return () => { cancelled = true }
  }, [client, view, isCircleView, isGroupView, ownedCircle, joinedGroup, dispatch])

  const activeCircle = ownedCircle
  const lastSeenAt = activeCircle?.lastSeenAt ?? null

  // Copy action shows for a circle you don't own (mobile FeedViewAction).
  const subjectOwnerId = subject?.actorId || subject?.actor?.id
  const subjectIsOwner = subject?.isOwner === true || (!!user?.id && subjectOwnerId === user.id)
  const showCopy = isCircleView && !ownedCircle && subject && subject.id === view && !subjectIsOwner

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchPublic = useCallback(async (cursor) => {
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({
      types: activeTypes.length ? activeTypes : undefined,
      page,
    })
    return pageResult(res, page, { mapPublished: true })
  }, [client, activeTypes, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Logged-in fetch — branches on the current view, mirroring mobile useFeed.
  const fetchAuthed = useCallback(async (cursor) => {
    if (view === 'mine') {
      const page = cursor ?? 1
      const single = activeTypes.length === 1 ? activeTypes[0] : undefined
      const res = await client.feeds.getUserPosts({ userId: user.id, type: single, page })
      return pageResult(res, page)
    }
    if (isGroupView) {
      const page = cursor ?? 1
      // Group feeds filter by a single server-side `type` — send the first
      // active type (matches mobile; the group route can't multi-filter).
      const res = await client.feeds.getGroupPosts({ groupId: view, type: activeTypes[0], page })
      return pageResult(res, page)
    }
    if (isCircleView) {
      const res = await client.feeds.getCirclePosts({
        circleId: view,
        types: activeTypes.length ? activeTypes : undefined,
        before: cursor ?? undefined,
      })
      const items = res?.orderedItems ?? []
      const nc = res?.nextCursor ?? null
      return { items, nextCursor: nc, hasMore: nc !== null }
    }
    // 'all' — merged public + server firehose.
    const page = cursor ?? 1
    const res = await client.feeds.getServerPosts({
      types: activeTypes.length ? activeTypes : undefined,
      page,
    })
    return pageResult(res, page, { mapPublished: true })
  }, [client, view, isGroupView, isCircleView, activeTypes, user?.id, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFn = !sessionChecked ? null : user ? fetchAuthed : fetchPublic

  const { items, hasMore, loading, loadingMore, error, loadMore, removeItem } = useFeed(fetchFn)

  // Persist the topmost-visible post id per view, and restore it on mount.
  const anchorKey = user ? view : 'public'
  const itemIds = items.map((p) => p.id)
  useRestoreScrollAnchor(anchorKey, itemIds)
  useTrackScrollAnchor(anchorKey, itemIds)

  if (!sessionChecked) return null

  const handleSelectView = (v) => {
    dispatch(setView(v))
    setRefreshKey((k) => k + 1)
  }

  const handleSetDefaultView = () => {
    dispatch(setDefaultView(view))
    client?.activities?.updateProfile?.({ updates: { prefs: { defaultFeedView: view } } }).catch(() => {})
  }
  const handleSetDefaultTypes = () => {
    dispatch(setDefaultTypes(activeTypes))
    client?.activities?.updateProfile?.({ updates: { prefs: { defaultPostView: activeTypes } } }).catch(() => {})
  }

  // ── Logged-in view ────────────────────────────────────────────────────────

  if (user) {
    const composerTo = (isCircleView || isGroupView) ? view : 'public'
    return (
      <div className="flex flex-col">
        {/* Feed toolbar — FIXED at the top of the viewport (below the 64px/h-16
            Header) so it stays visible while the feed scrolls, instead of
            position:sticky. Two sticky attempts caused a stale-frame overlap
            glitch on iOS Safari during momentum scroll that neither an opaque
            bg nor will-change/translateZ(0) resolved; fixed sidesteps that bug
            class entirely since it has no stuck/unstuck state transition.
            Rendered twice: an invisible copy in normal flow reserves the
            layout space (so posts don't start underneath the real one), and
            the visible copy is the fixed overlay. Horizontal alignment
            replicates Layout.jsx's grid (lg:px-4 + grid-cols-12 +
            col-start-4/col-span-6) rather than measuring main's rect at
            runtime — same technique already proven for PostComposer's
            landscape-width fix. pointer-events-none/auto split lets clicks in
            the side gutters (over the sidebars) fall through to what's under
            them. */}
        <div aria-hidden="true" className="invisible pb-2 mb-3">
          <FeedToolbarContent
            t={t} view={view} handleSelectView={handleSelectView}
            myCircles={myCircles} joinedGroups={joinedGroups} user={user} subject={subject}
            allowCreate onCreateCircle={() => setShowCreateCircle(true)} showCopy={showCopy}
            activeTypes={activeTypes} defaultView={defaultView} defaultTypes={defaultTypes}
            handleSetDefaultView={handleSetDefaultView} handleSetDefaultTypes={handleSetDefaultTypes}
          />
        </div>
        <div className="fixed top-16 inset-x-0 z-40 lg:px-4 pointer-events-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-16">
            <div className="col-span-1 lg:col-start-4 lg:col-span-6 px-5 lg:px-8 pb-2 bg-base-100 border-b border-base-300 pointer-events-auto">
              <FeedToolbarContent
                t={t} view={view} handleSelectView={handleSelectView}
                myCircles={myCircles} joinedGroups={joinedGroups} user={user} subject={subject}
                allowCreate onCreateCircle={() => setShowCreateCircle(true)} showCopy={showCopy}
                activeTypes={activeTypes} defaultView={defaultView} defaultTypes={defaultTypes}
                handleSetDefaultView={handleSetDefaultView} handleSetDefaultTypes={handleSetDefaultTypes}
              />
            </div>
          </div>
        </div>

        {showCreateCircle && (
          <NewCircleModal
            onClose={() => setShowCreateCircle(false)}
            onCreated={(id) => {
              dispatch(setView(id))
              setRefreshKey((k) => k + 1)
            }}
          />
        )}

        {/* Discover row — only on the Community Posts view with no type filter. */}
        {view === 'all' && activeTypes.length === 0 && <FeedDiscoverRow refreshKey={refreshKey} />}

        <PostList onDeleted={removeItem}
          posts={items}
          loading={loading}
          error={error}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          emptyMessage={isCircleView ? t('post.emptyCircle') : undefined}
          lastSeenAt={lastSeenAt}
        />

        {/* Compose — controlled by the floating FAB's type picker (no inline trigger). */}
        <PostComposer
          hideTrigger
          open={composerOpen}
          onOpenChange={setComposerOpen}
          onPostCreated={() => setRefreshKey((k) => k + 1)}
          initialValues={{ to: composerTo, type: composerType }}
          prompt={t('composer.prompt')}
        />
        <ComposeFab onSelectType={(type) => { setComposerType(type); setComposerOpen(true) }} />
      </div>
    )
  }

  // ── Public (anon) view ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <RssFeedLink href="/posts?rss" title="Public Posts" />
      <div className="flex flex-col gap-1 items-end pb-2 mb-3">
        <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/40 px-0.5">
          {t('feed.postTypesLabel', { defaultValue: 'Post Types' })}
        </span>
        <TypeFilter />
      </div>
      <PostList onDeleted={removeItem}
        posts={items}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </div>
  )
}
