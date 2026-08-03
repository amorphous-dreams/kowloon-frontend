// PostPage — single post view with full content, actions, and replies.

import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostCard from '../components/posts/PostCard'
import { ReactCounts } from '../components/posts/PostReacts'
import Reply from '../components/posts/Reply'
import ReplyComposer from '../components/posts/ReplyComposer'
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

      <PostCard post={post} onDeleted={() => navigate(-1)} showFull />

      <ReactCounts post={post} />

      <div className="flex flex-col gap-0" id="replies">
        <div className="flex items-center justify-between border-b-2 border-base-300 pb-4 mb-2">
          <h2 className="font-display text-2xl tracking-wide">
            {t('post.replyCount', { count: replies.length, defaultValue: `${replies.length} replies` })}
          </h2>
        </div>

        {replies.length > 0 && (
          <div className="border-b border-base-300">
            {replies.map((reply) => (
              <Reply
                key={reply.id}
                reply={reply}
                onUpdated={(next) => setReplies((arr) => arr.map((r) => r.id === next.id ? next : r))}
                onDeleted={(rid) => setReplies((arr) => arr.filter((r) => r.id !== rid))}
              />
            ))}
          </div>
        )}

        <ReplyComposer postId={id} canReply={post.canReply} onSubmitted={load} />
      </div>

    </div>
  )
}
