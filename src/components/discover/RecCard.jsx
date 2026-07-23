// RecCard — one Discover recommendation, dispatched by refType. Web counterpart
// of the mobile RecCard.
//   Post          : featured-image card with author + title overlay (text fallback)
//   Circle        : icon + name + blurb, View action
//   Group         : icon + name + blurb, View action
//   Bookmark/Page : compact link card
//
// Cards are fixed-width so they sit in a horizontally scrolling shelf.

import { Link } from 'react-router-dom'
import { Bookmark as BookmarkIcon, ExternalLink, Newspaper, Users } from 'lucide-react'
import CircleIcon from '../ui/CircleIcon'
import sizedUrl from '../../lib/sizedUrl'

const CARD_W = 'w-60'   // 240px — circles/groups/links
const POST_W = 'w-72'   // 288px — posts

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

function HexAvatar({ url, type, size = 40 }) {
  if (url) {
    return <img src={sizedUrl(url, 200)} alt="" className="object-cover shrink-0" style={{ width: size, height: size, ...hexMask }} />
  }
  return (
    <div className="bg-secondary flex items-center justify-center shrink-0" style={{ width: size, height: size, ...hexMask }}>
      <CircleIcon type={type} size="md" className="text-secondary-content opacity-70" />
    </div>
  )
}

function PostCard({ item }) {
  const img = item.featuredImage
  const author = item.actor || {}
  const text = item.title || item.summary || ''
  if (img) {
    return (
      <Link to={`/posts/${encodeURIComponent(item.id)}`} className={`${POST_W} shrink-0 relative block bg-base-300 overflow-hidden`}>
        <img src={sizedUrl(img, 600)} alt="" className="w-full h-42 object-cover" style={{ height: 168 }} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-ui text-sm font-bold text-white leading-snug line-clamp-2">{text}</p>
          <div className="flex items-center gap-2 mt-2">
            {author.icon
              ? <img src={sizedUrl(author.icon, 100)} alt="" className="w-5 h-5 rounded-full object-cover" />
              : <div className="w-5 h-5 rounded-full bg-white/30" />}
            <span className="font-ui text-[11px] text-white/90 truncate">{author.name || author.id}</span>
          </div>
        </div>
      </Link>
    )
  }
  return (
    <Link to={`/posts/${encodeURIComponent(item.id)}`} className={`${CARD_W} shrink-0 block bg-base-200 p-3`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Newspaper size={12} className="text-base-content/50" />
        <span className="font-ui uppercase tracking-widest text-[9px] text-base-content/45">{item.type || 'Post'}</span>
      </div>
      <p className="font-ui text-sm font-bold text-base-content leading-snug line-clamp-4">{text}</p>
      <div className="flex items-center gap-2 mt-3">
        {author.icon
          ? <img src={sizedUrl(author.icon, 100)} alt="" className="w-5 h-5 rounded-full object-cover" />
          : <div className="w-5 h-5 rounded-full bg-base-300" />}
        <span className="font-ui text-[11px] text-base-content/60 truncate">{author.name || author.id}</span>
      </div>
    </Link>
  )
}

function EntityCard({ item, to, type }) {
  const blurb = item.summary || item.description
  return (
    <div className={`${CARD_W} shrink-0 bg-base-100 border border-base-300 p-3 flex flex-col`}>
      <div className="flex items-center gap-3">
        <HexAvatar url={item.icon} type={type} size={40} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-ui text-sm font-bold text-base-content truncate">{item.name}</span>
          {typeof item.memberCount === 'number' && item.memberCount > 0 && (
            <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/45 mt-0.5">
              {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
      </div>
      {blurb && <p className="font-ui text-xs text-base-content/70 leading-relaxed mt-2 line-clamp-2">{blurb}</p>}
      <div className="flex gap-2 mt-3">
        <Link to={to} className="flex-1 text-center px-2 py-2 bg-base-200 hover:bg-base-300 font-ui uppercase tracking-widest text-[10px] text-base-content transition-colors">
          View
        </Link>
        {type === 'group' && (
          <Link to={`/groups/${encodeURIComponent(item.id)}/posts`} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-base-200 hover:bg-base-300 font-ui uppercase tracking-widest text-[10px] text-base-content transition-colors">
            <Users size={11} /> Posts
          </Link>
        )}
      </div>
    </div>
  )
}

function LinkCard({ item, to, href, icon }) {
  const inner = (
    <>
      {item.image && <img src={sizedUrl(item.image, 400)} alt="" className="w-full object-cover" style={{ height: 110 }} />}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="font-ui uppercase tracking-widest text-[9px] text-base-content/45">{item.refType}</span>
        </div>
        <p className="font-ui text-sm font-bold text-base-content leading-snug line-clamp-2">{item.title || item.name}</p>
        {item.summary && <p className="font-ui text-xs text-base-content/65 leading-relaxed mt-1 line-clamp-2">{item.summary}</p>}
      </div>
    </>
  )
  const cls = `${CARD_W} shrink-0 block bg-base-100 border border-base-300 overflow-hidden`
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <Link to={to} className={cls}>{inner}</Link>
}

export default function RecCard({ item }) {
  const enc = (id) => encodeURIComponent(id)
  switch (item.refType) {
    case 'Post':
      return <PostCard item={item} />
    case 'Circle':
      return <EntityCard item={item} to={`/circles/${enc(item.id)}`} type="circle" />
    case 'Group':
      return <EntityCard item={item} to={`/groups/${enc(item.id)}`} type="group" />
    case 'Bookmark':
      return <LinkCard item={item} href={item.href} icon={<BookmarkIcon size={12} className="text-base-content/50" />} />
    case 'Page':
      return <LinkCard item={item} to={`/pages/${enc(item.id)}`} icon={<ExternalLink size={12} className="text-base-content/50" />} />
    default:
      return null
  }
}
