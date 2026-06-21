import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'

const DEFAULT_GEOCODING_URL = 'https://nominatim.openstreetmap.org'

// variant="composer" — borderless inline row (PostComposer style)
// variant="page"     — bordered input with absolute GPS button (NewPostPage/EditPostPage style)
export default function LocationField({
  value,
  onChange,
  geo,
  onGeoSelect,
  locating,
  onGeolocate,
  geocodingUrl,
  borderTop = false,
  variant = 'composer',
  popupHostRef = null,
}) {
  const { t } = useTranslation()
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const debounceRef = useRef(null)
  const containerRef = useRef(null)
  const baseUrl = (geocodingUrl || DEFAULT_GEOCODING_URL).replace(/\/$/, '')

  // Debounced forward geocoding — skip if geo is already set (GPS was used)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!value || value.length < 2 || geo) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${baseUrl}/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'kowloon-frontend/1.0' } }
        )
        const data = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [value, geo, baseUrl])

  // Position the dropdown via fixed coords so overflow:hidden ancestors don't clip it
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (s) => {
    const addr = s.address || {}
    const parts = [
      s.name || addr.city || addr.town || addr.village || addr.county,
      addr.state,
      addr.country_code?.toUpperCase(),
    ].filter(Boolean)
    onChange(parts.join(', '))
    onGeoSelect({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) })
    setOpen(false)
    setSuggestions([])
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    if (!e.target.value) onGeoSelect(null)
  }

  const dropdown = open && createPortal(
    <ul
      style={dropdownStyle}
      className="bg-base-100 border-2 border-base-300 border-t-0 max-h-48 overflow-y-auto shadow-md"
    >
      {suggestions.map((s, i) => (
        <li key={i}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
            className="w-full text-left px-4 py-2 font-ui text-xs text-base-content hover:bg-base-200 transition-colors truncate"
          >
            {s.display_name}
          </button>
        </li>
      ))}
    </ul>,
    popupHostRef?.current ?? document.body
  )

  if (variant === 'page') {
    return (
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder={t('composer.location', { defaultValue: 'Location…' })}
          className="w-full px-4 py-3 pr-24 bg-base-100 border-2 border-base-300 focus:border-primary outline-none font-ui text-sm tracking-wide text-base-content placeholder:text-base-content/30 transition-colors"
        />
        <button
          type="button"
          onClick={onGeolocate}
          disabled={locating}
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 font-ui text-xs uppercase tracking-widest transition-colors ${
            geo ? 'text-primary' : locating ? 'text-base-content/20 cursor-wait' : 'text-base-content/30 hover:text-base-content'
          }`}
        >
          <MapPin size={11} />
          {locating ? '…' : t('common.gps', { defaultValue: 'GPS' })}
        </button>
        {dropdown}
      </div>
    )
  }

  // variant="composer"
  return (
    <div
      ref={containerRef}
      className={`relative flex items-center ${borderTop ? 'border-t-2' : 'border-b-2'} border-base-300 bg-base-100`}
    >
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={t('composer.location')}
        aria-label={t('composer.locationLabel')}
        className="flex-1 px-4 py-2 bg-transparent font-ui text-xs uppercase tracking-widest text-base-content placeholder:text-base-content/30 outline-none"
      />
      {!value && (
        <span className="text-base-content/30 text-xs italic font-reading shrink-0" aria-hidden="true">
          {t('common.optional')}
        </span>
      )}
      <button
        type="button"
        onClick={onGeolocate}
        disabled={locating}
        aria-label={t('a11y.gps')}
        className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors shrink-0 ${
          geo ? 'text-primary' : locating ? 'text-base-content/20 cursor-wait' : 'text-base-content/30 hover:text-base-content'
        }`}
      >
        <span aria-hidden="true">{locating ? '…' : t('common.gps')}</span>
      </button>
      {dropdown}
    </div>
  )
}
