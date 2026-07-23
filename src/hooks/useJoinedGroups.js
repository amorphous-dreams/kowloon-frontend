// useJoinedGroups — the groups the current user has joined.
//
// There's no "my groups" endpoint; joined groups live as members of the user's
// `circles.groups` system circle. Mirrors the mobile hook of the same name.
// Members come back as compact subdocs ({ id, name, icon, url }) — enough to
// list as a post audience or feed view.

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useClient } from './useClient'

export function useJoinedGroups() {
  const client = useClient()
  const user = useSelector((s) => s.auth.user)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!client || !user) return
    let cancelled = false
    // Auth payload may flatten the system-circle ids to the top of the user, or
    // keep them nested under `circles`.
    const groupsCircleId = user.groups || user.circles?.groups
    if (!groupsCircleId) {
      setGroups([])
      return
    }
    client.feeds
      .getCircle({ circleId: groupsCircleId })
      .then((res) => {
        const c = res?.item || res?.circle || res
        const members = Array.isArray(c?.members) ? c.members : []
        if (!cancelled) {
          setGroups(members.filter((m) => m?.id?.startsWith?.('group:')))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [client, user?.id])

  return groups
}
