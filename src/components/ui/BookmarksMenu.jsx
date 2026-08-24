// BookmarksMenu — server-owned bookmarks tree, mirrors PagesMenu's shape.
// Self-fetches from GET /bookmarks/server and groups by parentFolder.
// Folders are non-navigable labels (just group their Bookmark children);
// Bookmarks are external links.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Bookmark as BookmarkIcon } from 'lucide-react'
import { useClient } from '../../hooks/useClient'

export default function BookmarksMenu() {
  const { t } = useTranslation()
  const client = useClient()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!client) return
    client.feeds.getServerBookmarks({ limit: 50 })
      .then((res) => {
        const all = res?.orderedItems ?? res?.items ?? []
        // Build two-level tree: top-level folders/bookmarks + their children
        const top = all.filter((b) => !b.parentFolder)
        const tree = top.map((b) => ({
          ...b,
          children: all.filter((c) => c.parentFolder === b.id),
        }))
        setItems(tree)
      })
      .catch(() => {})
  }, [client])

  if (!items.length) return null

  return (
    <div className="flex flex-col gap-0 border-b-2 border-base-300 pb-5">
      <div className="flex items-center gap-2 mb-3" style={{ minHeight: '36px' }}>
        <BookmarkIcon className="w-11 h-11 shrink-0 opacity-50" strokeWidth={1.25} aria-hidden="true" />
        <h3 className="font-display text-3xl tracking-wide text-base-content leading-none">{t('sidebar.bookmarks')}</h3>
      </div>
      <nav className="pl-[52px]">
        <ul className="flex flex-col gap-0">
          {items.map((item) => (
            <li key={item.id}>
              {item.type === 'Folder' ? (
                <span className="flex items-center justify-between py-1.5 font-ui text-sm uppercase tracking-widest text-base-content/80">
                  {item.title}
                  {item.children?.length > 0 && (
                    <ChevronRight className="w-3 h-3 text-base-content/55" />
                  )}
                </span>
              ) : (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-1.5 font-ui text-sm uppercase tracking-widest text-base-content/80 hover:text-primary transition-colors"
                >
                  {item.title}
                </a>
              )}

              {item.children?.length > 0 && (
                <ul className="flex flex-col gap-0 border-l-2 border-base-300 ml-2 mb-1">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <a
                        href={child.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block pl-3 py-1 font-ui text-sm uppercase tracking-widest text-base-content/70 hover:text-primary transition-colors"
                      >
                        {child.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
