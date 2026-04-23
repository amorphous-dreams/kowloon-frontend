// useFeed — unified pagination hook for all feed views.
//
// Accepts a stable fetchFn (wrap in useCallback) with signature:
//   async (cursor) => { items: [], nextCursor: string|number|null, hasMore: boolean }
//
// cursor is null on first load. For page-based feeds, return the next page number
// as nextCursor. For cursor-based (circle timeline), return the ISO string cursor.
//
// When fetchFn identity changes (e.g. type filter toggled), the feed reloads from scratch.

import { useState, useEffect, useCallback, useRef } from 'react'

export function useFeed(fetchFn) {
  const [items, setItems]           = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState(null)

  // Use a ref to track the current fetchFn without it being a dep of loadMore
  const fetchFnRef = useRef(fetchFn)
  useEffect(() => { fetchFnRef.current = fetchFn }, [fetchFn])

  // Reload from scratch whenever fetchFn identity changes
  useEffect(() => {
    if (!fetchFn) return

    let cancelled = false

    setLoading(true)
    setError(null)
    setItems([])
    setNextCursor(null)
    setHasMore(false)

    fetchFn(null)
      .then(({ items: newItems, nextCursor: nc, hasMore: more }) => {
        if (cancelled) return
        setItems(newItems)
        setNextCursor(nc ?? null)
        setHasMore(more ?? false)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load feed')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [fetchFn]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const { items: newItems, nextCursor: nc, hasMore: more } = await fetchFnRef.current(nextCursor)
      setItems((prev) => [...prev, ...newItems])
      setNextCursor(nc ?? null)
      setHasMore(more ?? false)
    } catch (err) {
      setError(err.message || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, hasMore, loadingMore])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return { items, hasMore, loading, loadingMore, error, loadMore, removeItem }
}
