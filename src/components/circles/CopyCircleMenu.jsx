// CopyCircleMenu — single button + dropdown that lets a logged-in user either:
//   1. Copy a Circle as a brand-new Circle of their own (named "Copy of <X>").
//   2. Add all of the Circle's members into one of their existing Circles
//      (an Add activity rather than a Create).
//
// Designed to be drop-in for the three places that had the old single
// "Copy" button: CirclesPage, UserCirclesPage, CirclePage. Both actions are
// reversible (delete the new circle / remove the new members), so we
// don't bother with a confirmation dialog — one click does the thing.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Copy, Loader2, ChevronDown } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import { fetchMyCircles } from '../../features/circles/myCirclesSlice'
import { toast } from '../../app/toast'

export default function CopyCircleMenu({ circle, className = '', onCopied, onAdded }) {
  const { t } = useTranslation()
  const client = useClient()
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const myCircles = useSelector((state) => state.myCircles.items)

  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)

  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  // Filter out the source circle if it's already one of the user's own —
  // adding its members to itself is a no-op.
  const targets = myCircles.filter((c) => c.id !== circle?.id)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (popoverRef.current?.contains(e.target)) return
      if (triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (busy) return
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAnchorRect(rect)
    }
    setOpen((v) => !v)
  }

  const handleCopy = async () => {
    if (!client || busy) return
    console.log('[CopyCircleMenu] handleCopy: start', { source: circle?.id })
    setBusy(true)
    try {
      const created = await client.activities.createCircle({
        name: t('circle.copyOfName', { name: circle.name, defaultValue: `Copy of ${circle.name}` }),
        description: circle.summary ?? '',
        icon: circle.icon ?? undefined,
        to: circle.to ?? '@public',
      })
      console.log('[CopyCircleMenu] createCircle response', created)
      // /outbox returns createdId at the top level — match it first.
      const newCircleId = created?.createdId
        ?? created?.result?.created?.id
        ?? created?.result?.id
        ?? created?.activity?.object?.id
        ?? created?.id
      console.log('[CopyCircleMenu] resolved newCircleId', newCircleId)
      const members = Array.isArray(circle.members) ? circle.members : []
      if (newCircleId && members.length) {
        await client.activities.addToCircle({ circleId: newCircleId, members })
      }
      dispatch(fetchMyCircles())
      setOpen(false)
      toast.success(
        t('circle.copiedToast', { defaultValue: 'Circle copied' }),
        newCircleId
          ? { action: { label: t('circle.goToNewCircle', { defaultValue: 'Go to new circle' }), to: `/circles/${encodeURIComponent(newCircleId)}` } }
          : undefined,
      )
      onCopied?.(newCircleId)
      console.log('[CopyCircleMenu] handleCopy: done')
    } catch (err) {
      console.warn('[CopyCircleMenu] handleCopy: error', err)
      toast.error(
        t('circle.copyFailed', { defaultValue: 'Copy failed' }),
        { detail: err?.message },
      )
    } finally {
      setBusy(false)
    }
  }

  const handleAddTo = async (targetCircle) => {
    if (!client || busy) return
    setBusy(true)
    try {
      const members = Array.isArray(circle.members) ? circle.members : []
      if (members.length) {
        await client.activities.addToCircle({ circleId: targetCircle.id, members })
      }
      dispatch(fetchMyCircles())
      setOpen(false)
      toast.success(
        t('circle.addedToast', { count: members.length, name: targetCircle.name, defaultValue: `Added ${members.length} members to ${targetCircle.name}` }),
        { action: { label: t('circle.viewCircle', { defaultValue: 'View circle' }), to: `/circles/${encodeURIComponent(targetCircle.id)}` } },
      )
      onAdded?.(targetCircle.id)
    } catch (err) {
      toast.error(
        t('circle.addFailed', { defaultValue: 'Failed to add members' }),
        { detail: err?.message },
      )
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  const ButtonIcon = busy ? Loader2 : Copy

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors disabled:opacity-50 ${className}`}
        title={t('circle.copyOrAdd', { defaultValue: 'Copy or add members' })}
        disabled={busy}
      >
        <ButtonIcon size={12} className={busy ? 'animate-spin' : ''} />
        {t('circle.copy', { defaultValue: 'Copy' })}
        {!busy && <ChevronDown size={11} className="opacity-60" />}
      </button>

      {open && anchorRect && createPortal(
        <div
          ref={popoverRef}
          role="menu"
          className="fixed z-[200] min-w-64 max-w-80 bg-base-100 border-2 border-base-300 shadow-lg"
          style={{
            top: anchorRect.bottom + 4,
            left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 320)),
          }}
        >
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left font-ui text-xs uppercase tracking-widest hover:bg-base-200 transition-colors"
          >
            <Copy size={13} className="text-base-content/50" />
            {t('circle.copyAsNew', { defaultValue: 'Copy as new circle' })}
          </button>

          <div className="border-t border-base-300" />

          <p className="px-4 pt-3 pb-1.5 font-ui text-[10px] uppercase tracking-widest text-base-content/40">
            {t('circle.addMembersTo', { defaultValue: 'Or add members to' })}
          </p>

          {targets.length === 0 ? (
            <p className="px-4 pb-3 font-reading text-sm italic text-base-content/40">
              {t('circle.noOwnCircles', { defaultValue: "You don't have any other circles yet." })}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto pb-1">
              {targets.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleAddTo(c)}
                    className="w-full px-4 py-2 text-left font-reading text-sm text-base-content hover:bg-base-200 transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/40 shrink-0">
                      {c.memberCount ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

        </div>,
        document.body,
      )}
    </>
  )
}
