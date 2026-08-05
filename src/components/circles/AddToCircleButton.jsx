// AddToCircleButton — split button for adding a target user to one of the
// viewer's circles. Left half adds to the viewer's default circle on click;
// right half drops down a list of all circles plus "Add to New Circle".

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, Check, Plus, ChevronDown } from 'lucide-react'
import { sortByPins } from '@kowloon/client'
import { useClient } from '../../hooks/useClient'
import { toast } from '../../app/toast'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function resolveDefaultCircle(circles, authUser) {
  if (!circles?.length) return null
  const prefId      = authUser?.prefs?.defaultCircleView
  const followingId = authUser?.circles?.following
  return (
    (prefId      && circles.find((c) => c.id === prefId)) ||
    (followingId && circles.find((c) => c.id === followingId)) ||
    circles.find((c) => c.name === 'Following') ||
    circles[0]
  )
}

export default function AddToCircleButton({ user }) {
  const client   = useClient()
  const navigate = useNavigate()
  const { t }    = useTranslation()
  const { items: myCircles, status } = useSelector((state) => state.myCircles)
  const authUser = useSelector((state) => state.auth.user)
  // Show circles in the user's pin order, matching the feed selector.
  const orderedCircles = useMemo(
    () => sortByPins(myCircles, authUser?.prefs?.pinnedCircles || []),
    [myCircles, authUser?.prefs?.pinnedCircles]
  )

  const [open, setOpen]           = useState(false)
  const [addedIds, setAddedIds]   = useState(new Set())
  const [pendingId, setPendingId] = useState(null)
  const ref = useRef(null)

  const defaultCircle = useMemo(
    () => resolveDefaultCircle(myCircles, authUser),
    [myCircles, authUser]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Seed the "already added" state from real membership so the ✓ persists
  // across reloads and navigation (the tester saw it reset otherwise). Asks the
  // server which of the viewer's circles already contain this user.
  useEffect(() => {
    if (!client || !user?.id || !authUser?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await client.feeds.getUserCircles({
          userId: authUser.id,
          contains: user.id,
          limit: 100,
        })
        const items = res?.orderedItems ?? res?.items ?? []
        const ids = items.filter((c) => c.contains).map((c) => c.id)
        if (!cancelled && ids.length) setAddedIds(new Set(ids))
      } catch {
        // Non-fatal — the button still works, it just won't pre-mark membership.
      }
    })()
    return () => { cancelled = true }
  }, [client, user?.id, authUser?.id])

  const handleAdd = async (circle) => {
    if (!circle || addedIds.has(circle.id) || pendingId) return
    setPendingId(circle.id)
    try {
      await client.activities.addToCircle({ circleId: circle.id, memberId: user.id })
      setAddedIds((prev) => new Set([...prev, circle.id]))
      toast.success(
        t('user.addedToCircle', {
          defaultValue: 'Added {{name}} to {{circle}}',
          name: user.name ?? user.handle ?? user.id,
          circle: circle.name,
        }),
        { action: { label: t('user.viewCircle', { defaultValue: 'View' }), to: `/circles/${encodeURIComponent(circle.id)}` } }
      )
    } catch (err) {
      toast.error(
        t('user.addToCircleFailed', { defaultValue: "Couldn't add to {{circle}}", circle: circle.name }),
        { detail: err?.message }
      )
    } finally {
      setPendingId(null)
    }
  }

  const handleNewCircle = () => {
    setOpen(false)
    navigate('/circles/new', {
      state: { members: [{ id: user.id, name: user.name ?? user.id }] },
    })
  }

  const defaultAdded   = defaultCircle && addedIds.has(defaultCircle.id)
  const defaultPending = defaultCircle && pendingId === defaultCircle.id

  return (
    <div ref={ref} className="relative inline-flex">
      {/* Shared border frame wrapping both halves */}
      <div className="inline-flex border border-base-300 hover:border-primary transition-colors group">
        {/* Left: Add To <action> — adds to default circle */}
        <button
          type="button"
          onClick={() => defaultCircle ? handleAdd(defaultCircle) : setOpen(true)}
          disabled={!!defaultPending || !!defaultAdded}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 text-base-content/70 group-hover:text-primary font-ui text-xs uppercase tracking-widest transition-colors disabled:cursor-default"
          title={defaultCircle ? t('user.addToCircleNamed', { defaultValue: 'Add to {{name}}', name: defaultCircle.name }) : t('user.addToCircle', { defaultValue: 'Add to Circle' })}
        >
          {defaultAdded
            ? <Check size={12} className="text-success" />
            : <UserPlus size={12} />
          }
          {t('user.addTo', { defaultValue: 'Add to' })}
        </button>

        {/* Thin internal separator */}
        <div className="w-px bg-base-300 self-stretch" />

        {/* Right: Default circle name + chevron — opens picker */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-base-100 text-base-content/80 font-ui text-xs uppercase tracking-widest transition-colors"
        >
          <span className="truncate max-w-[10rem]">
            {defaultCircle?.name ?? t('user.circle', { defaultValue: 'Circle' })}
          </span>
          <ChevronDown size={10} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 bg-base-100 border-2 border-primary z-50"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-base-300">
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/50">
              {t('user.addToCirclePrompt', { defaultValue: 'Add' })}
            </span>{' '}
            <span className="font-ui text-xs uppercase tracking-widest text-base-content/80 truncate">
              {user.handle ?? user.id}
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
            {orderedCircles.map((circle) => {
              const added   = addedIds.has(circle.id)
              const pending = pendingId === circle.id
              const isDefault = circle.id === defaultCircle?.id
              return (
                <button
                  key={circle.id}
                  role="menuitem"
                  onClick={() => { handleAdd(circle); setOpen(false) }}
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
                    {isDefault && (
                      <span className="ml-2 text-base-content/40 normal-case tracking-normal">
                        ({t('user.default', { defaultValue: 'default' })})
                      </span>
                    )}
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
