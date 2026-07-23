// BookmarkActionMenu — owner-only context menu for a bookmark or folder.
// Mirrors the mobile BookmarkActionSheet: Edit / Move to folder / Delete.
// Renders a kebab button; the sub-modals live here so the whole owner flow is
// in one place. `onMutated` fires after a successful edit/move/delete so the
// owning tree can refresh.

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, X, Folder, FolderOpen } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import { toast } from '../../app/toast'

const VISIBILITY_OPTIONS = [
  { value: '@public', label: 'Public' },
  { value: '@server', label: 'Server only' },
]

// ── Menu ────────────────────────────────────────────────────────────────────

export default function BookmarkActionMenu({ node, allFolders = [], onMutated }) {
  const client = useClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(null) // null | 'edit' | 'move'
  const [busy, setBusy] = useState(false)

  const isFolder = node.type === 'Folder'

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  const handleDelete = async () => {
    setOpen(false)
    const message = isFolder
      ? 'Delete this folder? Everything inside it will also be deleted. This cannot be undone.'
      : 'Delete this bookmark? This cannot be undone.'
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      await client.activities.deleteBookmark({ bookmarkId: node.id })
      onMutated?.()
    } catch (e) {
      toast.error("Couldn't delete", { detail: e?.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
          disabled={busy}
          aria-label="Bookmark actions"
          className="p-1.5 text-base-content/40 hover:text-base-content transition-colors disabled:opacity-30"
        >
          <MoreHorizontal size={16} />
        </button>
        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-1 z-30 min-w-[10rem] bg-base-100 border-2 border-primary shadow-lg flex flex-col"
          >
            <button
              type="button"
              onClick={() => { setOpen(false); setMode('edit') }}
              className="text-left px-4 py-2.5 font-ui text-sm text-base-content hover:bg-base-200 transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setMode('move') }}
              className="text-left px-4 py-2.5 font-ui text-sm text-base-content hover:bg-base-200 transition-colors"
            >
              Move to folder…
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-left px-4 py-2.5 font-ui text-sm text-error hover:bg-base-200 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {mode === 'edit' && (
        <EditBookmarkModal
          node={node}
          client={client}
          onClose={() => setMode(null)}
          onSaved={() => { setMode(null); onMutated?.() }}
        />
      )}
      {mode === 'move' && (
        <MoveBookmarkModal
          node={node}
          allFolders={allFolders}
          client={client}
          onClose={() => setMode(null)}
          onMoved={() => { setMode(null); onMutated?.() }}
        />
      )}
    </>
  )
}

// ── Edit modal ──────────────────────────────────────────────────────────────

function EditBookmarkModal({ node, client, onClose, onSaved }) {
  const isFolder = node.type === 'Folder'
  const [title, setTitle] = useState(node.title || '')
  const [href, setHref] = useState(node.href || node.target || '')
  const [to, setTo] = useState(node.to || '@public')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSave = !!title.trim() && (isFolder || !!href.trim()) && !saving

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const updates = { bookmarkId: node.id, title: title.trim(), to }
      if (!isFolder) updates.href = href.trim()
      await client.activities.updateBookmark(updates)
      onSaved?.()
    } catch (e) {
      setError(e?.message || "Couldn't save changes.")
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="bg-base-100 w-full max-w-md flex flex-col border-2 border-primary shadow-2xl max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-base-300 bg-secondary shrink-0">
          <h2 className="font-display text-2xl text-secondary-content tracking-wide">
            {isFolder ? 'Edit Folder' : 'Edit Bookmark'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-secondary-content/70 hover:text-secondary-content transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
              {isFolder ? 'Folder name' : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {!isFolder && (
            <div className="flex flex-col gap-1">
              <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">URL</label>
              <input
                type="url"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://..."
                className="w-full bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">Visibility</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="font-ui text-xs text-error">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-base-300 shrink-0">
          <button onClick={onClose} className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-6 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Move modal ──────────────────────────────────────────────────────────────

function MoveBookmarkModal({ node, allFolders, client, onClose, onMoved }) {
  const [selected, setSelected] = useState(node.parentFolder || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Can't move a folder into itself; server also rejects descendant cycles.
  const options = useMemo(
    () => allFolders.filter((f) => f.id !== node.id),
    [allFolders, node.id]
  )

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleMove = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await client.activities.updateBookmark({ bookmarkId: node.id, parentFolder: selected || null })
      onMoved?.()
    } catch (e) {
      setError(e?.message || "Couldn't move.")
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="bg-base-100 w-full max-w-md flex flex-col border-2 border-primary shadow-2xl max-h-[80dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-base-300 bg-secondary shrink-0">
          <h2 className="font-display text-2xl text-secondary-content tracking-wide">Move to…</h2>
          <button onClick={onClose} aria-label="Close" className="text-secondary-content/70 hover:text-secondary-content transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto flex-1">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`flex items-center gap-2 px-6 py-3 text-left hover:bg-base-200 transition-colors border-b border-base-300 ${selected === null ? 'bg-primary/10' : ''}`}
          >
            <FolderOpen size={16} className="text-base-content/55 shrink-0" />
            <span className="font-ui text-sm text-base-content">(Top level)</span>
          </button>
          {options.length === 0 ? (
            <p className="font-ui text-sm text-base-content/55 px-6 py-6 text-center">No other folders yet.</p>
          ) : (
            options.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f.id)}
                className={`flex items-center gap-2 px-6 py-3 text-left hover:bg-base-200 transition-colors border-b border-base-300 last:border-b-0 ${selected === f.id ? 'bg-primary/10' : ''}`}
              >
                <Folder size={16} className="text-primary shrink-0" />
                <span className="font-ui text-sm text-base-content truncate">{f.title || 'Untitled folder'}</span>
              </button>
            ))
          )}
        </div>

        {error && <p className="font-ui text-xs text-error px-6 py-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-base-300 shrink-0">
          <button onClick={onClose} className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {saving ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
