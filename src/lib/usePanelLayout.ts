import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Remembers the order of a column of cards, and which of them are collapsed.
 *
 * Adapted from Ergo Assess's `useSectionOrder`, with collapse folded in — the
 * two always travel together here, and one localStorage key beats two that can
 * disagree after a partial write.
 *
 * The validation rule is the important part: a saved order is only honoured if
 * it holds EXACTLY the same set of ids as `defaults`. Add or rename a card and
 * every stored layout silently reverts to the default rather than dropping the
 * new card off the page or rendering a ghost — a stale layout in localStorage
 * must never be able to hide functionality.
 *
 * Collapsed ids are filtered rather than set-compared, since an unknown id
 * there is harmless: it collapses nothing.
 */
export function usePanelLayout<T extends string>(storageKey: string, defaults: T[]) {
  const [order, setOrder] = useState<T[]>(defaults)
  const [collapsed, setCollapsed] = useState<T[]>([])

  const orderRef = useRef(order)
  const collapsedRef = useRef(collapsed)
  orderRef.current = order
  collapsedRef.current = collapsed

  const persist = useCallback(
    (nextOrder: T[], nextCollapsed: T[]) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ order: nextOrder, collapsed: nextCollapsed }),
        )
      } catch {
        // Private mode, or a full quota. A layout preference is not worth
        // breaking the page over.
      }
    },
    [storageKey],
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed: { order?: T[]; collapsed?: T[] } = JSON.parse(raw)
      const saved = parsed.order ?? []
      const sameSet =
        saved.length === defaults.length &&
        defaults.every((d) => saved.includes(d)) &&
        saved.every((d) => defaults.includes(d))
      if (sameSet) setOrder(saved)
      setCollapsed((parsed.collapsed ?? []).filter((c) => defaults.includes(c)))
    } catch {
      // Corrupt JSON — fall back to defaults rather than throwing on mount.
    }
    // `defaults` is a literal array rebuilt each render; the key identifies the
    // layout, so re-reading on every render would be pointless churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  /** Move `dragId` to where `dropId` currently sits. */
  const reorder = useCallback(
    (dragId: T, dropId: T) => {
      setOrder((prev) => {
        const next = [...prev]
        const from = next.indexOf(dragId)
        const to = next.indexOf(dropId)
        if (from === -1 || to === -1 || from === to) return prev
        next.splice(from, 1)
        next.splice(to, 0, dragId)
        persist(next, collapsedRef.current)
        return next
      })
    },
    [persist],
  )

  const toggleCollapsed = useCallback(
    (id: T) => {
      setCollapsed((prev) => {
        const next = prev.includes(id)
          ? prev.filter((c) => c !== id)
          : [...prev, id]
        persist(orderRef.current, next)
        return next
      })
    },
    [persist],
  )

  const isCollapsed = useCallback(
    (id: T) => collapsed.includes(id),
    [collapsed],
  )

  const resetLayout = useCallback(() => {
    setOrder(defaults)
    setCollapsed([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Same reasoning as persist().
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  return { order, isCollapsed, toggleCollapsed, reorder, resetLayout }
}
