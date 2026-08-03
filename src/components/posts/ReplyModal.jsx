// ReplyModal — popup view of a post's replies + composer.
// Opens from the timeline reply button so the user doesn't lose their scroll position.
// Refetches replies on open; calls onReplied() after each successful submit so
// the parent can bump its local replyCount.
//
// Replies render as the same shallow two-level tree as the full post page (via
// the shared buildReplyTree), with a "Reply" affordance on first-level replies
// only — so threading works identically here and on /posts/:id.

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, ArrowUpRight } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import UserAvatar from '../ui/UserAvatar'
import Spinner from '../ui/Spinner'
import ErrorState from '../ui/ErrorState'
import Reply from './Reply'
import ReplyComposer from './ReplyComposer'
import { buildReplyTree } from '../../lib/replyTree'

export default function ReplyModal({ post, open, onClose, onReplied }) {
  const { t } = useTranslation()
  const client = useClient()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openReplyId, setOpenReplyId] = useState(null)
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

  const updateReply = (next) => setReplies((arr) => arr.map((r) => (r.id === next.id ? next : r)))
  const removeReply = (id) => {
    setReplies((arr) => arr.filter((r) => r.id !== id))
    onReplied?.({ delta: -1 })
  }

  const rootId = post?.id
  const tree = useMemo(() => buildReplyTree(replies, rootId), [replies, rootId])

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
        className="fixed inset-x-2 top-4 h-[calc(100svh-2rem)] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-12 sm:bottom-12 sm:h-auto sm:max-h-[calc(100svh-6rem)] sm:w-full sm:max-w-2xl bg-base-100 border-2 border-secondary z-[90] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b-2 border-base-300 bg-secondary text-secondary-content">
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

        {/* Reply list — shallow 2-level tree */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-5">
          {loading ? (
            <Spinner centered />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : tree.length === 0 ? (
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 py-8 text-center">
              {t('post.noReplies', { defaultValue: 'No replies yet.' })}
            </p>
          ) : (
            tree.map(({ reply, children }) => {
              const composerOpen = openReplyId === reply.id
              return (
                <div key={reply.id}>
                  <Reply
                    reply={reply}
                    onUpdated={updateReply}
                    onDeleted={removeReply}
                    showReply={post?.canReply !== '@none'}
                    replyCount={reply.replyCount ?? 0}
                    onReplyClick={() => setOpenReplyId(composerOpen ? null : reply.id)}
                  />

                  {(children.length > 0 || composerOpen) && (
                    <div className="ml-6 md:ml-11 pl-4 border-l-2 border-base-300">
                      {children.map((child) => (
                        <Reply
                          key={child.id}
                          reply={child}
                          onUpdated={updateReply}
                          onDeleted={removeReply}
                          showReply={false}
                        />
                      ))}

                      {composerOpen && (
                        <ReplyComposer
                          postId={post?.id}
                          inReplyTo={reply.id}
                          canReply={post?.canReply}
                          autoFocus
                          compact
                          placeholder={t('post.threadReplyPlaceholder', {
                            name: reply.actor?.name ?? reply.actor?.id,
                            defaultValue: `Reply to ${reply.actor?.name ?? 'this reply'}…`,
                          })}
                          onCancel={() => setOpenReplyId(null)}
                          onSubmitted={(payload) => {
                            handleSubmitted(payload)
                            setOpenReplyId(null)
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Composer (sticky bottom) — replies to the post */}
        <div className="shrink-0 px-5 pb-4 pt-4 border-t-2 border-base-300 bg-base-100">
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
