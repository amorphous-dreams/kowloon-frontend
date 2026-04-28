// EditPostPage — edit an existing post. Owner only.
// Pre-populated with existing post data; same form as NewPostPage.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostTypeSelector from '../components/posts/PostTypeSelector'
import RichTextEditor from '../components/posts/RichTextEditor'
import LocationField from '../components/posts/LocationField'
import CircleSelector from '../components/circles/CircleSelector'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

const NOTE_MAX_WORDS = 500
const NOTE_MAX_CHARS = 5000
const countWords = (md) => md.trim().split(/\s+/).filter(Boolean).length

// ── Shared form helpers ───────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">{label}</label>
      {children}
    </div>
  )
}

function TagsInput({ tags, onChange }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')

  const commit = () => {
    const tag = input.trim().replace(/^#+/, '').toLowerCase()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-2 border-base-300 bg-base-100 min-h-11">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-base-200 font-ui text-xs uppercase tracking-widest">
          #{tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Remove #${tag}`}
            className="text-base-content/40 hover:text-error transition-colors leading-none ml-0.5"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={commit}
        placeholder={tags.length ? '' : t('composer.tagsPlaceholder', { defaultValue: 'Add tags…' })}
        className="flex-1 min-w-24 bg-transparent font-ui text-xs uppercase tracking-widest text-base-content placeholder:text-base-content/30 outline-none"
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useClient()
  const { t } = useTranslation()
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const { items: myCircles } = useSelector((state) => state.myCircles)
  const geocodingUrl = useSelector((state) => state.server.settings?.geocodingUrl)

  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [postType, setPostType]   = useState('Note')
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [href, setHref]           = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [location, setLocation]   = useState('')
  const [geo, setGeo]             = useState(null)
  const [tags, setTags]           = useState([])
  const [audience, setAudience]   = useState('@public')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const [locating, setLocating]   = useState(false)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await client.feeds.getPost({ postId: id })
      const post = res?.item ?? res
      setPostType(post.type ?? 'Note')
      setTitle(post.title ?? '')
      setContent(post.source?.content ?? '')
      setHref(post.href ?? '')
      setStartDate(post.startTime ? String(post.startTime).slice(0, 16) : '')
      setEndDate(post.endTime ? String(post.endTime).slice(0, 16) : '')
      setLocation(post.location?.name ?? '')
      setGeo(post.location?.lat != null ? { lat: post.location.lat, lon: post.location.lon } : null)
      setTags(Array.isArray(post.tags) ? post.tags : [])
      setAudience(post.to ?? '@public')
    } catch (err) {
      setLoadError(err.message || 'Failed to load post.')
    } finally {
      setLoading(false)
    }
  }, [client, id])

  useEffect(() => { load() }, [load])


  const wordCount   = postType === 'Note' ? countWords(content) : 0
  const charCount   = postType === 'Note' ? content.length : 0
  const atNoteLimit = postType === 'Note' && (wordCount >= NOTE_MAX_WORDS || charCount >= NOTE_MAX_CHARS)
  const noteWarn    = postType === 'Note' && (wordCount >= 450 || charCount >= 4500)

  const hasTitle = postType !== 'Note'
  const hasTags  = postType !== 'Note'
  const canSave  = !submitting && !atNoteLimit &&
    (content.trim() || (postType === 'Event' && startDate))

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setLocation('Location unavailable')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        setGeo({ lat, lon })
        const reverseUrl = `${(geocodingUrl || 'https://nominatim.openstreetmap.org').replace(/\/$/, '')}/reverse?format=json&lat=${lat}&lon=${lon}`
        try {
          const res = await fetch(reverseUrl, { headers: { 'Accept-Language': 'en', 'User-Agent': 'kowloon-frontend/1.0' } })
          const data = await res.json()
          const place = data.address
          const parts = [
            place.city || place.town || place.village || place.county,
            place.state,
            place.country_code?.toUpperCase(),
          ].filter(Boolean)
          setLocation(parts.join(', '))
        } catch {
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`)
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) setLocation('Location access denied')
        else setLocation('Location unavailable')
      },
      { timeout: 8000 }
    )
  }

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await client.activities.updatePost(id, {
        type: postType,
        title: title || undefined,
        content: content || undefined,
        href: href || undefined,
        startTime: startDate || undefined,
        endTime: endDate || undefined,
        tags: tags.length ? tags : undefined,
        location: location ? { type: 'Place', name: location, ...(geo ?? {}) } : undefined,
        to: audience,
      })
      navigate(`/posts/${encodeURIComponent(id)}`)
    } catch (err) {
      setError(err.message || 'Failed to save.')
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner centered />
  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  return (
    <div className="flex flex-col gap-0">

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-base-300 bg-base-200 -mx-4 lg:-mx-8 px-4 lg:px-8 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to={`/posts/${encodeURIComponent(id)}`}
            className="flex items-center gap-1.5 px-3 py-3 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors"
          >
            <ArrowLeft size={13} />
          </Link>
          <PostTypeSelector value={postType} onChange={setPostType} />
        </div>
        <span className="font-ui text-xs uppercase tracking-widest text-base-content/40 pr-3">
          {t('post.editing', { defaultValue: 'Editing' })}
        </span>
      </div>

      <div className="flex flex-col gap-6">

        {/* Link URL */}
        {postType === 'Link' && (
          <Field label={t('composer.linkUrlLabel', { defaultValue: 'URL' })}>
            <input
              type="url"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://…"
              className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-display text-3xl tracking-wide text-base-content placeholder:text-base-content/30 transition-colors"
            />
          </Field>
        )}

        {/* Title */}
        {hasTitle && (
          <Field label={t('composer.titleLabel', { defaultValue: 'Title' })}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('composer.title', { defaultValue: 'Title' })}
              className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-display text-3xl tracking-wide text-base-content placeholder:text-base-content/30 transition-colors"
            />
          </Field>
        )}

        {/* Event datetimes */}
        {postType === 'Event' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('composer.startDateLabel', { defaultValue: 'Start' })}>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm text-base-content transition-colors"
              />
            </Field>
            <Field label={t('composer.endDateLabel', { defaultValue: 'End (optional)' })}>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm text-base-content transition-colors"
              />
            </Field>
          </div>
        )}

        {/* Body */}
        <Field label={t('composer.body', { defaultValue: 'Body' })}>
          <RichTextEditor
            content={content}
            onChange={setContent}
            maxWords={postType === 'Note' ? NOTE_MAX_WORDS : undefined}
            editorClassName="min-h-[40vh]"
          />
          {postType === 'Note' && (
            <div className="flex justify-end mt-1">
              <span className={`font-ui text-xs uppercase tracking-widest tabular-nums ${
                atNoteLimit ? 'text-error' : noteWarn ? 'text-warning' : 'text-base-content/30'
              }`}>
                {wordCount} / {NOTE_MAX_WORDS} {t('composer.words', { defaultValue: 'words' })}
              </span>
            </div>
          )}
        </Field>

        {/* Tags */}
        {hasTags && (
          <Field label={t('composer.tagsLabel', { defaultValue: 'Tags' })}>
            <TagsInput tags={tags} onChange={setTags} />
          </Field>
        )}

        {/* Location */}
        <Field label={t('composer.locationLabel', { defaultValue: 'Location (optional)' })}>
          <LocationField
            value={location}
            onChange={setLocation}
            geo={geo}
            onGeoSelect={setGeo}
            locating={locating}
            onGeolocate={handleGeolocate}
            geocodingUrl={geocodingUrl}
            variant="page"
          />
        </Field>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-base-300">
          <CircleSelector
            circles={myCircles}
            value={audience}
            onChange={setAudience}
            showAudience
            direction="up"
          />

          <div className="flex items-center gap-3">
            {error && (
              <span role="alert" className="font-ui text-xs uppercase tracking-widest text-error">
                {error}
              </span>
            )}
            <Link
              to={`/posts/${encodeURIComponent(id)}`}
              className="px-4 py-2 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors"
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-6 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting
                ? t('common.saving', { defaultValue: 'Saving…' })
                : t('common.save', { defaultValue: 'Save' })
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
