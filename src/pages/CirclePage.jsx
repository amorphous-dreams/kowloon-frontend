// CirclePage — circle detail: icon, name, description, creator, members.
// Authorized users see the full page. Owners can edit inline and manage members.

import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Share2, Pencil, Trash2, X, Check, UserPlus, UserMinus, Loader } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import UserAvatar from '../components/ui/UserAvatar'
import CircleIcon from '../components/ui/CircleIcon'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

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

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({ member, isOwner, onRemove, removing }) {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-base-300 last:border-b-0 px-2 group">
      <Link
        to={`/users/${encodeURIComponent(member.id)}`}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        {member.icon
          ? <img src={member.icon} alt={member.name} className="w-10 h-10 object-cover shrink-0" style={hexMask} />
          : <div className="w-10 h-10 bg-base-300 shrink-0 flex items-center justify-center" style={hexMask}>
              <CircleIcon type="circle" size="sm" />
            </div>
        }
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-ui text-sm font-bold text-base-content truncate">{member.name ?? member.id}</span>
          <span className="font-ui text-xs uppercase tracking-widest text-base-content/55 truncate">{member.id}</span>
        </div>
      </Link>
      {isOwner && (
        <button
          onClick={() => onRemove(member.id)}
          disabled={removing}
          aria-label={`Remove ${member.name ?? member.id}`}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 border border-error/30 font-ui text-xs uppercase tracking-widest text-error/60 hover:border-error hover:text-error transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
        >
          {removing ? <Loader size={11} className="animate-spin" /> : <UserMinus size={11} />}
        </button>
      )}
    </div>
  )
}

// ── AddMemberRow ──────────────────────────────────────────────────────────────

