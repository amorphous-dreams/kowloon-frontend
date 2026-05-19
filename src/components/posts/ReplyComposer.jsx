// ReplyComposer — textarea + submit for replying to a post.
// Used inline on PostPage and inside ReplyModal.

import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import UserAvatar from '../ui/UserAvatar'
import { useClient } from '../../hooks/useClient'
import { useDraft } from '../../hooks/useDraft'
import { toast } from '../../app/toast'

export default function ReplyComposer({ postId, canReply, onSubmitted, autoFocus = false }) {
  const { t } = useTranslation()
  const user = useSelector((state) => state.auth.user)
  const client = useClient()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // Per-attempt idempotency key. Reused on retries of the same text so the
  // server's dedupeKey lookup short-circuits duplicate Activity records
  // caused by network blips. Regenerated when the user edits the text.
  const dedupeRef = useRef(null)

  // Draft persistence keyed by the parent post so each thread has its own
  // unsaved-reply slot.
  const draftKey = user && postId ? `reply:${user.id}:${postId}` : null
  const draft = useDraft(draftKey)
  const restoredRef = useRef(false)

  // Restore once per (user × postId).
  useEffect(() => {
    if (restoredRef.current || !draftKey) return
    restoredRef.current = true
    const saved = draft.load()
    if (saved?.text) setText(saved.text)
  }, [draftKey, draft])

  // Save on every edit; clear if the user empties the field. Reply drafts
  // are small and per-thread, so an emptied field is a clean discard signal.
  useEffect(() => {
    if (!draftKey || !restoredRef.current) return
    if (text.trim()) draft.save({ text })
    else draft.clear()
  }, [text, draftKey, draft])

  if (!user) return null

  if (canReply === '@none') {
    return (
      <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 pt-4">
        {t('post.repliesClosed', { defaultValue: 'Replies are closed for this post.' })}
      </p>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() || !client) return
    // Keep the same key across retries of the same text; regenerate when text changed.
    if (!dedupeRef.current || dedupeRef.current.text !== text) {
      const key = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
      dedupeRef.current = { key, text }
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await client.activities.reply({ postId, content: text, dedupeKey: dedupeRef.current.key })
      setText('')
      dedupeRef.current = null
      draft.clear()
      onSubmitted?.({ duplicated: !!res?.duplicated })
      if (!res?.duplicated) {
        toast.success(
          t('post.replySentToast', { defaultValue: 'Reply sent' }),
          { action: { label: t('post.viewPost', { defaultValue: 'View post' }), to: `/posts/${encodeURIComponent(postId)}` } },
        )
      }
    } catch (err) {
      setError(err.message || 'Failed to post reply.')
      toast.error(t('post.replyFailedToast', { defaultValue: 'Failed to post reply' }), { detail: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 pt-4">
      <div className="shrink-0">
        <UserAvatar user={user} size="sm" />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('post.replyPlaceholder', { defaultValue: 'Write a reply…' })}
          rows={3}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-reading text-sm text-base-content placeholder:text-base-content/30 resize-none transition-colors"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui text-xs text-base-content/30 uppercase tracking-widest">
            {t('post.replyHint', { defaultValue: 'Cmd/Ctrl+Enter to submit' })}
          </span>
          <div className="flex items-center gap-3">
            {error && <span className="font-ui text-xs uppercase tracking-widest text-error">{error}</span>}
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={12} />
              {submitting ? t('post.replying', { defaultValue: 'Replying…' }) : t('post.reply', { defaultValue: 'Reply' })}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
