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

// Audience tier of a post, for gating reshares (#47), mirroring mobile's
// PostActionBar:
//   "public"     → @public: reshareable anywhere.
//   "server"     → @<domain>: reshareable only to the server community.
//   "restricted" → a circle/group/self address: not reshareable at all.
function postAudienceTier(post) {
  if (isPublicPost(post)) return 'public'
  const to = String(post?.to ?? '').trim()
  if (to.startsWith('circle:') || to.startsWith('group:')) return 'restricted'
  // @user@domain (two @s) = addressed to a specific user (self / private).
  if (/^@[^@\s]+@[^@\s]+$/.test(to)) return 'restricted'
  // @domain (single @, not @public) = server / community.
  if (/^@[a-z0-9.-]+$/i.test(to)) return 'server'
  return 'restricted' // unknown addressing → fail closed
}

// ── ShareButton ──────────────────────────────────────────────────────────────

function ShareButton({ post, t, user }) {
  const [sharing, setSharing] = useState(false)

  if (!user) return null

  const postUrl = post.url ?? (post.id ? `/posts/${encodeURIComponent(post.id)}` : null)
  if (!postUrl) return null

  const tier = postAudienceTier(post)

  // Circle/group/user-addressed posts can't be reshared at all (a reshare must
  // never leak a post to a wider audience than the original, #47). Render the
  // icon disabled + tooltip so users see the constraint rather than a missing
  // button.
  if (tier === 'restricted') {
    return (
      <button
        type="button"
        disabled
        title={t('post.reshareRestricted', { defaultValue: "Shared with a specific circle \u2014 can't be reshared" })}
        aria-label={t('post.reshareRestricted', { defaultValue: "Shared with a specific circle \u2014 can't be reshared" })}
        className="text-base text-base-content/20 cursor-not-allowed"
      >
        <FontAwesomeIcon icon={faShareNodes} />
      </button>
    )
  }

  const firstImageAttachment = post.attachments?.find(
    (a) => typeof a?.mediaType === 'string' && a.mediaType.startsWith('image/'),
  )

  // Public posts reshare to anyone; server-only posts cap the reshare audience
  // to the server community so the reshare can't be widened to Public (#47).
  const reshareAudience = tier === 'server' ? 'server' : 'public'

  const initialValues = {
    type: 'Link',
    href: postUrl,
    title: buildShareTitle(post),
    content: buildShareContent(post),
    featuredImage:
      post.featuredImage ?? post.image ?? firstImageAttachment?.url ?? null,
    tags: ['kowloon'],
    target: post.id ?? null,
    to: reshareAudience,
    // Constraint carried through to the composer's audience picker (matches
    // mobile's `constrain` param) so a Community post can't be widened.
    ...(tier === 'server' ? { constrain: 'server' } : {}),
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
