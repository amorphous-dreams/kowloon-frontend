// PagesListPage — all server pages visible to the current viewer.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Folder, Tag } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'

const MOCK_PAGES = [
  { id: 'page:about@kwln.org',   type: 'Page',   title: 'About This Server',      slug: 'about',   summary: 'Who we are, what we do, and why we do it.', tags: ['meta'], image: null },
  { id: 'page:rules@kwln.org',   type: 'Page',   title: 'Rules & Guidelines',     slug: 'rules',   summary: 'A short list of expectations for members of this community.', tags: ['meta', 'community'], image: null },
  { id: 'page:privacy@kwln.org', type: 'Page',   title: 'Privacy Policy',         slug: 'privacy', summary: 'How we handle your data and what we share.', tags: [], image: null },
  { id: 'page:projects@kwln.org',type: 'Folder', title: 'Projects',               slug: 'projects',summary: 'Ongoing and completed projects by server members.', tags: [], image: null },
  { id: 'page:contact@kwln.org', type: 'Page',   title: 'Contact',                slug: 'contact', summary: 'How to reach the server administrators.', tags: [], image: null },
]

function PageCard({ page }) {
  const href = `/pages/${encodeURIComponent(page.slug ?? page.id)}`
  const isFolder = page.type === 'Folder'

  return (
    <Link
      to={href}
      className="flex items-start gap-4 py-5 border-b border-base-300 group hover:bg-base-200 -mx-3 px-3 transition-colors"
    >
      {page.image ? (
        <img
          src={page.image}
          alt=""
          className="w-16 h-16 object-cover shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-16 h-16 bg-base-300 flex items-center justify-center shrink-0 mt-0.5">
          {isFolder
            ? <Folder size={28} className="text-base-content/30" />
            : <FileText size={28} className="text-base-content/30" />
          }
        </div>
      )}

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl tracking-wide text-base-content group-hover:text-primary transition-colors leading-tight">
            {page.title}
          </h2>
          {isFolder && (
            <span className="font-ui text-[10px] uppercase tracking-widest text-base-content/40 border border-base-300 px-1.5 py-0.5 shrink-0">
              Folder
            </span>
          )}
        </div>

        {page.summary && (
          <p className="font-reading text-sm text-base-content/70 leading-relaxed line-clamp-2">
            {page.summary}
          </p>
        )}

        {page.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Tag size={11} className="text-base-content/35 shrink-0" />
            {page.tags.map((tag) => (
              <span key={tag} className="font-ui text-[11px] uppercase tracking-widest text-base-content/45">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function PagesListPage() {
  const { t } = useTranslation()
  const client = useClient()

  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!client) {
      setPages(MOCK_PAGES)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await client.feeds.http.get('/pages')
      setPages(res?.orderedItems ?? res?.items ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load pages.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner centered />
  if (error)   return <ErrorState message={error} onRetry={load} />

  const folders = pages.filter((p) => p.type === 'Folder')
  const docs    = pages.filter((p) => p.type !== 'Folder')

  return (
    <div className="flex flex-col gap-0">

      <div className="border-b-2 border-base-content pb-4 mb-2">
        <h1 className="font-display text-3xl tracking-wide">
          {t('pages.title', { defaultValue: 'Pages' })}
        </h1>
      </div>

      {pages.length === 0 && (
        <EmptyState message={t('pages.empty', { defaultValue: 'No pages have been published yet.' })} />
      )}

      {folders.length > 0 && (
        <div className="flex flex-col gap-0">
          <h2 className="font-ui text-xs uppercase tracking-widest text-base-content/45 mt-6 mb-1 border-b border-base-300 pb-2">
            {t('pages.folders', { defaultValue: 'Folders' })}
          </h2>
          {folders.map((page) => (
            <PageCard key={page.id} page={page} />
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-col gap-0">
          {folders.length > 0 && (
            <h2 className="font-ui text-xs uppercase tracking-widest text-base-content/45 mt-6 mb-1 border-b border-base-300 pb-2">
              {t('pages.pages', { defaultValue: 'Pages' })}
            </h2>
          )}
          {docs.map((page) => (
            <PageCard key={page.id} page={page} />
          ))}
        </div>
      )}

    </div>
  )
}
