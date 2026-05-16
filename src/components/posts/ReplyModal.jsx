// ReplyModal — popup view of a post's replies + composer.
// Opens from the timeline reply button so the user doesn't lose their scroll position.
// Refetches replies on open; calls onReplied() after each successful submit so
// the parent can bump its local replyCount.

import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, ArrowUpRight } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import UserAvatar from '../ui/UserAvatar'
import Spinner from '../ui/Spinner'
import ErrorState from '../ui/ErrorState'
import Reply from './Reply'
import ReplyComposer from './ReplyComposer'

export default function ReplyModal({ post, open, onClose, onReplied }) {
  const { t } = useTranslation()
  const client = useClient()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(null)

  const load = useCallback(async () => {
    if (!client || !post?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.getReplies({ postId: post.id })
      setReplies(res?.orderedItems ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load replies.')
    } finally {
      setLoading(false)
    }
  }, [client, post?.id])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const handleSubmitted = useCallback(async ({ duplicated } = {}) => {
    if (!duplicated) onReplied?.({ delta: 1 })
    await load()
    // Scroll the list to the bottom so the user sees their new reply
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }, [load, onReplied])

  if (!open) return null

  const title = post?.title || post?.name || post?.textPreview || t('post.untitled', { defaultValue: 'Post' })
  const author = post?.actor ?? {}
  const postUrl = post?.id ? `/posts/${encodeURIComponent(post.id)}` : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/50 z-[80]"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('post.repliesModal', { defaultValue: 'Replies' })}
        className="fixed inset-x-2 top-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-12 sm:bottom-12 sm:w-full sm:max-w-2xl bg-base-100 border-2 border-secondary z-[90] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b-2 border-base-300 bg-secondary text-secondary-content">
          <div className="shrink-0">
            <UserAvatar user={author} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg leading-tight tracking-wide line-clamp-2">{title}</p>
            <p className="font-ui text-xs uppercase tracking-widest text-secondary-content/60 mt-0.5 truncate">
              {author.name ?? author.displayName ?? author.id ?? ''}
            </p>
          </div>
          {postUrl && (
            <Link
              to={postUrl}
              onClick={onClose}
              title={t('post.openFull', { defaultValue: 'Open full post' })}
              aria-label={t('post.openFull', { defaultValue: 'Open full post' })}
              className="p-1 text-secondary-content/60 hover:text-secondary-content transition-colors"
            >
              <ArrowUpRight size={18} />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            className="p-1 text-secondary-content/60 hover:text-secondary-content transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Reply list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <Spinner centered />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : replies.length === 0 ? (
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 py-8 text-center">
              {t('post.noReplies', { defaultValue: 'No replies yet.' })}
            </p>
          ) : (
            replies.map((reply) => (
              <Reply
                key={reply.id}
                reply={reply}
                onUpdated={(next) => setReplies((arr) => arr.map((r) => r.id === next.id ? next : r))}
                onDeleted={(id) => {
                  setReplies((arr) => arr.filter((r) => r.id !== id))
                  onReplied?.({ delta: -1 })
                }}
              />
            ))
          )}
        </div>

        {/* Composer (sticky bottom) */}
        <div className="px-5 pb-4 border-t-2 border-base-300 bg-base-100">
          <ReplyComposer
            postId={post?.id}
            canReply={post?.canReply}
            onSubmitted={handleSubmitted}
          />
        </div>
      </div>
    </>
  )
}
