// Home — server landing for anonymous users; circle feed for authenticated users.

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useClient } from '../hooks/useClient'
import FeedHeader from '../components/posts/FeedHeader'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import Spinner from '../components/ui/Spinner'

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_CIRCLES = [
  { id: 'circle:following@kwln.org', name: 'Following', summary: 'Everyone you follow', icon: 'https://picsum.photos/seed/following/200/200' },
  { id: 'circle:friends@kwln.org',   name: 'Friends',   summary: 'Close friends',       icon: 'https://picsum.photos/seed/friends7/200/200' },
  { id: 'circle:music@kwln.org',     name: 'Music',     summary: 'Music folks',         icon: 'https://picsum.photos/seed/music42/200/200' },
  { id: 'circle:tech@kwln.org',      name: 'Tech',      summary: 'Tech & programming',  icon: 'https://picsum.photos/seed/tech19/200/200' },
]

const H = (n) => new Date(Date.now() - 1000 * 60 * 60 * n).toISOString()
const M = (n) => new Date(Date.now() - 1000 * 60 * n).toISOString()
const MOCK_AUTHOR = { id: '@jzellis@kwln.org', username: 'jzellis', displayName: 'Joshua Ellis' }
const DESIGN  = { ...MOCK_AUTHOR, id: '@designthink@kwln.org', username: 'designthink', displayName: 'Design Thinking' }
const RECORDS = { ...MOCK_AUTHOR, id: '@recordhead@kwln.org',  username: 'recordhead',  displayName: 'Record Head' }

const MOCK_POSTS = [
  { id: 'post:1@kwln.org', type: 'Note',    source: 'Just finished reading *The Stars My Destination* for the third time. Still the best science fiction novel ever written, no notes.', published: M(14), visibility: 'Public', attributedTo: MOCK_AUTHOR },
  { id: 'post:2@kwln.org', type: 'Article', name: 'On the Aesthetics of Midcentury Design', source: 'Reid Miles understood that negative space *is* content.', published: H(2), visibility: 'Public', attributedTo: DESIGN },
  { id: 'post:3@kwln.org', type: 'Link',    name: 'Blue Note Records: The Complete Discography', href: 'https://www.discogs.com/label/3073-Blue-Note-Records', source: 'An absolutely essential resource.', published: H(5), visibility: 'Server', attributedTo: RECORDS },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const { circleId: selectedCircleId, activeTypes } = useSelector((state) => state.feed)
  const client = useClient()

  const [circles, setCircles]       = useState([])
  const [circlesLoaded, setCirclesLoaded] = useState(false)
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [nextCursor, setNextCursor] = useState(null)

  // Active circle: Redux selection > user's Following circle from JWT > first circle
  const activeCircleId = selectedCircleId ?? user?.following ?? circles[0]?.id ?? null
  const currentCircle  = circles.find((c) => c.id === activeCircleId) ?? circles[0] ?? null

  // Load user's circles once on login
  useEffect(() => {
    if (!sessionChecked) return
    if (!client || !user) {
      setCircles(MOCK_CIRCLES)
      setCirclesLoaded(true)
      return
    }
    client.feeds.getUserCircles({ userId: user.id })
      .then((res) => {
        setCircles(res?.orderedItems ?? res ?? [])
        setCirclesLoaded(true)
      })
      .catch(() => {
        setCircles([])
        setCirclesLoaded(true)
      })
  }, [client, user?.id, sessionChecked])

  // Load feed once circles are available and whenever circle/type filters change
  const loadFeed = useCallback(async () => {
    if (!sessionChecked || !circlesLoaded) return
    const circleToLoad = selectedCircleId ?? user?.following ?? circles[0]?.id
    if (!client || !user) {
      setPosts(MOCK_POSTS)
      setLoading(false)
      return
    }
    if (!circleToLoad) {
      // Logged in but no circles yet — show empty state, not spinner forever
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await client.feeds.getCirclePosts({
        circleId: circleToLoad,
        types: activeTypes.length ? activeTypes : undefined,
      })
      setPosts(res?.orderedItems ?? [])
      setNextCursor(res?.next ?? null)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [client, user, sessionChecked, circlesLoaded, selectedCircleId, circles, activeTypes])

  useEffect(() => { loadFeed() }, [loadFeed])

  // Still checking stored session — let Layout's spinner handle it
  if (!sessionChecked) return null

  return (
    <div className="flex flex-col">
      <FeedHeader circles={circles} currentCircle={currentCircle} />
      {user && <PostComposer circles={circles} onPostCreated={loadFeed} />}
      {loading
        ? <Spinner centered />
        : <PostList posts={posts} />
      }
    </div>
  )
}
