// AddToCircleButton — popover that lets the logged-in user add a target user
// to one of their own circles, or navigate to create a new circle with the
// target user pre-populated.

import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, Check, Plus, ChevronDown } from 'lucide-react'
import { useClient } from '../../hooks/useClient'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

export default function AddToCircleButton({ user }) {
  const client   = useClient()
  const navigate = useNavigate()
  const { t }    = useTranslation()
  const { items: myCircles, status } = useSelector((state) => state.myCircles)

  const [open, setOpen]         = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())
  const [pendingId, setPendingId] = useState(null)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAdd = async (circle) => {
    if (addedIds.has(circle.id) || pendingId) return
    setPendingId(circle.id)
    try {
      await client.activities.addToCircle({ circleId: circle.id, memberId: user.id })
      setAddedIds((prev) => new Set([...prev, circle.id]))
    } catch {}
    finally { setPendingId(null) }
  }

  const handleNewCircle = () => {
    setOpen(false)
    navigate('/circles/new', {
      state: { members: [{ id: user.id, name: user.name ?? user.id }] },
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
      >
        <UserPlus size={12} />
        {t('user.addToCircle', { defaultValue: 'Add to Circle' })}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-1 w-64 bg-base-100 border-2 border-primary z-50"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-base-300">
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
              {t('user.addToCirclePrompt', { defaultValue: 'Add' })}
            </span>{' '}
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/80 truncate">
              {user.id}
            </span>{' '}
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
              {t('user.addToCircleTo', { defaultValue: 'to' })}…
            </span>
          </div>

          {/* Circle list */}
          <div className="max-h-56 overflow-y-auto">
            {status === 'loading' && (
              <div className="px-4 py-3 font-ui text-xs uppercase tracking-widest text-base-content/40">
                {t('common.loading', { defaultValue: 'Loading…' })}
              </div>
            )}
            {status !== 'loading' && myCircles.length === 0 && (
              <div className="px-4 py-3 font-ui text-xs uppercase tracking-widest text-base-content/40">
                {t('circle.noCirclesYet', { defaultValue: 'No circles yet' })}
              </div>
            )}
            {myCircles.map((circle) => {
              const added   = addedIds.has(circle.id)
              const pending = pendingId === circle.id
              return (
                <button
                  key={circle.id}
                  role="menuitem"
                  onClick={() => handleAdd(circle)}
                  disabled={added || !!pendingId}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-base-300 last:border-b-0 hover:bg-base-200 transition-colors text-left disabled:cursor-default"
                >
                  {circle.icon ? (
                    <img
                      src={circle.icon}
                      alt=""
                      className="w-5 h-5 object-cover shrink-0"
                      style={hexMask}
                    />
                  ) : (
                    <div className="w-5 h-5 bg-primary shrink-0" style={hexMask} />
                  )}
                  <span className={`font-ui text-xs uppercase tracking-widest flex-1 truncate ${added ? 'text-base-content/40' : 'text-base-content/80'}`}>
                    {circle.name}
                  </span>
                  {added   && <Check size={11} className="text-success shrink-0" />}
                  {pending && <span className="font-ui text-xs text-base-content/30">…</span>}
                </button>
              )
            })}
          </div>

          {/* New circle footer */}
          <button
            role="menuitem"
            onClick={handleNewCircle}
            className="w-full flex items-center gap-2 px-4 py-2.5 border-t-2 border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:bg-base-200 hover:text-primary transition-colors"
          >
            <Plus size={12} />
            {t('circle.addToNewCircle', { defaultValue: 'Add to New Circle' })}
          </button>
        </div>
      )}
    </div>
  )
}
