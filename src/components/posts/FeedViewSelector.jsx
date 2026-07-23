// FeedViewSelector — pick what you're reading on the home feed.
//
// Mirrors the mobile FeedViewSelector. Choices:
//   'all'          — Community Posts (merged public + server)  → getServerPosts
//   'mine'         — My Posts (everything you've posted)       → getUserPosts
//   'circle:<id>…' — one of your circles                       → getCirclePosts
//   'group:<id>…'  — a joined group                            → getGroupPosts
//
// The trigger shows the current view's icon + label; tapping opens a dropdown.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, Globe, Compass } from 'lucide-react'
import CircleIcon from '../ui/CircleIcon'
import sizedUrl from '../../lib/sizedUrl'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function HexIcon({ url, type = 'circle', size = 20 }) {
  if (url) {
    return <img src={sizedUrl(url, 200)} alt="" className="object-cover shrink-0" style={{ width: size, height: size, ...hexMask }} />
  }
  return (
    <div className="bg-secondary flex items-center justify-center shrink-0" style={{ width: size, height: size, ...hexMask }}>
      <CircleIcon type={type} size="sm" className="text-secondary-content opacity-70" />
    </div>
  )
}

export default function FeedViewSelector({
  value = 'all',
  onChange,
  circles = [],
  groups = [],
  account,
  allowCreate = false,
  onCreateCircle,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isMine = value === 'mine'
  const isCircle = typeof value === 'string' && value.startsWith('circle:')
  const isGroup = typeof value === 'string' && value.startsWith('group:')
  const activeCircle = circles.find((c) => c.id === value)
  const activeGroup = groups.find((g) => g.id === value)

  const currentLabel =
    (isMine && t('feed.myPosts', { defaultValue: 'My Posts' })) ||
    activeCircle?.name ||
    activeGroup?.name ||
    t('feed.communityPosts', { defaultValue: 'Community Posts' })

  const currentIcon = isMine
    ? <HexIcon url={account?.profile?.icon ?? account?.icon} type="circle" size={22} />
    : activeCircle
      ? <HexIcon url={activeCircle.icon} type="circle" size={22} />
      : activeGroup
        ? <HexIcon url={activeGroup.icon} type="group" size={22} />
        : <span className="inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 text-primary"><Globe size={20} strokeWidth={1.75} /></span>

  const q = query.trim().toLowerCase()
  const filteredCircles = q ? circles.filter((c) => c.name?.toLowerCase().includes(q)) : circles
  const filteredGroups = q ? groups.filter((g) => g.name?.toLowerCase().includes(q)) : groups
  const showSearch = circles.length + groups.length > 5

  const select = (v) => {
    onChange?.(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 min-w-0 max-w-full transition-colors text-base-content hover:text-primary"
      >
        {currentIcon}
        <span className="font-ui text-sm font-bold tracking-tight truncate">{currentLabel}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-base-100 border-2 border-base-300 shadow-lg flex flex-col max-h-[70vh]">
          {showSearch && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-base-200 shrink-0">
              <Search size={12} className="text-base-content/40 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('feed.searchCirclesGroups', { defaultValue: 'Search circles & groups…' })}
                className="flex-1 bg-transparent font-ui text-xs text-base-content placeholder:text-base-content/30 outline-none"
              />
            </div>
          )}

          <div className="overflow-y-auto">
            {/* Community + My Posts — fixed */}
            <Row
              icon={<span className="inline-flex items-center justify-center w-[22px] h-[22px] text-primary"><Globe size={20} strokeWidth={1.75} /></span>}
              label={t('feed.communityPosts', { defaultValue: 'Community Posts' })}
              summary={t('feed.communityPostsSummary', { defaultValue: 'All public and community posts.' })}
              selected={!isMine && !isCircle && !isGroup}
              onClick={() => select('all')}
            />
            <Row
              icon={<HexIcon url={account?.profile?.icon ?? account?.icon} size={22} />}
              label={t('feed.myPosts', { defaultValue: 'My Posts' })}
              summary={t('feed.myPostsSummary', { defaultValue: "Everything you've posted." })}
              selected={isMine}
              onClick={() => select('mine')}
            />

            {/* Circles */}
            {filteredCircles.length > 0 && (
              <div className="border-t border-base-200 px-4 pt-2 pb-1 font-ui text-[10px] uppercase tracking-widest text-base-content/40">
                {t('feed.yourCircles', { defaultValue: 'Your circles' })}
              </div>
            )}
            {filteredCircles.map((c) => (
              <Row
                key={c.id}
                icon={<HexIcon url={c.icon} type="circle" size={22} />}
                label={c.name}
                summary={c.summary}
                selected={value === c.id}
                onClick={() => select(c.id)}
              />
            ))}

            {/* Groups */}
            {filteredGroups.length > 0 && (
              <div className="border-t border-base-200 px-4 pt-2 pb-1 font-ui text-[10px] uppercase tracking-widest text-base-content/40">
                {t('feed.yourGroups', { defaultValue: 'Your groups' })}
              </div>
            )}
            {filteredGroups.map((g) => (
              <Row
                key={g.id}
                icon={<HexIcon url={g.icon} type="group" size={22} />}
                label={g.name}
                selected={value === g.id}
                onClick={() => select(g.id)}
              />
            ))}

            {q && filteredCircles.length === 0 && filteredGroups.length === 0 && (
              <p className="font-ui text-xs text-base-content/40 px-4 py-3">
                {t('feed.noMatches', { defaultValue: 'No circles or groups match.' })}
              </p>
            )}
          </div>

          {/* Footer — create circle + Discover */}
          <div className="border-t border-base-200 shrink-0">
            {allowCreate && (
              <button
                type="button"
                onClick={() => { setOpen(false); onCreateCircle ? onCreateCircle() : navigate('/circles/new') }}
                className="w-full text-left px-4 py-2.5 font-ui text-xs uppercase tracking-widest text-primary hover:bg-base-200 transition-colors"
              >
                {t('circle.new', { defaultValue: 'New circle…' })}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/discover') }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors"
            >
              <Compass size={18} className="text-base-content/70" />
              <span className="font-ui text-xs uppercase tracking-widest text-base-content">
                {t('discover.title', { defaultValue: 'Discover…' })}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, summary, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected ? 'bg-secondary' : 'hover:bg-base-200'
      }`}
    >
      {icon}
      <span className="flex flex-col min-w-0 flex-1">
        <span className={`font-ui text-xs uppercase tracking-widest truncate ${selected ? 'text-secondary-content' : 'text-base-content'}`}>
          {label}
        </span>
        {summary && (
          <span className={`font-reading text-xs truncate ${selected ? 'text-secondary-content/70' : 'text-base-content/40'}`}>
            {summary}
          </span>
        )}
      </span>
    </button>
  )
}
