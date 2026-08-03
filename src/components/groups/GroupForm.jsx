// GroupForm — shared form for creating and editing groups.
// Props:
//   initialValues: { name, description, to, iconUrl, location, rsvpPolicy }
//   onSubmit(data): called with { name, description, to, iconFile, iconUrl, location, rsvpPolicy }
//   mode: 'create' | 'edit'
//   submitting: bool
//   error: string | null
//   cancelHref: string

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Loader, MapPin } from 'lucide-react'
import { useClient } from '../../hooks/useClient'
import CircleIcon from '../ui/CircleIcon'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const VISIBILITY_OPTIONS = [
  { value: '@public', label: 'Public' },
  { value: '@server', label: 'Server only' },
]

const POLICY_OPTIONS = [
  { value: 'open',           label: 'Open — anyone can join' },
  { value: 'serverOpen',     label: 'Server members only' },
  { value: 'serverApproval', label: 'Approval required' },
  { value: 'approvalOnly',   label: 'By invitation only' },
  { value: 'inviteOnly',     label: 'Invite only — admin adds members' },
]

export default function GroupForm({
  initialValues = {},
  onSubmit,
  mode = 'create',
  submitting = false,
  error = null,
  cancelHref = '/groups',
}) {
  const { t } = useTranslation()
  const client = useClient()
  const userId = useSelector((s) => s.auth.user?.id)

  // Load the user's own circles so a group can be scoped to one
  // ("Restrict to a circle" → to = circle:id), matching the mobile GroupForm.
  const [myCircles, setMyCircles] = useState([])
  useEffect(() => {
    if (!client || !userId) return
    let cancelled = false
    client.feeds
      .getUserCircles({ userId })
      .then((res) => {
        const items = res?.orderedItems ?? res?.items ?? []
        if (!cancelled) setMyCircles(items.filter((c) => c?.id && c?.type !== 'System'))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [client, userId])

  const visibilityOptions = [
    ...VISIBILITY_OPTIONS,
    ...myCircles.map((c) => ({ value: c.id, label: `Circle: ${c.name}` })),
  ]

  const [name, setName] = useState(initialValues.name ?? '')
  const [description, setDescription] = useState(initialValues.description ?? '')
  const [to, setTo] = useState(initialValues.to ?? '@public')
  const [rsvpPolicy, setRsvpPolicy] = useState(initialValues.rsvpPolicy ?? 'open')
  const [locationName, setLocationName] = useState(initialValues.location?.name ?? '')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(initialValues.iconUrl ?? null)
  const iconInputRef = useRef(null)

  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(initialValues.imageUrl ?? null)
  const bannerInputRef = useRef(null)

  const handleIconChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (iconPreview && iconFile) URL.revokeObjectURL(iconPreview)
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (bannerPreview && bannerFile) URL.revokeObjectURL(bannerPreview)
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      to,
      rsvpPolicy,
      location: locationName.trim() ? { name: locationName.trim() } : undefined,
      iconFile,
      iconUrl: iconPreview,
      bannerFile,
      bannerUrl: bannerPreview,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">

      {/* Header */}
      <div className="sticky top-0 bg-base-100 z-10 flex items-center justify-between pt-6 pb-5 border-b-2 border-base-300">
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {mode === 'edit'
            ? t('group.editTitle', { defaultValue: 'Edit Group' })
            : t('group.newTitle', { defaultValue: 'New Group' })
          }
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to={cancelHref}
            className="px-4 py-2 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {submitting && <Loader size={12} className="animate-spin" />}
            {mode === 'edit'
              ? t('common.saveChanges', { defaultValue: 'Save Changes' })
              : t('group.create', { defaultValue: 'Create Group' })
            }
          </button>
        </div>
      </div>

      {error && (
        <p className="font-ui text-sm text-error border border-error/30 px-4 py-3">{error}</p>
      )}

      {/* Banner image */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          className="w-full cursor-pointer group relative overflow-hidden border border-base-300 hover:border-primary transition-colors"
          style={{ aspectRatio: '3/1' }}
          aria-label={t('group.changeBanner', { defaultValue: 'Change banner image' })}
        >
          {bannerPreview
            ? <img src={bannerPreview} alt="Group banner" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-base-200 flex items-center justify-center">
                <span className="font-ui text-xs uppercase tracking-widest text-base-content/40">
                  {t('group.addBanner', { defaultValue: 'Add banner image' })}
                </span>
              </div>
          }
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        {bannerPreview && (
          <button
            type="button"
            onClick={() => { if (bannerPreview && bannerFile) URL.revokeObjectURL(bannerPreview); setBannerFile(null); setBannerPreview(null) }}
            className="self-start font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-error transition-colors"
          >
            {t('group.removeBanner', { defaultValue: 'Remove banner' })}
          </button>
        )}
      </div>

      {/* Icon + core fields */}
      <div className="flex items-start gap-6">
        <button
          type="button"
          onClick={() => iconInputRef.current?.click()}
          aria-label={t('group.changeIcon', { defaultValue: 'Change icon' })}
          className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity shrink-0"
        >
          {iconPreview
            ? <img src={iconPreview} alt="Group icon" className="w-24 h-24 object-cover" style={hexMask} />
            : <div className="w-24 h-24 bg-base-300 flex items-center justify-center" style={hexMask}>
                <CircleIcon type="group" size="lg" className="opacity-40" />
              </div>
          }
          <p className="font-ui text-xs uppercase tracking-widest text-base-content/40 text-center mt-1">
            {t('group.icon', { defaultValue: 'Icon' })}
          </p>
        </button>
        <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />

        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
              {t('group.name', { defaultValue: 'Name' })} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('group.namePlaceholder', { defaultValue: 'Group name' })}
              required
              autoFocus
              className="bg-base-200 border border-base-300 px-3 py-2.5 font-display text-2xl tracking-wide focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
              {t('group.description', { defaultValue: 'Description' })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('group.descriptionPlaceholder', { defaultValue: 'Optional description' })}
              className="bg-base-200 border border-base-300 px-3 py-2 font-reading text-base focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs uppercase tracking-widest text-base-content/60 flex items-center gap-1.5">
              <MapPin size={11} />
              {t('group.location', { defaultValue: 'Location' })}
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t('group.locationPlaceholder', { defaultValue: 'City, region, or "Online"' })}
              className="bg-base-200 border border-base-300 px-3 py-2 font-ui text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
                {t('group.visibility', { defaultValue: 'Visibility' })}
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-base-200 border border-base-300 px-3 py-1.5 font-ui text-sm focus:outline-none focus:border-primary"
              >
                {visibilityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="font-ui text-xs uppercase tracking-widest text-base-content/60">
                {t('group.membership', { defaultValue: 'Membership' })}
              </label>
              <select
                value={rsvpPolicy}
                onChange={(e) => setRsvpPolicy(e.target.value)}
                className="bg-base-200 border border-base-300 px-3 py-1.5 font-ui text-sm focus:outline-none focus:border-primary"
              >
                {POLICY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

    </form>
  )
}
