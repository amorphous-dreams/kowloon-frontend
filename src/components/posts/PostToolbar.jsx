// PostToolbar — react, reply, bookmark, and share actions for a post.
// Auth-aware: shows actions only when appropriate.
// Props: post object

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment, faBookmark, faShareNodes, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import PostComposer from './PostComposer'
import ReactButton from './ReactButton'
import ReplyModal from './ReplyModal'
import BookmarkComposer from '../bookmarks/BookmarkComposer'
import { useClient } from '../../hooks/useClient'

// ── Share helpers ────────────────────────────────────────────────────────────

function buildShareTitle(post) {
  if (post.title ?? post.name) return post.title ?? post.name
  if (post.textPreview) return post.textPreview
  const actor = post.actor?.id ?? post.actorId ?? 'unknown'
  const date = new Date(post.published ?? post.createdAt ?? Date.now())
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
  return `${actor} — ${time}`
}

function buildShareContent(post) {
  // Use source markdown if available, else body text stripped of HTML, else summary
  const raw = post.source?.content
    ?? (post.body ? post.body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null)
    ?? post.summary
    ?? post.content
    ?? ''

  if (!raw) return ''

  const words = raw.trim().split(/\s+/).filter(Boolean)
  const excerpt = words.length <= 100
    ? raw.trim()
    : words.slice(0, 100).join(' ') + '\u2026'

  // Wrap in a Markdown blockquote
  return excerpt.split('\n').map((line) => `> ${line}`).join('\n')
}

function isPublicPost(post) {
  return (
    post.to === '@public' ||
    post.to === 'public' ||
    post.visibility === 'Public' ||
    post.visibility === 'public'
  )
}

// ── ShareButton ──────────────────────────────────────────────────────────────

function ShareButton({ post, t, user }) {
  const [sharing, setSharing] = useState(false)

  if (!user) return null

  const postUrl = post.url ?? (post.id ? `/posts/${encodeURIComponent(post.id)}` : null)
  if (!postUrl) return null

  // Private/server-only posts: render the icon disabled + tooltip explaining
  // why, so users can see the constraint instead of guessing why a button is
  // missing.
  if (!isPublicPost(post)) {
    return (
      <button
        type="button"
        disabled
        title={t('post.shareDisabled', { defaultValue: "Private \u2014 can't be shared" })}
        aria-label={t('post.shareDisabled', { defaultValue: "Private \u2014 can't be shared" })}
        className="text-base text-base-content/20 cursor-not-allowed"
      >
        <FontAwesomeIcon icon={faShareNodes} />
      </button>
    )
  }

  const firstImageAttachment = post.attachments?.find(
    (a) => typeof a?.mediaType === 'string' && a.mediaType.startsWith('image/'),
  )

  const initialValues = {
    type: 'Link',
    href: postUrl,
    title: buildShareTitle(post),
    content: buildShareContent(post),
    featuredImage:
      post.featuredImage ?? post.image ?? firstImageAttachment?.url ?? null,
    tags: ['kowloon'],
    target: post.id ?? null,
    to: 'public',
  }

  return (
    <>
      <button
        onClick={() => setSharing(true)}
        title={t('post.share')}
        aria-label={t('post.share')}
        className="text-base text-base-content/50 hover:text-base-content transition-colors"
      >
        <FontAwesomeIcon icon={faShareNodes} />
      </button>
      {sharing && (
        <PostComposer
          defaultOpen
          initialValues={initialValues}
          onClose={() => setSharing(false)}
          onPostCreated={() => setSharing(false)}
          prompt={t('composer.sharePrompt', { defaultValue: 'Share this post\u2026' })}
        />
      )}
    </>
  )
}

// ── OwnerActions ─────────────────────────────────────────────────────────────

function OwnerActions({ post, t, onDeleted }) {
  const client = useClient()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const editUrl = post?.id ? `/posts/${encodeURIComponent(post.id)}/edit` : null

  const handleDelete = async () => {
    if (!window.confirm(t('post.deleteConfirm', { defaultValue: 'Delete this post? This cannot be undone.' }))) return
    setDeleting(true)
    try {
      await client.activities.deletePost({ postId: post.id })
      if (onDeleted) {
        onDeleted(post.id)
      } else {
        navigate(-1)
      }
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {editUrl && (
        <Link
          to={editUrl}
          title={t('common.edit', { defaultValue: 'Edit' })}
          aria-label={t('common.edit', { defaultValue: 'Edit' })}
          className="text-base text-base-content/50 hover:text-base-content transition-colors"
        >
          <FontAwesomeIcon icon={faPen} />
        </Link>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title={t('common.delete', { defaultValue: 'Delete' })}
        aria-label={t('common.delete', { defaultValue: 'Delete' })}
        className="text-base text-base-content/50 hover:text-error transition-colors disabled:opacity-30"
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </div>
  )
}

// ── PostToolbar ──────────────────────────────────────────────────────────────

export default function PostToolbar({ post, onDeleted }) {
  const { user } = useSelector((state) => state.auth)
  const { t } = useTranslation()
  const [bookmarking, setBookmarking] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyOffset, setReplyOffset] = useState(0)

  const postUrl = post?.url ?? (post?.id ? `/posts/${encodeURIComponent(post.id)}` : null)
  const bookmarkInitial = postUrl ? {
    href: postUrl,
    title: post?.title ?? post?.name ?? undefined,
    image: post?.image ?? post?.featuredImage ?? undefined,
  } : null

  const isOwner = user && post?.actor?.id && user.id === post.actor.id
  const displayedReplyCount = (post?.replyCount ?? 0) + replyOffset

  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Right cluster: actions */}
      <div className="flex items-center ml-auto">
        <div className="flex items-center gap-4">
        {/* Reply */}
        {post?.id && (
          <button
            type="button"
            onClick={() => setReplyOpen(true)}
            title={t('post.reply', { defaultValue: 'Reply' })}
            aria-label={t('post.reply', { defaultValue: 'Reply' })}
            className="inline-flex items-center gap-1.5 text-base text-base-content/50 hover:text-base-content transition-colors"
          >
            <FontAwesomeIcon icon={faComment} />
            {displayedReplyCount > 0 && (
              <span className="font-ui text-xs tracking-wider">{displayedReplyCount}</span>
            )}
          </button>
        )}
        {post?.id && (
          <ReplyModal
            post={post}
            open={replyOpen}
            onClose={() => setReplyOpen(false)}
            onReplied={({ delta = 1 } = {}) => setReplyOffset((n) => n + delta)}
          />
        )}

        {/* React */}
        {user && post?.canReact !== 'none' && (
          <ReactButton post={post} t={t} />
        )}

        {/* Bookmark */}
        {user && bookmarkInitial && (
          <>
            <button
              onClick={() => setBookmarking(true)}
              title={t('post.bookmark')}
              aria-label={t('post.bookmark')}
              className="text-base text-base-content/50 hover:text-base-content transition-colors"
            >
              <FontAwesomeIcon icon={faBookmark} />
            </button>
            {bookmarking && (
              <BookmarkComposer
                initialValues={bookmarkInitial}
                onClose={() => setBookmarking(false)}
              />
            )}
          </>
        )}

        {/* Share */}
        <ShareButton post={post} t={t} user={user} />

        {/* Owner actions (Edit / Delete) */}
        {isOwner && <OwnerActions post={post} t={t} onDeleted={onDeleted} />}
        </div>
      </div>
    </div>
  )
}
