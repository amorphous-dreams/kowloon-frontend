// PostMeta — author avatar, name, handle, timestamp, and visibility.
// Props: post object

import { Link } from 'react-router-dom'
import UserAvatar from '../ui/UserAvatar'

export default function PostMeta({ post }) {
  const author = post?.attributedTo
  const userUrl = author?.id ? `/users/${encodeURIComponent(author.id)}` : null

  return (
    <div className="flex items-center gap-3">
      {userUrl
        ? <Link to={userUrl}><UserAvatar user={author} size="lg" /></Link>
        : <UserAvatar user={author} size="lg" />
      }
      <div className="flex flex-col gap-0.5 min-w-0">
        {userUrl
          ? <Link to={userUrl} className="font-ui text-sm font-medium text-base-content truncate hover:text-primary transition-colors">
              {author?.name ?? author?.id}
            </Link>
          : <span className="font-ui text-sm font-medium text-base-content truncate">
              {author?.name ?? author?.id}
            </span>
        }
        <span className="font-ui text-sm text-base-content/65 dark:text-base-content/80 truncate">
          {author?.id}
        </span>
      </div>
    </div>
  )
}
