// ReactButton — emoji reaction picker for posts.
// Fetches available reactions from server settings on first use (cached module-level).
// Shows a small popup of emoji options; clicking one fires a React activity.

import { useState, useEffect, useRef } from 'react'
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
  const [localPreview, setLocalPreview] = useState(post?.reactPreview ?? null)
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

  const handleReact = async (emoji, name) => {
    if (!client || pending) return
    setOpen(false)
    setPending(true)
    try {
      await client.activities.react({ postId: post.id, emoji, name })
      setLocalCount((c) => c + 1)
      setLocalPreview((prev) => prev ?? emoji)
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
        className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors disabled:opacity-30"
      >
        {localPreview && <span className="mr-1">{localPreview}</span>}{t('post.react')}{localCount > 0 ? ` (${localCount})` : ''}
      </button>

      {open && (
        <div
          ref={popupRef}
          role="menu"
          aria-label={t('post.reactPickerLabel', { defaultValue: 'Choose a reaction' })}
          className="absolute bottom-full left-0 mb-2 flex gap-0 bg-base-100 border-2 border-primary shadow-lg z-40"
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
