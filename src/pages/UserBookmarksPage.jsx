// UserBookmarksPage — /users/:id/bookmarks
// Expandable two-level tree: root folders (with subfolders) + root bookmarks.

import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, ExternalLink, Folder } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

// ── BookmarkRow ───────────────────────────────────────────────────────────────

function BookmarkRow({ bookmark }) {
  const href = bookmark.href ?? bookmark.target
  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-base-300 last:border-b-0 hover:bg-base-200 transition-colors">
      {bookmark.image && (
        <img
          src={bookmark.image}
          alt=""
          className="w-10 h-10 object-cover shrink-0 mt-0.5"
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-ui text-sm text-primary hover:opacity-70 transition-opacity leading-snug"
          >
            {bookmark.title}
            <ExternalLink size={11} className="shrink-0 opacity-60" />
          </a>
        ) : (
          <span className="font-ui text-sm text-base-content leading-snug">{bookmark.title}</span>
        )}
        {bookmark.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bookmark.tags.map((tag) => (
              <span key={tag} className="font-ui text-xs uppercase tracking-widest text-base-content/50 bg-base-300 px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}
        {bookmark.body && (
          <div
            className="prose prose-sm max-w-none text-base-content/70 text-xs mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: bookmark.body }}
          />
        )}
      </div>
    </div>
  )
}

// ── FolderNode ────────────────────────────────────────────────────────────────

function FolderNode({ folder, bookmarks, subfolders }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const folderBookmarks = bookmarks.filter((b) => b.parentFolder === folder.id)
  const folderSubfolders = subfolders.filter((sf) => sf.parentFolder === folder.id)
  const childCount = folderBookmarks.length + folderSubfolders.length

  return (
    <div className="border border-base-300">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-base-200 hover:bg-base-300 transition-colors text-left"
      >
        {open ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
        <Folder size={14} className="shrink-0 text-base-content/60" />
        <span className="font-ui text-sm uppercase tracking-widest font-medium flex-1">{folder.title}</span>
        <span className="font-ui text-xs text-base-content/45">{childCount}</span>
      </button>

      {open && (
        <div>
          {folderSubfolders.map((sf) => (
            <SubfolderNode key={sf.id} subfolder={sf} bookmarks={bookmarks} />
          ))}
          {folderBookmarks.length > 0 ? (
            folderBookmarks.map((b) => <BookmarkRow key={b.id} bookmark={b} />)
          ) : folderSubfolders.length === 0 ? (
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 px-4 py-3">
              {t('bookmark.empty', { defaultValue: 'No bookmarks' })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── SubfolderNode ─────────────────────────────────────────────────────────────

function SubfolderNode({ subfolder, bookmarks }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const children = bookmarks.filter((b) => b.parentFolder === subfolder.id)

  return (
    <div className="border-t border-base-300">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 py-2.5 bg-base-100 hover:bg-base-200 transition-colors text-left"
      >
        {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        <Folder size={12} className="shrink-0 text-base-content/50" />
        <span className="font-ui text-xs uppercase tracking-widest flex-1">{subfolder.title}</span>
        <span className="font-ui text-xs text-base-content/40">{children.length}</span>
      </button>

      {open && (
        <div className="pl-4">
          {children.length > 0 ? (
            children.map((b) => <BookmarkRow key={b.id} bookmark={b} />)
          ) : (
            <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 px-4 py-3">
              {t('bookmark.empty', { defaultValue: 'No bookmarks' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserBookmarksPage() {
  const { id } = useParams()
  const client = useClient()
  const authUser = useSelector((state) => state.auth.user)
  const { t } = useTranslation()

  const [user, setUser]       = useState(null)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      const [userRes, bookmarksRes] = await Promise.all([
        client.feeds.getUser({ userId: id }),
        client.feeds.getUserBookmarks({ userId: id }),
      ])
      const raw = userRes?.item ?? userRes
      setUser({
        id: raw?.id,
        name: raw?.name ?? raw?.preferredUsername ?? raw?.username,
        icon: raw?.icon ?? raw?.profile?.icon,
      })
      setItems(bookmarksRes?.orderedItems ?? bookmarksRes ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load bookmarks.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />

  // Build tree from flat list
  const folders    = items.filter((i) => i.type === 'Folder' && !i.parentFolder)
  const subfolders = items.filter((i) => i.type === 'Folder' && i.parentFolder)
  const bookmarks  = items.filter((i) => i.type === 'Bookmark')
  const rootBookmarks = bookmarks.filter((b) => !b.parentFolder)

  const isOwner = authUser?.id === id

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + heading */}
      <div className="flex flex-col gap-1">
        <Link
          to={`/users/${encodeURIComponent(id)}`}
          className="font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-primary transition-colors self-start"
        >
          ← {user?.name ?? id}
        </Link>
        <h1 className="font-display text-4xl tracking-wide">
          {t('bookmark.bookmarks', { defaultValue: 'Bookmarks' })}
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="font-ui text-sm uppercase tracking-widest text-base-content/50">
          {isOwner
            ? t('bookmark.emptyOwn', { defaultValue: 'You have no bookmarks yet.' })
            : t('bookmark.emptyOther', { defaultValue: 'No public bookmarks.' })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Folders */}
          {folders.map((f) => (
            <FolderNode
              key={f.id}
              folder={f}
              bookmarks={bookmarks}
              subfolders={subfolders}
            />
          ))}

          {/* Root-level bookmarks */}
          {rootBookmarks.length > 0 && (
            <div className="flex flex-col border border-base-300">
              <div className="px-4 py-2 bg-base-200 border-b border-base-300">
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/60">
                  {t('bookmark.unsorted', { defaultValue: 'Unsorted' })}
                </span>
              </div>
              {rootBookmarks.map((b) => <BookmarkRow key={b.id} bookmark={b} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
