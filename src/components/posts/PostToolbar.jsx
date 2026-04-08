// PostToolbar — react, reply, bookmark, and share actions for a post.
// Auth-aware: shows actions only when appropriate.
// Props: post object

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import PostComposer from './PostComposer'
import ReactButton from './ReactButton'
import BookmarkComposer from '../bookmarks/BookmarkComposer'

// ── Share helpers ────────────────────────────────────────────────────────────

function buildShareTitle(post) {
  if (post.title ?? post.name) return post.title ?? post.name
  const actor = post.attributedTo?.id ?? post.actorId ?? 'unknown'
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

  if (!user || !isPublicPost(post)) return null

  const postUrl = post.url ?? (post.id ? `/posts/${encodeURIComponent(post.id)}` : null)
  if (!postUrl) return null

  const initialValues = {
    type: 'Link',
    href: postUrl,
    title: buildShareTitle(post),
    content: buildShareContent(post),
    featuredImage: post.featuredImage ?? post.image ?? null,
    target: post.id ?? null,
    to: 'public',
  }

  return (
    <>
      <button
        onClick={() => setSharing(true)}
        className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors ml-auto"
      >
        {t('post.share')}
      </button>
      {sharing && (
        <PostComposer
          circles={[]}
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

// ── PostToolbar ──────────────────────────────────────────────────────────────

export default function PostToolbar({ post }) {
  const { user } = useSelector((state) => state.auth)
  const { t } = useTranslation()
  const [bookmarking, setBookmarking] = useState(false)

  const postUrl = post?.url ?? (post?.id ? `/posts/${encodeURIComponent(post.id)}` : null)
  const bookmarkInitial = postUrl ? {
    href: postUrl,
    title: post?.title ?? post?.name ?? undefined,
    image: post?.image ?? post?.featuredImage ?? undefined,
  } : null

  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Reply */}
      <button className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors">
        {t('post.reply')}
      </button>

      {/* React */}
      {user && post?.canReact !== 'none' && (
        <ReactButton post={post} t={t} />
      )}

      {/* Bookmark */}
      {user && bookmarkInitial && (
        <>
          <button
            onClick={() => setBookmarking(true)}
            className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors"
          >
            {t('post.bookmark')}
          </button>
          {bookmarking && (
            <BookmarkComposer
              initialValues={bookmarkInitial}
              onClose={() => setBookmarking(false)}
            />
          )}
        </>
      )}

      {/* Share — logged-in users, public posts only */}
      <ShareButton post={post} t={t} user={user} />
    </div>
  )
}
