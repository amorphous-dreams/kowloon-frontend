// NewCircleModal — two-step circle creation dialog.
// Step 1: name, description, visibility.
// Step 2: add members (local search as-you-type + remote handle lookup).
//
// Props:
//   onClose()           — close without selecting
//   onCreated(circleId) — called after creation (and optional member add)

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { X, Loader, Search, UserPlus, ChevronRight, ChevronLeft } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import { fetchMyCircles } from '../../features/circles/myCirclesSlice'
import CircleIcon from '../ui/CircleIcon'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const VISIBILITY_OPTIONS = [
  { value: '@public', label: 'Public' },
  { value: '@server', label: 'Server only' },
  { value: '',        label: 'Private (only you)' },
]

// Matches @user@domain — triggers remote lookup instead of local search
const HANDLE_RE = /^@[^@\s]+@[^@\s]+$/

function normalizeUser(raw) {
  const u = raw?.item ?? raw
  return {
    id:   u.id,
    name: u.name ?? u.profile?.name ?? u.preferredUsername ?? u.username ?? u.id,
    icon: u.icon ?? u.profile?.icon ?? null,
  }
}

// ── Step 1: Name / description / visibility ───────────────────────────────────

function StepCreate({ onCreated, onClose }) {
  const client = useClient()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [to, setTo]                   = useState('@public')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)

  const nameRef = useRef(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await client.activities.createCircle({
        name: name.trim(),
        description: description.trim() || undefined,
        to,
      })
      const circleId = res?.createdId ?? res?.activity?.objectId ?? res?.result?.id
      if (!circleId) throw new Error('Circle created but ID not returned')
      dispatch(fetchMyCircles())
      onCreated(circleId, name.trim())
    } catch (err) {
      setError(err.message || 'Failed to create circle.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
      {error && (
        <p className="font-ui text-xs text-error border border-error/30 px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
          {t('circle.name', { defaultValue: 'Name' })} *
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('circle.namePlaceholder', { defaultValue: 'Circle name' })}
          required
          className="bg-base-200 border border-base-300 px-3 py-2.5 font-display text-2xl tracking-wide focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
          {t('circle.description', { defaultValue: 'Description' })}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t('circle.descriptionPlaceholder', { defaultValue: 'Optional description' })}
          className="bg-base-200 border border-base-300 px-3 py-2 font-reading text-base focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
          {t('circle.visibility', { defaultValue: 'Visibility' })}
        </label>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-base-200 border border-base-300 px-3 py-1.5 font-ui text-sm focus:outline-none focus:border-primary"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-base-300">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
        >
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
        >
          {submitting
            ? <Loader size={12} className="animate-spin" />
            : <ChevronRight size={12} />
          }
          {t('circle.create', { defaultValue: 'Create Circle' })}
        </button>
      </div>
    </form>
  )
}

// ── Step 2: Add members ───────────────────────────────────────────────────────

