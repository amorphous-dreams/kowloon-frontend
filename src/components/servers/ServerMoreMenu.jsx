// ServerMoreMenu — kebab menu on a remote Server's profile page: block/mute
// the WHOLE server. Same portal-dropdown positioning pattern as
// CopyCircleMenu.jsx.
//
// Mechanism: a Blocked/Muted circle member can be a bare "@domain" entry
// (one @) as well as an individual "@user@domain" — the same shorthand
// already used for server-level Follow. addToCircle/removeFromCircle handle
// this generically; client.moderation is the cache of the account's own
// blocked/muted actor ids + domains used to show the current state.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Ban, BellOff } from 'lucide-react'
import { toast } from '../../app/toast'

export default function ServerMoreMenu({ domain, client, authUser }) {
  const [open, setOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const [state, setState] = useState({ blocked: false, muted: false })
  const [busy, setBusy] = useState(false)

  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!client?.moderation || !domain) return
    let cancelled = false
    client.moderation.load().then((cache) => {
      if (cancelled) return
      const d = domain.toLowerCase()
      setState({ blocked: cache.blockedDomains.has(d), muted: cache.mutedDomains.has(d) })
    })
    return () => { cancelled = true }
  }, [client, domain])

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

  if (!authUser?.id || !domain) return null

  const toggle = () => {
    if (busy) return
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setAnchorRect(rect)
    }
    setOpen((v) => !v)
  }

  const memberId = `@${domain}`

  const toggleBlock = async () => {
    setOpen(false)
    if (state.blocked) {
      if (!window.confirm(`Unblock ${domain}? Everyone on that server will be able to reach you again.`)) return
      setBusy(true)
      try {
        await client.activities.removeFromCircle({ circleId: authUser.blocked, memberId })
        setState((s) => ({ ...s, blocked: false }))
        toast.success(`${domain} unblocked`)
      } catch (err) {
        toast.error('Failed to unblock', { detail: err?.message })
      } finally {
        setBusy(false)
      }
    } else {
      if (!window.confirm(`Block ${domain}? Nothing from this server — no posts, replies, or reacts from anyone on it — will reach you again.`)) return
      setBusy(true)
      try {
        await client.activities.addToCircle({ circleId: authUser.blocked, memberId })
        setState((s) => ({ ...s, blocked: true }))
        toast.success(`${domain} blocked`)
      } catch (err) {
        toast.error('Failed to block', { detail: err?.message })
      } finally {
        setBusy(false)
      }
    }
  }

  const toggleMute = async () => {
    setOpen(false)
    if (state.muted) {
      setBusy(true)
      try {
        await client.activities.removeFromCircle({ circleId: authUser.muted, memberId })
        setState((s) => ({ ...s, muted: false }))
        toast.success(`${domain} unmuted`)
      } catch (err) {
        toast.error('Failed to unmute', { detail: err?.message })
      } finally {
        setBusy(false)
      }
    } else {
      setBusy(true)
      try {
        await client.activities.addToCircle({ circleId: authUser.muted, memberId })
        setState((s) => ({ ...s, muted: true }))
        toast.success(`${domain} muted`)
      } catch (err) {
        toast.error('Failed to mute', { detail: err?.message })
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        className="shrink-0 flex items-center p-2.5 border border-base-300 text-base-content/60 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        title="More options"
      >
        <MoreVertical size={16} />
      </button>

      {open && anchorRect && createPortal(
        <div
          ref={popoverRef}
          role="menu"
          className="fixed z-[200] min-w-56 bg-base-100 border-2 border-base-300 shadow-lg"
          style={{
            top: anchorRect.bottom + 4,
            left: Math.max(8, Math.min(anchorRect.right - 224, window.innerWidth - 232)),
          }}
        >
          <button
            type="button"
            onClick={toggleBlock}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-left font-ui text-xs uppercase tracking-widest hover:bg-base-200 transition-colors ${
              state.blocked ? 'text-base-content' : 'text-error'
            }`}
          >
            <Ban size={13} />
            {state.blocked ? 'Unblock Server' : 'Block Server'}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left font-ui text-xs uppercase tracking-widest text-base-content hover:bg-base-200 transition-colors"
          >
            <BellOff size={13} />
            {state.muted ? 'Unmute Server' : 'Mute Server'}
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
