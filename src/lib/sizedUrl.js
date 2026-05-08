// Append ?size=N to a Kowloon-proxied file URL so the server returns a
// pre-generated thumbnail instead of the original. Pass-through for any URL
// that isn't a /files/file:... proxy path. Handles existing query params
// (e.g. ?token=…) by switching the separator to &.

export default function sizedUrl(url, size) {
  if (!url || !size) return url
  if (!/\/files\/file:/.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}size=${size}`
}
