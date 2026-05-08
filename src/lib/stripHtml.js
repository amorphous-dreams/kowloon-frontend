// Strip HTML tags and collapse whitespace. For text-only previews where
// rendering markup (bullets, headings, links) would clutter the layout.
export default function stripHtml(html) {
  if (!html) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = html.replace(/<[^>]+>/g, ' ')
  return txt.value.replace(/\s+/g, ' ').trim()
}