function UserCard({ user, onAdd, added }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 last:border-b-0">
      <div className="w-8 h-8 shrink-0 bg-base-300" style={hexMask}>
        {user.icon && <img src={user.icon} alt={user.name} className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col gap-0 flex-1 min-w-0">
        <span className="font-ui text-sm font-bold leading-tight truncate">{user.name}</span>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40 truncate">{user.id}</span>
      </div>
      <button
        type="button"
        onClick={() => onAdd(user)}
        disabled={added}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 font-ui text-xs uppercase tracking-widest transition-colors ${
          added
            ? 'text-base-content/30 cursor-default'
            : 'text-primary hover:bg-primary hover:text-primary-content border border-primary/40 hover:border-primary'
        }`}
      >
        {added ? 'Added' : <><UserPlus size={11} /> Add</>}
      </button>
    </div>
  )
}

function StepAddMembers({ circleName, circleId, onDone, onBack }) {
  const client = useClient()
  const { t } = useTranslation()

  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [members, setMembers]       = useState([])
  const [saving, setSaving]         = useState(false)

  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  const addedIds = new Set(members.map((m) => m.id))

  const isHandle = HANDLE_RE.test(query.trim())

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    setSearchError(null)
    try {
      const res = await client.feeds.searchUsers({ q, limit: 8 })
      setResults((res?.orderedItems ?? []).map(normalizeUser))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [client])

  const doLookup = async () => {
    const id = query.trim()
    if (!id) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    try {
      const res = await client.feeds.lookupUser({ id })
      const user = normalizeUser(res)
      if (!user.id) throw new Error('User not found')
      setResults([user])
    } catch (err) {
      setSearchError(err.message || 'User not found')
    } finally {
      setSearching(false)
    }
  }

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setSearchError(null)
    if (HANDLE_RE.test(val.trim())) {
      // Full handle — wait for explicit lookup, don't auto-search
      setResults([])
      clearTimeout(debounceRef.current)
    } else {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => doSearch(val.trim()), 300)
    }
  }

  const handleAdd = (user) => {
    if (!addedIds.has(user.id)) setMembers((prev) => [...prev, user])
    setQuery('')
    setResults([])
    searchRef.current?.focus()
  }

  const handleRemove = (id) => setMembers((prev) => prev.filter((m) => m.id !== id))

  const handleDone = async () => {
    if (members.length === 0) { onDone(); return }
    setSaving(true)
    try {
      await client.activities.addToCircle({ circleId, members })
    } catch {
      // Non-fatal — circle exists, members can be added later
    }
    onDone()
  }

  return (
    <div className="flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-0 border-b-2 border-base-300">
        <div className="flex items-center gap-2 flex-1 px-4 py-3">
          {searching
            ? <Loader size={14} className="animate-spin text-base-content/40 shrink-0" />
            : <Search size={14} className="text-base-content/40 shrink-0" />
          }
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && isHandle) { e.preventDefault(); doLookup() } }}
            placeholder={t('circle.addMemberPlaceholder', { defaultValue: 'Name or @user@domain' })}
            className="flex-1 bg-transparent font-ui text-sm focus:outline-none text-base-content placeholder:text-base-content/30"
          />
        </div>
        {isHandle && (
          <button
            type="button"
            onClick={doLookup}
            disabled={searching}
            className="px-4 py-3 border-l border-base-300 font-ui text-xs uppercase tracking-widest text-primary hover:bg-base-200 transition-colors disabled:opacity-40 shrink-0"
          >
            {t('circle.lookup', { defaultValue: 'Look up' })}
          </button>
        )}
      </div>

      {/* Search results */}
      {searchError && (
        <p className="px-4 py-3 font-ui text-xs text-error">{searchError}</p>
      )}
      {results.length > 0 && (
        <div className="border-b-2 border-base-300 max-h-48 overflow-y-auto">
          {results.map((u) => (
            <UserCard key={u.id} user={u} onAdd={handleAdd} added={addedIds.has(u.id)} />
          ))}
        </div>
      )}

      {/* Pending members */}
      <div className="flex flex-col gap-0 min-h-[80px] max-h-48 overflow-y-auto">
        {members.length === 0 ? (
          <p className="px-4 py-6 font-ui text-xs uppercase tracking-widest text-base-content/30 text-center">
            {t('circle.noMembersYet', { defaultValue: 'No members added yet' })}
          </p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 last:border-b-0">
              <div className="w-7 h-7 shrink-0 bg-base-300" style={hexMask}>
                {m.icon && <img src={m.icon} alt={m.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex flex-col gap-0 flex-1 min-w-0">
                <span className="font-ui text-sm font-bold leading-tight truncate">{m.name}</span>
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/40 truncate">{m.id}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="shrink-0 text-base-content/30 hover:text-error transition-colors"
                aria-label={`Remove ${m.name}`}
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-6 py-4 border-t-2 border-base-300">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-base-content transition-colors"
        >
          <ChevronLeft size={12} />
          {t('common.back', { defaultValue: 'Back' })}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
          >
            {t('common.skip', { defaultValue: 'Skip' })}
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={members.length === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {saving && <Loader size={12} className="animate-spin" />}
            {t('circle.addMembers', { defaultValue: 'Add' })}
            {members.length > 0 && ` ${members.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export default function NewCircleModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const [step, setStep]             = useState(1)
  const [circleId, setCircleId]     = useState(null)
  const [circleName, setCircleName] = useState('')

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreated = (id, name) => {
    setCircleId(id)
    setCircleName(name)
    setStep(2)
  }

  const handleDone = () => {
    onCreated?.(circleId)
    onClose()
  }

  const TITLES = {
    1: t('circle.newTitle',    { defaultValue: 'New Circle' }),
    2: t('circle.addPeople',   { defaultValue: 'Add People' }),
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/30"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-base-100 border-2 border-base-300 shadow-xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-base-300">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-3xl leading-none tracking-wide">
              {TITLES[step]}
            </h2>
            {step === 2 && circleName && (
              <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                {circleName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/30">
              {step} / 2
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', { defaultValue: 'Close' })}
              className="text-base-content/40 hover:text-base-content transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {step === 1 && (
          <StepCreate
            onCreated={handleCreated}
            onClose={onClose}
          />
        )}
        {step === 2 && (
          <StepAddMembers
            circleName={circleName}
            circleId={circleId}
            onDone={handleDone}
            onBack={() => setStep(1)}
          />
        )}

      </div>
    </div>
  )
}
