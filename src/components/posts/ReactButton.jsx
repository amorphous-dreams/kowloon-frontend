// ReactButton — emoji reaction picker for posts.
// Fetches available reactions from server settings on first use (cached module-level).
// Shows a small popup of emoji options; clicking one fires a React activity.

import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons'
import { useClient } from '../../hooks/useClient'

// Module-level cache so we only fetch once per session
let cachedEmojis = null
let fetchPromise = null

async function getEmojis(client) {
  if (cachedEmojis) return cachedEmojis
  if (!fetchPromise) {
    fetchPromise = client.feeds.getServerInfo()
      .then((info) => {
        cachedEmojis = info?.settings?.reactEmojis ?? DEFAULT_EMOJIS
        return cachedEmojis
      })
      .catch(() => {
        cachedEmojis = DEFAULT_EMOJIS
        return cachedEmojis
      })
  }
  return fetchPromise
}

const DEFAULT_EMOJIS = [
  { emoji: '👍', name: 'Like' },
  { emoji: '❤️', name: 'Love' },
  { emoji: '😂', name: 'Laugh' },
  { emoji: '😮', name: 'Shocked' },
  { emoji: '😭', name: 'Sad' },
  { emoji: '🤬', name: 'Angry' },
]

export default function ReactButton({ post, t }) {
  const client = useClient()
  const [open, setOpen] = useState(false)
  const [emojis, setEmojis] = useState(cachedEmojis ?? DEFAULT_EMOJIS)
  const [pending, setPending] = useState(false)
  const [localCount, setLocalCount] = useState(post?.reactCount ?? 0)
  const [popupBottom, setPopupBottom] = useState(0)
  const buttonRef = useRef(null)
  const popupRef = useRef(null)

  // Load emojis from server (instant if cached)
  useEffect(() => {
    if (!client || cachedEmojis) return
    getEmojis(client).then(setEmojis)
  }, [client])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Position popup above the button; recompute on resize/scroll
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupBottom(window.innerHeight - rect.top + 8)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  const handleReact = async (emoji, name) => {
    if (!client || pending) return
    setOpen(false)
    setPending(true)
    try {
      const res = await client.activities.react({ postId: post.id, emoji, name })
      // Only update local state if a new react was actually created
      if (res?.result?.status !== 'already_reacted') {
        setLocalCount((c) => c + 1)
      }
    } catch (err) {
      console.warn('[ReactButton] react failed:', err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        title={t('post.react')}
        aria-label={t('post.react')}
        className="inline-flex items-center gap-1.5 text-base text-base-content/50 hover:text-base-content transition-colors disabled:opacity-30"
      >
        <FontAwesomeIcon icon={faFaceSmile} />
        {localCount > 0 && (
          <span className="font-ui text-xs tracking-wider">{localCount}</span>
        )}
      </button>

      {open && (
        <div
          ref={popupRef}
          role="menu"
          aria-label={t('post.reactPickerLabel', { defaultValue: 'Choose a reaction' })}
          style={{ bottom: popupBottom }}
          className="fixed left-[5px] right-[5px] flex flex-wrap justify-center gap-0 bg-base-100 border-2 border-primary shadow-lg z-40"
        >
          {emojis.map(({ emoji, name }) => (
            <button
              key={name}
              type="button"
              role="menuitem"
              onClick={() => handleReact(emoji, name)}
              title={name}
              aria-label={name}
              className="px-2.5 py-2 text-xl hover:bg-base-200 transition-colors leading-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
