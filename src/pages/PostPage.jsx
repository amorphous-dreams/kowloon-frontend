// PostPage — single post view with full content, actions, and replies.

import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Send } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostCard from '../components/posts/PostCard'
import UserAvatar from '../components/ui/UserAvatar'
import Timestamp from '../components/ui/Timestamp'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

// ── Mock data (fallback) ──────────────────────────────────────────────────────

const MOCK_POST = {
  id: 'post:2@kwln.org',
  type: 'Article',
  name: 'On the Aesthetics of Midcentury Design',
  body: `<p>There is something about the graphic design of the 1950s that feels both timeless and urgently contemporary. Reid Miles understood that negative space <em>is</em> content — that what you leave out is as important as what you put in.</p>
<p>Look at a Blue Note record sleeve from 1957. The typography is aggressive but controlled. The photography — almost always Francis Wolff's — is cropped to the point of abstraction. There is one thing happening on that cover, and it is happening with total commitment.</p>
<h2>The Grid as Argument</h2>
<p>Midcentury designers didn't use grids because they were fashionable. They used grids because a grid is a <em>position</em> — a statement that visual relationships are meaningful, that alignment is a form of respect for the reader's eye.</p>
<p>Pick a typeface and mean it. Leave space empty on purpose. Make the thing <em>say</em> something.</p>`,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  visibility: 'Public',
  actor: {
    id: '@designthink@kwln.org',
    name: 'Design Thinking',
    icon: 'https://picsum.photos/seed/designthink/200/200',
  },
  replyCount: 3,
  reactCount: 91,
}

const MOCK_REPLIES = [
  {
    id: 'reply:1',
    body: "<p>This is exactly what I've been trying to articulate for years. The grid isn't a constraint — it's a commitment.</p>",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    actor: { id: '@recordhead@kwln.org', name: 'Record Head', icon: 'https://picsum.photos/seed/recordhead/200/200' },
  },
  {
    id: 'reply:2',
    body: "<p>The Francis Wolff photography point is so right. Those crops are almost violent in how decisive they are.</p>",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    actor: { id: '@jzellis@kwln.org', name: 'Joshua Ellis', icon: 'https://picsum.photos/seed/jzellis/200/200' },
  },
  {
    id: 'reply:3',
    body: "<p>Have you read Müller-Brockmann's own writing on the grid? His explanations of <em>why</em> are even better than the posters.</p>",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actor: { id: '@cityhacker@kwln.org', name: 'City Hacker', icon: 'https://picsum.photos/seed/cityhacker/200/200' },
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Reply({ reply }) {
  const actor = reply.actor ?? {}
  const html = reply.body || reply.source?.content || ''

  return (
    <div className="flex gap-3 py-5 border-b border-base-300 last:border-b-0">
      <div className="shrink-0">
        <UserAvatar user={actor} size="sm" />
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/users/${encodeURIComponent(actor.id ?? '')}`}
            className="font-ui text-sm font-bold text-base-content hover:text-primary transition-colors"
          >
            {actor.name ?? actor.displayName ?? actor.id}
          </Link>
          <Timestamp date={reply.createdAt} />
        </div>
        {html ? (
          <div
            className="prose prose-sm max-w-none text-[13.5px] [&_p]:leading-[1.45] [&_p]:font-[450] font-reading text-base-content/80"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>
    </div>
  )
}

function ReplyComposer({ postId, canReply, onSubmitted }) {
  const { t } = useTranslation()
  const user = useSelector((state) => state.auth.user)
  const client = useClient()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Not logged in — no composer
  if (!user) return null

  // canReply controls who can reply: '' or undefined = anyone, '@public' = public,
  // '@server' = server members, a circle ID = circle members, '@none' = closed
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
    setSubmitting(true)
    setError(null)
    try {
      await client.activities.reply({ postId, content: text })
      setText('')
      onSubmitted?.()
    } catch (err) {
      setError(err.message || 'Failed to post reply.')
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useClient()
  const { t } = useTranslation()

  const [post, setPost]       = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!client) {
      setPost(MOCK_POST)
      setReplies(MOCK_REPLIES)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [postRes, repliesRes] = await Promise.all([
        client.feeds.getPost({ postId: id }),
        client.feeds.getReplies({ postId: id }),
      ])
      setPost(postRes)
      setReplies(repliesRes?.orderedItems ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load post.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!post)   return null

  return (
    <div className="flex flex-col gap-8">

      <Link
        to="/"
        className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft size={13} /> {t('common.back', { defaultValue: 'Back' })}
      </Link>

      <PostCard post={post} onDeleted={() => navigate(-1)} />

      <div className="flex flex-col gap-0" id="replies">
        <div className="flex items-center justify-between border-b-2 border-base-300 pb-4 mb-2">
          <h2 className="font-display text-2xl tracking-wide">
            {t('post.replyCount', { count: replies.length, defaultValue: `${replies.length} replies` })}
          </h2>
        </div>

        {replies.length > 0 && (
          <div className="border-b border-base-300">
            {replies.map((reply) => (
              <Reply key={reply.id} reply={reply} />
            ))}
          </div>
        )}

        <ReplyComposer postId={id} canReply={post.canReply} onSubmitted={load} />
      </div>

    </div>
  )
}
