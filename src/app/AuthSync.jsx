// AuthSync — side-effect component mounted inside Provider.
// Fetches the logged-in user's circles whenever the auth user changes.
// Renders nothing.

import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchMyCircles } from '../features/circles/myCirclesSlice'

export default function AuthSync() {
  const dispatch = useDispatch()
  const userId = useSelector((state) => state.auth.user?.id)

  useEffect(() => {
    if (userId) dispatch(fetchMyCircles())
  }, [userId, dispatch])

  return null
}
