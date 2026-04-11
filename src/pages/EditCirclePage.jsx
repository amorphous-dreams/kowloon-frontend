// EditCirclePage — edit circle settings and membership. Owner only.
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClient } from '../hooks/useClient'
import CircleForm from '../components/circles/CircleForm'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

export default function EditCirclePage() {
  const { id } = useParams()
  const client = useClient()
  const navigate = useNavigate()

  const [circle, setCircle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await client.feeds.getCircle({ circleId: id })
      setCircle(res?.item ?? res)
    } catch (err) {
      setLoadError(err.message || 'Failed to load circle.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  const handleSubmit = async ({ name, description, to, iconFile, iconUrl, members }) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // 1. Upload new icon if a file was selected
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

      // 2. Update core fields
      await client.activities.updateCircle({
        circleId: id,
        name,
        description,
        icon: finalIconUrl ?? undefined,
        to,
      })

      // 3. Diff membership
      const originalIds = new Set((circle.members ?? []).map((m) => m.id))
      const currentIds  = new Set(members.map((m) => m.id))

      const added   = members.filter((m) => !originalIds.has(m.id))
      const removed = [...originalIds].filter((mid) => !currentIds.has(mid))

      if (added.length > 0) {
        await client.activities.addToCircle({ circleId: id, members: added })
      }
      for (const memberId of removed) {
        await client.activities.removeFromCircle({ circleId: id, memberId })
      }

      navigate(`/circles/${encodeURIComponent(id)}`)
    } catch (err) {
      setSubmitError(err.message || 'Failed to save changes.')
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner centered />
  if (loadError) return <ErrorState message={loadError} onRetry={load} />
  if (!circle) return null

  const members = (circle.members ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? m.displayName ?? null,
    icon: m.icon ?? m.profile?.icon ?? null,
  }))

  return (
    <CircleForm
      initialValues={{
        name: circle.name ?? '',
        description: circle.description ?? circle.summary ?? '',
        to: circle.to ?? '@public',
        iconUrl: circle.icon ?? null,
        members,
      }}
      onSubmit={handleSubmit}
      mode="edit"
      submitting={submitting}
      error={submitError}
      cancelHref={`/circles/${encodeURIComponent(id)}`}
    />
  )
}
