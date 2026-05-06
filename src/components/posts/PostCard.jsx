// PostCard — full post preview card.
// Composes PostMeta, PostTypeTag, PostBody, and PostToolbar.
// Props: post object

import PostMeta from './PostMeta'
import PostBody from './PostBody'
import PostToolbar from './PostToolbar'
import PostTypeIcon from '../ui/PostTypeIcon'
import VisibilityIcon from '../ui/VisibilityIcon'
import EventCard from './EventCard'

export default function PostCard({ post, onDeleted, showFull = false }) {
  if (post?.type === 'Event') return <EventCard post={post} showFull={showFull} />

  return (
    <article
      id={post?.id}
      data-post-id={post?.id}
      className={`post-type-${post?.type?.toLowerCase()} flex flex-col gap-3 py-5 border-b border-base-300 mb-12`}
    >
      <PostMeta post={post} />
      <PostBody post={post} showFull={showFull} />
      <div className="flex items-center gap-3 pt-2 border-t border-base-300">
        <VisibilityIcon visibility={post?.visibility} />
        <PostTypeIcon type={post?.type} size="sm" />
        <PostToolbar post={post} onDeleted={onDeleted} />
      </div>
    </article>
  )
}
