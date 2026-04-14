// LoadMoreButton — editorial "load more" control, midcentury style.
// Props: onClick, loading (bool), hasMore (bool)

import { useTranslation } from 'react-i18next'

export default function LoadMoreButton({ onClick, loading = false, hasMore = false }) {
  const { t } = useTranslation()

  if (!hasMore && !loading) return null

  return (
    <div className="flex justify-center py-8 border-t border-base-300 mt-2">
      <button
        onClick={onClick}
        disabled={loading || !hasMore}
        className="px-8 py-3 font-ui text-xs uppercase tracking-widest border-2 border-base-300 text-base-content/60 hover:border-base-content hover:text-base-content disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? t('feed.loadingMore', { defaultValue: 'Loading\u2026' })
          : t('feed.loadMore', { defaultValue: 'Load more' })
        }
      </button>
    </div>
  )
}
