// CircleForm — shared form for creating and editing circles.
// Props:
//   initialValues: { name, description, to, iconUrl, members: MemberObject[] }
//   onSubmit(data): called with { name, description, to, iconFile, iconUrl, members }
//   mode: 'create' | 'edit'
//   submitting: bool
//   error: string | null
//   cancelHref: string                — used when rendered as a page (Link target)
//   onCancel: () => void              — used when embedded (e.g. inside a modal); takes precedence over cancelHref
//   embedded: bool                    — suppresses the form's own sticky title (host shell provides one)

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader, UserPlus, X } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
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
  { value: '', label: 'Private (only you)' },
]

// ── MemberChip ────────────────────────────────────────────────────────────────

function MemberChip({ member, onRemove }) {
  const display = member.name ?? member.id
  const sub = member.name ? member.id : null
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-base-200 border border-base-300">
      {member.icon
        ? <img src={member.icon} alt={display} className="w-7 h-7 rounded-full object-cover shrink-0" />
        : <div className="w-7 h-7 rounded-full bg-base-300 shrink-0" />
      }
      <div className="flex flex-col gap-0 flex-1 min-w-0">
        <span className="font-ui text-sm font-bold leading-none truncate">{display}</span>
        {sub && <span className="font-ui text-xs uppercase tracking-widest text-base-content/50 truncate">{sub}</span>}
      </div>
      <button
        type="button"
        onClick={() => onRemove(member.id)}
        aria-label={`Remove ${display}`}
        className="shrink-0 text-base-content/40 hover:text-error transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── AddMemberRow ──────────────────────────────────────────────────────────────

function AddMemberRow({ onAdd, existingIds }) {
  const client = useClient()
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    const val = input.trim()
    if (!val) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await client.feeds.http.get('/users/search', { params: { q: val } })
      const items = res?.orderedItems ?? []
      if (items.length === 0) setError('No users found')
      setResults(items)
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (user) => {
    if (existingIds.has(user.id)) {
      setError('Already in member list')
      return
    }
    onAdd({ id: user.id, name: user.name, icon: user.icon })
    setInput('')
    setResults([])
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setResults([]); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder={t('circle.addMemberPlaceholder', { defaultValue: 'Search by name or @handle' })}
          className="flex-1 bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-base-300 font-ui text-xs uppercase tracking-widest text-base-content/70 hover:bg-base-content/20 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : t('circle.lookup', { defaultValue: 'Search' })}
        </button>
      </div>

      {error && <p className="font-ui text-xs text-error">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col border border-base-300">
          {results.map((user) => {
            const alreadyAdded = existingIds.has(user.id)
            return (
              <div key={user.id} className="flex items-center gap-3 bg-base-200 border-b border-base-300 last:border-b-0 hover:bg-base-300/40 transition-colors">
                {/* Whole row clickable — name/icon/id all add the user */}
                <button
                  type="button"
                  onClick={() => handleAdd(user)}
                  disabled={alreadyAdded}
                  className="flex items-center gap-3 px-3 py-2 flex-1 min-w-0 text-left disabled:cursor-default"
                  title={alreadyAdded
                    ? t('circle.alreadyAdded', { defaultValue: 'Already in member list' })
                    : t('circle.addMember', { defaultValue: 'Add' })
                  }
                >
                  {user.icon
                    ? <img src={user.icon} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-base-300 shrink-0" />
                  }
                  <div className="flex flex-col gap-0 flex-1 min-w-0">
                    <span className="font-ui text-sm font-bold truncate">{user.name}</span>
                    <span className="font-ui text-xs tracking-widest text-base-content/50 truncate">{user.id}</span>
                  </div>
                </button>
                {/* Explicit Add affordance — same handler as the row */}
                <button
                  type="button"
                  onClick={() => handleAdd(user)}
                  disabled={alreadyAdded}
                  className="flex items-center gap-1.5 mr-3 px-3 py-1.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
                >
                  <UserPlus size={11} />
                  {t('circle.addMember', { defaultValue: 'Add' })}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CircleForm ────────────────────────────────────────────────────────────────

function normalizeMember(m) {
  if (typeof m === 'string') return { id: m }
  return { id: m.id, name: m.name ?? null, icon: m.icon ?? null, ...m }
}

export default function CircleForm({
  initialValues = {},
  onSubmit,
  mode = 'create',
  submitting = false,
  error = null,
  cancelHref = '/circles',
  onCancel = null,
  embedded = false,
}) {
  const { t } = useTranslation()

  const [name, setName] = useState(initialValues.name ?? '')
  const [description, setDescription] = useState(initialValues.description ?? '')
  const [to, setTo] = useState(initialValues.to ?? '@public')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(initialValues.iconUrl ?? null)
  const [members, setMembers] = useState(() =>
    (initialValues.members ?? []).map(normalizeMember)
  )
  const iconInputRef = useRef(null)

  const existingIds = new Set(members.map((m) => m.id))

  const handleIconChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (iconPreview && iconFile) URL.revokeObjectURL(iconPreview)
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), to, iconFile, iconUrl: iconPreview, members })
  }

  const isCreate = mode === 'create'
  const isCopy = isCreate && !!initialValues.name

  const submitLabel = mode === 'edit'
    ? t('common.saveChanges', { defaultValue: 'Save Changes' })
    : isCopy
      ? t('circle.createCopy', { defaultValue: 'Create Copy' })
      : t('circle.create', { defaultValue: 'Create Circle' })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-6">

      {/* Title (hidden when embedded — host shell provides its own) */}
      {!embedded && (
        <div className="pt-6 pb-5 border-b-2 border-base-300">
          <h1 className="font-display text-4xl leading-none tracking-wide">
            {mode === 'edit'
              ? t('circle.editTitle', { defaultValue: 'Edit Circle' })
              : isCopy
                ? t('circle.copyTitle', { defaultValue: 'Copy Circle' })
                : t('circle.newTitle', { defaultValue: 'New Circle' })
            }
          </h1>
        </div>
      )}

      {error && (
        <p className="font-ui text-sm text-error border border-error/30 px-4 py-3">{error}</p>
      )}

      {/* Icon + core fields */}
      <div className="flex items-start gap-6">
        <button
          type="button"
          onClick={() => iconInputRef.current?.click()}
          aria-label={t('circle.changeIcon', { defaultValue: 'Change icon' })}
          className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity shrink-0"
        >
          {iconPreview
            ? <img src={iconPreview} alt="Circle icon" className="w-24 h-24 object-cover" style={hexMask} />
            : <div className="w-24 h-24 bg-base-300 flex items-center justify-center" style={hexMask}>
                <CircleIcon type="circle" size="lg" className="opacity-40" />
              </div>
          }
          <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 text-center mt-1">
            {t('circle.icon', { defaultValue: 'Icon' })}
          </p>
        </button>
        <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />

        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
              {t('circle.name', { defaultValue: 'Name' })} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('circle.namePlaceholder', { defaultValue: 'Circle name' })}
              required
              autoFocus={!initialValues.name}
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
              rows={3}
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
        </div>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-wide border-b border-base-300 pb-3">
          {t('circle.members', { defaultValue: 'Members' })}
          {members.length > 0 && (
            <span className="font-ui text-sm font-normal tracking-widest text-base-content/50 ml-3">
              {members.length}
            </span>
          )}
        </h2>

        <AddMemberRow onAdd={(m) => setMembers((prev) => [...prev, m])} existingIds={existingIds} />

        {members.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {members.map((member) => (
              <MemberChip
                key={member.id}
                member={member}
                onRemove={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons — at the bottom, conventional submit-form layout */}
      <div className="flex items-center justify-end gap-2 pt-5 border-t-2 border-base-300">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
        ) : (
          <Link
            to={cancelHref}
            className="px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Link>
        )}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
        >
          {submitting && <Loader size={12} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>

    </form>
  )
}
