// EditGroupPage — edit group settings. Owner/admins only.
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClient } from '../hooks/useClient'
import GroupForm from '../components/groups/GroupForm'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

export default function EditGroupPage() {
  const { id } = useParams()
  const client = useClient()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await client.feeds.getGroup({ groupId: id })
      setGroup(res?.item ?? res)
    } catch (err) {
      setLoadError(err.message || 'Failed to load group.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])

  const handleSubmit = async ({ name, summary, to, rsvpPolicy, location, iconFile, iconUrl, bannerFile, bannerUrl }) => {
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

      // 2. Upload new banner if a file was selected
      let finalImageUrl = bannerFile ? null : (bannerUrl ?? null)
      if (bannerFile) {
        const uploaded = await client.files.upload({
          file: bannerFile,
          filename: bannerFile.name,
          contentType: bannerFile.type,
          to: '@public',
        })
        if (uploaded?.file?.url) finalImageUrl = uploaded.file.url
      }

      // 3. Update the group
      await client.activities.updateGroup({
        groupId: id,
        name,
        description: summary,
        icon: finalIconUrl ?? undefined,
        image: finalImageUrl ?? undefined,
        to,
        membershipPolicy: rsvpPolicy,
        location,
      })

      navigate(`/groups/${encodeURIComponent(id)}`)
    } catch (err) {
      setSubmitError(err.message || 'Failed to save changes.')
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner centered />
  if (loadError) return <ErrorState message={loadError} onRetry={load} />
  if (!group) return null

  return (
    <GroupForm
      initialValues={{
        name: group.name ?? '',
        summary: group.summary ?? '',
        to: group.to ?? '@public',
        iconUrl: group.icon ?? null,
        imageUrl: group.image ?? null,
        location: group.location ?? undefined,
        rsvpPolicy: group.rsvpPolicy ?? 'open',
      }}
      onSubmit={handleSubmit}
      mode="edit"
      submitting={submitting}
      error={submitError}
      cancelHref={`/groups/${encodeURIComponent(id)}`}
    />
  )
}
