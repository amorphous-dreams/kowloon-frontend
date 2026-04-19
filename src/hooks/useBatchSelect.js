import { useState, useCallback } from 'react'

export function useBatchSelect(items, getId = (item) => item.id) {
  const [selected, setSelected] = useState(new Set())

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map(getId)))
  }, [items, getId])

  const clear = useCallback(() => setSelected(new Set()), [])

  const isSelected = useCallback((id) => selected.has(id), [selected])

  const allSelected = items.length > 0 && items.every((item) => selected.has(getId(item)))
  const someSelected = selected.size > 0 && !allSelected

  return { selected, toggle, selectAll, clear, isSelected, allSelected, someSelected, count: selected.size }
}
