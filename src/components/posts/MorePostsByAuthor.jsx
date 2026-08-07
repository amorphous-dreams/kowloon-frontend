// MorePostsByAuthor — a "More Posts" strip at the bottom of a single post page.
// Shows up to 3 of the author's top posts of the SAME type (blog-style further
// reading). Renders nothing if there are none. Issue #32.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClient } from '../../hooks/useClient'
import sizedUrl from '../../lib/sizedUrl'

const TYPE_PLURAL = {
  Article: 'Articles',
  Media: 'Media',
  Link: 'Links',
  Event: 'Events',
  Note: 'Posts',
}

function stripHtml(s) {
  return typeof s === 'string'
    ? s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

export default function MorePostsByAuthor({ post }) {
  const client = useClient()
  const { t } = useTranslation()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!client || !post?.actorId || !post?.type) return
    let cancelled = false
    client.feeds
      .getUserPosts({ userId: post.actorId, type: post.type, sort: 'top' })
      .then((res) => {
        if (cancelled) return
        const all = res?.orderedItems ?? res?.items ?? []
        setItems(all.filter((p) => p.id !== post.id).slice(0, 3))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [client, post?.actorId, post?.type, post?.id])

  if (items.length === 0) return null

  const authorName = post.actor?.name || post.actor?.id || ''
  const plural = TYPE_PLURAL[post.type] || 'Posts'

  return (
    <section className="flex flex-col gap-2 border-t-2 border-base-300 pt-6">
      <h2 className="font-display text-2xl tracking-wide mb-2">
        {t('post.moreFrom', {
          plural,
          name: authorName,
          defaultValue: `More ${plural} from ${authorName}`,
        })}
      </h2>
      <div className="flex flex-col divide-y divide-base-300">
        {items.map((p) => {
          const img =
            p.image ||
            (Array.isArray(p.attachments) && p.attachments[0]?.url) ||
            null
          const heading =
            p.title ||
            stripHtml(p.textPreview || p.summary || p.body).slice(0, 90) ||
            t('post.untitled', { defaultValue: 'Untitled' })
          const preview = p.title
            ? stripHtml(p.textPreview || p.summary || p.body).slice(0, 140)
            : ''
          return (
            <Link
              key={p.id}
              to={`/posts/${encodeURIComponent(p.id)}`}
              className="flex gap-4 py-4 group"
            >
              {img && (
                <div className="shrink-0 w-20 h-20 bg-base-300 overflow-hidden">
                  <img
                    src={sizedUrl(img, 160)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="font-display text-lg leading-snug text-base-content group-hover:text-primary transition-colors line-clamp-2">
                  {heading}
                </h3>
                {preview && (
                  <p className="font-reading text-sm text-base-content/70 line-clamp-2">
                    {preview}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
