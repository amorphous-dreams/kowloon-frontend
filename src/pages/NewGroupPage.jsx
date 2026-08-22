// NewGroupPage — create a new group. Authenticated users only.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClient } from '../hooks/useClient'
import GroupForm from '../components/groups/GroupForm'

export default function NewGroupPage() {
  const client = useClient()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async ({ name, summary, to, rsvpPolicy, location, iconFile, iconUrl, bannerFile, bannerUrl }) => {
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

      // 2. Upload banner if a new file was selected
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

      // 3. Create the group
      const res = await client.activities.createGroup({
        name,
        description: summary,
        icon: finalIconUrl ?? undefined,
        image: finalImageUrl ?? undefined,
        to,
        rsvpPolicy,
        location,
      })

      const groupId = res?.createdId ?? res?.activity?.objectId ?? res?.result?.id
      if (!groupId) throw new Error('Group created but ID not returned')

      navigate(`/groups/${encodeURIComponent(groupId)}`)
    } catch (err) {
      setError(err.message || 'Failed to create group.')
      setSubmitting(false)
    }
  }

  return (
    <GroupForm
      onSubmit={handleSubmit}
      mode="create"
      submitting={submitting}
      error={error}
      cancelHref="/groups"
    />
  )
}
