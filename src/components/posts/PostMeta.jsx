// PostMeta — author avatar, name, handle, timestamp.
// Props: post object

import { Link } from 'react-router-dom'
import UserAvatar from '../ui/UserAvatar'
import Timestamp from '../ui/Timestamp'

const TIMESTAMP_LINK_TYPES = ['Note', 'Article', 'Media', 'Link', 'Event']

export default function PostMeta({ post }) {
  const author = post?.attributedTo
  const userUrl = author?.id ? `/users/${encodeURIComponent(author.id)}` : null
  const timestampTo = TIMESTAMP_LINK_TYPES.includes(post?.type) && post?.id
    ? `/posts/${encodeURIComponent(post.id)}`
    : null

  return (
    <div className="flex items-center gap-3">
      {userUrl
        ? <Link to={userUrl}><UserAvatar user={author} size="md" /></Link>
        : <UserAvatar user={author} size="md" />
      }
      <div className="flex flex-col min-w-0 flex-1 leading-[1.05]">
        {userUrl
          ? <Link to={userUrl} className="font-ui text-base font-medium text-base-content truncate !leading-[1.05] hover:text-primary transition-colors">
              {author?.name ?? author?.id}
            </Link>
          : <span className="font-ui text-base font-medium text-base-content truncate !leading-[1.05]">
              {author?.name ?? author?.id}
            </span>
        }
        <div className="flex items-baseline gap-2 min-w-0 -mt-1">
          {userUrl
            ? <Link to={userUrl} className="font-ui text-xs text-base-content/55 dark:text-base-content/70 !leading-[1.05] truncate flex-1 hover:text-primary transition-colors">
                {author?.id}
              </Link>
            : <span className="font-ui text-xs text-base-content/55 dark:text-base-content/70 !leading-[1.05] truncate flex-1">
                {author?.id}
              </span>
          }
          <Timestamp
            date={post?.published}
            to={timestampTo}
            className="font-ui text-xs text-base-content/55 dark:text-base-content/70 !leading-[1.05] shrink-0"
          />
        </div>
      </div>
    </div>
  )
}
