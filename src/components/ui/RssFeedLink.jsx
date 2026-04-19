// RssFeedLink — injects a <link rel="alternate"> RSS discovery tag into <head>.
// Feed readers and browsers sniff for this automatically.
// Removes itself on unmount so navigating away cleans up.

import { useEffect } from 'react'

export default function RssFeedLink({ href, title }) {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.type = 'application/rss+xml'
    link.title = title || 'RSS Feed'
    link.href = href
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [href, title])

  return null
}
