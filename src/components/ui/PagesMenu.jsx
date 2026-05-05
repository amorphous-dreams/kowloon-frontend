// PagesMenu — hierarchical server pages navigation tree.
// Self-fetches from GET /pages and groups by parentId.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useClient } from '../../hooks/useClient'

export default function PagesMenu() {
  const { t } = useTranslation()
  const client = useClient()
  const [pages, setPages] = useState([])

  useEffect(() => {
    if (!client) return
    // Call the HTTP layer directly — getServerPages() requires a serverId that
    // we don't need in single-server mode; the backend treats it as optional.
    client.feeds.http.get('/pages', { params: { limit: 50 } })
      .then((res) => {
        const items = res?.orderedItems ?? res?.items ?? []
        // Build two-level tree: top-level pages + their children
        const top = items.filter((p) => !p.parentId)
        const tree = top.map((p) => ({
          ...p,
          children: items.filter((c) => c.parentId === p.id),
        }))
        setPages(tree)
      })
      .catch(() => {})
  }, [client])

  if (!pages.length) return null

  return (
    <div className="flex flex-col gap-0 border-b-2 border-base-300 pb-5">
      <div className="flex items-center gap-2 mb-3" style={{ minHeight: '36px' }}>
        <img src="/page.svg" aria-hidden="true" className="w-11 h-11 shrink-0 opacity-50" />
        <h3 className="font-display text-3xl tracking-wide text-base-content leading-none">{t('sidebar.pages')}</h3>
      </div>
      <nav className="pl-[52px]">
        <ul className="flex flex-col gap-0">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                to={`/pages/${encodeURIComponent(page.slug ?? page.id)}`}
                className="flex items-center justify-between py-1.5 font-ui text-sm uppercase tracking-widest text-base-content/80 hover:text-primary transition-colors group"
              >
                {page.title ?? page.name}
                {page.children?.length > 0 && (
                  <ChevronRight className="w-3 h-3 text-base-content/55 group-hover:text-primary transition-colors" />
                )}
              </Link>

              {page.children?.length > 0 && (
                <ul className="flex flex-col gap-0 border-l-2 border-base-300 ml-2 mb-1">
                  {page.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/pages/${encodeURIComponent(child.slug ?? child.id)}`}
                        className="block pl-3 py-1 font-ui text-sm uppercase tracking-widest text-base-content/70 hover:text-primary transition-colors"
                      >
                        {child.title ?? child.name}
                      </Link>
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