function AddMemberRow({ circleId, onAdded }) {
  const client = useClient()
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)

  const handleLookup = async () => {
    const val = input.trim()
    if (!val) return
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const res = await client.feeds.getUser({ userId: val })
      const raw = res?.item ?? res
      if (!raw?.id) throw new Error('User not found')
      setPreview({
        id: raw.id,
        name: raw.name ?? raw.profile?.name ?? raw.preferredUsername ?? raw.username,
        icon: raw.icon ?? raw.profile?.icon ?? null,
      })
    } catch (err) {
      setError(err.message || 'User not found')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!preview) return
    setAdding(true)
    setError(null)
    try {
      await client.activities.addToCircle({ circleId, memberId: preview.id })
      onAdded(preview)
      setInput('')
      setPreview(null)
    } catch (err) {
      setError(err.message || 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 pb-4 border-b-2 border-primary mb-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setPreview(null); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          placeholder={t('circle.addMemberPlaceholder', { defaultValue: '@user@domain' })}
          className="flex-1 bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleLookup}
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-base-300 font-ui text-xs uppercase tracking-widest text-base-content/70 hover:bg-base-400 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : t('circle.lookup', { defaultValue: 'Look up' })}
        </button>
      </div>

      {error && <p className="font-ui text-xs text-error">{error}</p>}

      {preview && (
        <div className="flex items-center gap-3 px-3 py-2 bg-base-200 border border-base-300">
          {preview.icon
            ? <img src={preview.icon} alt={preview.name} className="w-8 h-8 object-cover shrink-0" style={hexMask} />
            : <div className="w-8 h-8 bg-base-300 shrink-0" style={hexMask} />
          }
          <div className="flex flex-col gap-0 flex-1 min-w-0">
            <span className="font-ui text-sm font-bold">{preview.name}</span>
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/55">{preview.id}</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader size={11} className="animate-spin" /> : <UserPlus size={11} />}
            {t('circle.addMember', { defaultValue: 'Add' })}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CirclePage() {
  const { id } = useParams()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const { t } = useTranslation()

  const [circle, setCircle]   = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [removingId, setRemovingId] = useState(null)

  // Edit mode state
  const [editing, setEditing]         = useState(false)
  const [editName, setEditName]       = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editTo, setEditTo]           = useState('@public')
  const [editIconFile, setEditIconFile] = useState(null)
  const [editIconPreview, setEditIconPreview] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const iconInputRef = useRef(null)

  const containerRef = useRef(null)
  const [shadowProgress, setShadowProgress] = useState(0)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getCircle({ circleId: id })
      const raw = res?.item ?? res
      setCircle(raw)
      setMembers(raw?.members ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load circle.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  // Scroll-driven shadow on sticky header
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let parent = el.parentElement
    while (parent && getComputedStyle(parent).overflowY === 'visible') parent = parent.parentElement
    if (!parent) return
    const handleScroll = () => setShadowProgress(Math.min(parent.scrollTop / 60, 1))
    parent.addEventListener('scroll', handleScroll, { passive: true })
    return () => parent.removeEventListener('scroll', handleScroll)
  }, [])

  // Seed edit fields from circle data
  const startEditing = () => {
    setEditName(circle.name ?? '')
    setEditSummary(circle.summary ?? '')
    setEditTo(circle.to ?? '@public')
    setEditIconFile(null)
    setEditIconPreview(circle.icon ?? null)
    setSaveError(null)
    setEditing(true)
  }

  const cancelEditing = () => {
    if (editIconPreview && editIconPreview !== circle.icon) {
      URL.revokeObjectURL(editIconPreview)
    }
    setEditing(false)
    setEditIconFile(null)
    setEditIconPreview(null)
  }

  const handleIconChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (editIconPreview && editIconPreview !== circle.icon) URL.revokeObjectURL(editIconPreview)
    setEditIconFile(file)
    setEditIconPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      let iconValue = circle.icon

      if (editIconFile) {
        const uploaded = await client.files.upload({
          file: editIconFile,
          filename: editIconFile.name,
          contentType: editIconFile.type,
          to: '@public',
        })
        if (uploaded?.file?.url) iconValue = uploaded.file.url
      }

      await client.activities.updateCircle({
        circleId: circle.id,
        name: editName.trim(),
        description: editSummary.trim(),
        icon: iconValue,
        to: editTo,
      })

      setCircle((prev) => ({
        ...prev,
        name: editName.trim(),
        summary: editSummary.trim(),
        icon: iconValue,
        to: editTo,
      }))
      setEditing(false)
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    setRemovingId(memberId)
    try {
      await client.activities.removeFromCircle({ circleId: circle.id, memberId })
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setCircle((prev) => ({ ...prev, memberCount: (prev.memberCount ?? members.length) - 1 }))
    } catch {}
    finally { setRemovingId(null) }
  }

  const handleMemberAdded = (member) => {
    setMembers((prev) => [...prev, member])
    setCircle((prev) => ({ ...prev, memberCount: (prev.memberCount ?? members.length) + 1 }))
  }

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!circle) return null

  const isOwner   = !!(authUser && circle.actorId === authUser.id)
  const isLoggedIn = !!authUser
  const currentIcon = editing ? editIconPreview : circle.icon

  return (
    <div ref={containerRef} className="flex flex-col gap-8">

      {/* Sticky header */}
      <div
        className="sticky top-0 bg-base-100 z-10 flex flex-col gap-4 pt-6 pb-6 px-4 border-b-2 border-base-300"
        style={{
          filter: `drop-shadow(${shadowProgress * 8}px ${shadowProgress * 8}px ${shadowProgress * 2}px rgba(0,0,0,${(shadowProgress * 0.35).toFixed(3)}))`,
          transform: `translate(${shadowProgress * -3}px, ${shadowProgress * -3}px)`,
        }}
      >
        <div className="flex items-start gap-4">

          {/* Icon — clickable in edit mode */}
          <button
            type="button"
            onClick={() => editing && iconInputRef.current?.click()}
            className={editing ? 'cursor-pointer opacity-80 hover:opacity-100 transition-opacity shrink-0' : 'shrink-0 cursor-default'}
            aria-label={editing ? t('circle.changeIcon', { defaultValue: 'Change icon' }) : undefined}
          >
            {currentIcon
              ? <img src={currentIcon} alt={circle.name} className="w-20 h-20 object-cover" style={hexMask} />
              : <div className="w-20 h-20 bg-secondary flex items-center justify-center" style={hexMask}>
                  <CircleIcon type="circle" size="lg" className="text-secondary-content opacity-70" />
                </div>
            }
          </button>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleIconChange}
          />

          {/* Info */}
          <div className="flex flex-col gap-3 min-w-0 pt-1 flex-1">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-display text-4xl leading-none tracking-wide bg-transparent border-b-2 border-primary focus:outline-none w-full"
              />
            ) : (
              <h1 className="font-display text-4xl leading-none tracking-wide">{circle.name}</h1>
            )}

            <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-base-content/60">
              {circle.actorId && (
                <Link to={`/users/${encodeURIComponent(circle.actorId)}`} className="hover:text-primary transition-colors">
                  {circle.actor?.name ?? circle.actorId}
                </Link>
              )}
              <span>·</span>
              <span>{members.length} {t('circle.members', { defaultValue: 'members' })}</span>
              {circle.reactCount > 0 && (
                <><span>·</span><span>{circle.reactCount} {t('circle.reacts', { defaultValue: 'reacts' })}</span></>
              )}
            </div>

            {editing ? (
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                placeholder={t('circle.descriptionPlaceholder', { defaultValue: 'Description (optional)' })}
                className="font-reading text-base bg-base-200 border border-base-300 px-3 py-2 focus:outline-none focus:border-primary resize-none w-full"
              />
            ) : circle.summary ? (
              <p className="font-reading text-base text-base-content/80 leading-relaxed">{circle.summary}</p>
            ) : null}

            {editing ? (
              <div className="flex items-center gap-3">
                <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
                  {t('circle.visibility', { defaultValue: 'Visibility' })}
                </label>
                <select
                  value={editTo}
                  onChange={(e) => setEditTo(e.target.value)}
                  className="bg-base-200 border border-base-300 px-3 py-1.5 font-ui text-xs focus:outline-none focus:border-primary"
                >
                  {VISIBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {saveError && <p className="font-ui text-xs text-error">{saveError}</p>}

            {!editing && (
              <Link
                to={`/circles/${encodeURIComponent(circle.id)}/posts`}
                className="self-start flex items-center gap-2 px-4 py-2 bg-base-200 hover:bg-base-300 font-ui text-xs uppercase tracking-widest text-base-content/70 hover:text-base-content transition-colors"
              >
                {t('circle.postsLink')}
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={!editName.trim() || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                  {t('common.save', { defaultValue: 'Save' })}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
                >
                  <X size={12} /> {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
              </>
            ) : (
              <>
                {isLoggedIn && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors">
                    <Copy size={12} /> {t('circle.copy')}
                  </button>
                )}
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors">
                  <Share2 size={12} /> {t('circle.share')}
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
                    >
                      <Pencil size={12} /> {t('common.edit')}
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-error/40 font-ui text-xs uppercase tracking-widest text-error/60 hover:border-error hover:text-error transition-colors">
                      <Trash2 size={12} /> {t('common.delete')}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl tracking-wide">{t('circle.members')}</h2>

        {isOwner && (
          <AddMemberRow circleId={circle.id} onAdded={handleMemberAdded} />
        )}

        {members.length > 0 ? (
          <div className="flex flex-col border-t border-base-300">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={isOwner}
                onRemove={handleRemoveMember}
                removing={removingId === member.id}
              />
            ))}
          </div>
        ) : (
          <p className="font-ui text-sm uppercase tracking-widest text-base-content/45">
            {t('circle.noMembers', { defaultValue: 'No members yet.' })}
          </p>
        )}
      </div>

    </div>
  )
}
