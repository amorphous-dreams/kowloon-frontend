// NewPostPage — full-page post editor. Authenticated users only.
// Type selector at top; form fields adapt to post type; CircleSelector for audience.

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MapPin, X } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostTypeSelector from '../components/posts/PostTypeSelector'
import RichTextEditor from '../components/posts/RichTextEditor'
import CircleSelector from '../components/circles/CircleSelector'

const NOTE_MAX_WORDS = 500
const NOTE_MAX_CHARS = 5000
const countWords = (md) => md.trim().split(/\s+/).filter(Boolean).length

// ── Small local form helpers ──────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-ui text-xs uppercase tracking-widest text-base-content/50">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', inputRef, onBlur, large = false }) {
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full px-4 py-3 bg-base-100 border-2 border-base-300 focus:border-primary outline-none transition-colors ${
        large ? 'font-display text-3xl tracking-wide' : 'font-ui text-sm tracking-wide'
      } text-base-content placeholder:text-base-content/30`}
    />
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

export default function NewPostPage() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const client = useClient()
  const { t } = useTranslation()

  const [postType, setPostType]   = useState('Note')
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [href, setHref]           = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [location, setLocation]   = useState('')
  const [geo, setGeo]             = useState(null)
  const [tags, setTags]           = useState([])
  const [audience, setAudience]   = useState('public')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [locating, setLocating]   = useState(false)
  const [editorKey, setEditorKey] = useState(0)

  const hrefRef = useRef(null)

  const wordCount   = postType === 'Note' ? countWords(content) : 0
  const charCount   = postType === 'Note' ? content.length : 0
  const atNoteLimit = postType === 'Note' && (wordCount >= NOTE_MAX_WORDS || charCount >= NOTE_MAX_CHARS)
  const noteWarn    = postType === 'Note' && (wordCount >= 450 || charCount >= 4500)

  const hasTitle = postType !== 'Note'
  const hasTags  = postType !== 'Note'
  const canPost  = !submitting && !atNoteLimit &&
    (content.trim() || (postType === 'Event' && startDate) || postType === 'Media')

  const handleTypeChange = (newType) => {
    if (newType === 'Note' && postType !== 'Note') {
      const words = content.trim().split(/\s+/).filter(Boolean)
      if (words.length > NOTE_MAX_WORDS) {
        setContent(words.slice(0, NOTE_MAX_WORDS).join(' '))
        setEditorKey((k) => k + 1)
      }
    }
    setPostType(newType)
  }

  const handleHrefBlur = async () => {
    if (!href || !client) return
    setFetchingMeta(true)
    try {
      const meta = await client.http.get('/preview', { params: { url: href } })
      if (meta?.title && !title) setTitle(meta.title)
      if (meta?.summary && !content) setContent(meta.summary)
    } catch {}
    finally { setFetchingMeta(false) }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        setGeo({ lat, lon })
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'kowloon-frontend/1.0' } }
          )
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
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await client.activities.createPost({
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
      const postId = res?.result?.id ?? res?.createdId
      navigate(postId ? `/posts/${encodeURIComponent(postId)}` : '/')
    } catch (err) {
      setError(err.message || 'Failed to post.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-0">

      {/* Type selector bar */}
      <div className="flex items-center justify-between border-b-2 border-base-300 bg-base-200 -mx-4 lg:-mx-8 px-4 lg:px-8 mb-6">
        <PostTypeSelector value={postType} onChange={handleTypeChange} />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.cancel', { defaultValue: 'Cancel' })}
          className="px-3 py-2 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-6">

        {/* Link URL */}
        {postType === 'Link' && (
          <Field label={t('composer.linkUrlLabel', { defaultValue: 'URL' })}>
            <div className={`relative ${fetchingMeta ? 'opacity-50' : ''}`}>
              <TextInput
                inputRef={hrefRef}
                type="url"
                value={href}
                onChange={setHref}
                onBlur={handleHrefBlur}
                placeholder={t('composer.linkUrl', { defaultValue: 'https://…' })}
                large
              />
              {fetchingMeta && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-xs uppercase tracking-widest text-base-content/40">
                  {t('common.loading', { defaultValue: 'Loading…' })}
                </span>
              )}
            </div>
          </Field>
        )}

        {/* Title */}
        {hasTitle && (
          <Field label={t('composer.titleLabel', { defaultValue: 'Title' })}>
            <TextInput value={title} onChange={setTitle} placeholder={t('composer.title', { defaultValue: 'Title' })} large />
          </Field>
        )}

        {/* Event date/time */}
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
        <Field label={t('composer.body', { defaultValue: postType === 'Note' ? 'Note' : 'Body' })}>
          <RichTextEditor
            key={editorKey}
            content={content}
            onChange={setContent}
            maxWords={postType === 'Note' ? NOTE_MAX_WORDS : undefined}
            autoFocus
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
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); if (!e.target.value) setGeo(null) }}
              placeholder={t('composer.location', { defaultValue: 'Location…' })}
              className="w-full px-4 py-3 pr-24 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/30 transition-colors"
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={locating}
              className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 font-ui text-xs uppercase tracking-widest transition-colors ${
                geo ? 'text-primary' : locating ? 'text-base-content/20 cursor-wait' : 'text-base-content/30 hover:text-base-content'
              }`}
            >
              <MapPin size={11} />
              {locating ? t('common.loading', { defaultValue: 'Loading…' }) : t('common.gps', { defaultValue: 'GPS' })}
            </button>
          </div>
        </Field>

        {/* Footer: audience + actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-base-300">
          <CircleSelector
            value={audience}
            onChange={setAudience}
            showAudience
            allowCreate
            direction="up"
          />

          <div className="flex items-center gap-3">
            {error && (
              <span role="alert" className="font-ui text-xs uppercase tracking-widest text-error">
                {error}
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 font-ui text-xs uppercase tracking-widest text-base-content/50 hover:text-base-content transition-colors"
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canPost}
              className="px-6 py-2 bg-primary text-primary-content font-ui text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting
                ? t('composer.posting', { defaultValue: 'Posting…' })
                : t('composer.post', { defaultValue: 'Post' })
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
