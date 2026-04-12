// PostBody — renders post content.
// Handles type-specific rendering: linked titles for Link posts, media attachments for Media posts.
// Props: post object

import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { marked } from 'marked'
import AudioPlayer from '../ui/AudioPlayer'

marked.use({ breaks: true, gfm: true })

function LinkTitle({ post }) {
  const href = post.href
  let domain = null
  if (href) {
    try { domain = new URL(href).hostname.replace(/^www\./, '') } catch {}
  }

  const inner = (
    <span className="inline-flex items-center gap-2">
      <Link2 size={28} className="shrink-0 opacity-50" />
      {post.name}
    </span>
  )

  return (
    <div className="mb-3">
      <h1 className="font-display text-4xl lg:text-5xl mb-12">
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{inner}</a>
          : inner
        }
      </h1>
      {domain && (
        <p className="font-ui text-sm uppercase tracking-widest text-base-content/60 mt-0.5">{domain}</p>
      )}
    </div>
  )
}


function Attachments({ attachments = [], featuredImage = null }) {
  if (!attachments.length) return null
  return (
    <div className="flex flex-col gap-2 mt-3">
      {attachments.map((a, i) => {
        const mt = a.mediaType ?? ''
        if (mt.startsWith('image/')) {
          return (
            <img
              key={i}
              src={a.url}
              alt={a.name ?? ''}
              className="w-full object-cover max-h-96"
            />
          )
        }
        if (mt.startsWith('audio/')) {
          return (
            <AudioPlayer
              key={i}
              src={a.url}
              image={featuredImage}
              className="w-full aspect-video"
            />
          )
        }
        if (mt.startsWith('video/')) {
          return (
            <video key={i} controls className="w-full max-h-96 object-contain bg-black">
              <source src={a.url} type={mt} />
            </video>
          )
        }
        // Generic file attachment
        return (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui text-xs uppercase tracking-widest text-primary hover:opacity-80"
          >
            {a.name ?? a.url}
          </a>
        )
      })}
    </div>
  )
}

export default function PostBody({ post }) {
  // body = pre-rendered HTML from server; fall back to rendering raw markdown for local/mock data
  const rawSource = post?.source?.content ?? (typeof post?.source === 'string' ? post.source : null) ?? post?.content ?? ''
  const html = post?.body ?? (rawSource ? marked.parse(rawSource) : '')
  const title = post?.title ?? post?.name
  const isLink   = post?.type === 'Link'
  const isMedia  = post?.type === 'Media'
  const postUrl  = post?.id ? `/posts/${encodeURIComponent(post.id)}` : null
  const titleLinksToPost = ['Article', 'Media'].includes(post?.type)

  // Hero image: use featuredImage for all types; for Media fall back to first image attachment
  const heroSrc = post?.featuredImage
    ?? (isMedia ? post?.attachments?.find((a) => a?.mediaType?.startsWith('image/'))?.url : null)
    ?? (isLink ? post?.image : null)

  // For Media posts, skip the attachment already shown as the hero
  const remainingAttachments = isMedia && heroSrc
    ? (post?.attachments ?? []).filter((a) => a?.url !== heroSrc)
    : (post?.attachments ?? [])

  return (
    <div className="font-reading text-base-content leading-relaxed">
      {title && (
        isLink
          ? <LinkTitle post={{ ...post, name: title }} />
          : <h1 className="font-display text-4xl lg:text-5xl mt-4 mb-8">
              {titleLinksToPost && postUrl
                ? <Link to={postUrl} className="hover:text-primary transition-colors">{title}</Link>
                : title
              }
            </h1>
      )}

      {/* Hero image — after title, before body */}
      {heroSrc && (
        <img
          src={heroSrc}
          alt={title ?? ''}
          className={`w-full object-cover mb-6 ${isLink ? 'max-h-64' : 'max-h-[28rem]'}`}
        />
      )}

      <div
        className="prose prose-sm max-w-none text-[13.5px] [&_p]:leading-[1.45] [&_p]:font-[450] [&_h2]:text-lg lg:[&_h2]:text-xl [&_h3]:text-base lg:[&_h3]:text-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {remainingAttachments.length > 0 && (
        <Attachments attachments={remainingAttachments} featuredImage={heroSrc} />
      )}
    </div>
  )
}
