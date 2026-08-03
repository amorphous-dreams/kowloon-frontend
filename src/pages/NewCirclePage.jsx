// NewCirclePage — create a new circle.
// Accepts initial values via React Router location.state (used by the Copy flow):
//   { name, description, icon (URL), members: Array<string | MemberObject> }

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useClient } from '../hooks/useClient'
import CircleForm from '../components/circles/CircleForm'
import { fetchMyCircles } from '../features/circles/myCirclesSlice'

export default function NewCirclePage() {
  const client = useClient()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { state: routeState } = useLocation()
  const selfId = useSelector((s) => s.auth.user?.id) ?? ''

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const initial = routeState ?? {}

  const handleSubmit = async ({ name, description, to, iconFile, iconUrl, members }) => {
    setSubmitting(true)
    setError(null)
    try {
      // 1. Upload icon if a new file was selected
      let finalIconUrl = iconFile ? null : (iconUrl ?? null)
      if (iconFile) {
        const uploaded = await client.files.upload({
          file: iconFile,
          filename: iconFile.name,
          contentType: iconFile.type,
          to: '@public',
        })
        if (uploaded?.file?.url) finalIconUrl = uploaded.file.url
      }

      // 2. Create the circle
      const res = await client.activities.createCircle({
        name,
        description,
        icon: finalIconUrl ?? undefined,
        to,
      })

      const circleId = res?.createdId ?? res?.activity?.objectId ?? res?.result?.id
      if (!circleId) throw new Error('Circle created but ID not returned')

      // 3. Batch-add initial members
      if (members.length > 0) {
        await client.activities.addToCircle({ circleId, members })
      }

      dispatch(fetchMyCircles())
      navigate(`/circles/${encodeURIComponent(circleId)}`)
    } catch (err) {
      setError(err.message || 'Failed to create circle.')
      setSubmitting(false)
    }
  }

  return (
    <CircleForm
      initialValues={{
        name: initial.name ?? '',
        description: initial.description ?? '',
        to: initial.to ?? (selfId || '@public'),
        iconUrl: initial.icon ?? null,
        members: initial.members ?? [],
      }}
      onSubmit={handleSubmit}
      mode="create"
      submitting={submitting}
      error={error}
      cancelHref="/circles"
    />
  )
}
