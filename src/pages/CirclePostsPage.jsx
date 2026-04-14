// CirclePostsPage — feed of posts addressed to a specific circle.

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useClient } from '../hooks/useClient'
import PostComposer from '../components/posts/PostComposer'
import PostList from '../components/posts/PostList'
import PostTypeIcon from '../components/ui/PostTypeIcon'
import Spinner from '../components/ui/Spinner'
import { toggleType, clearTypes } from '../app/feedSlice'

const POST_TYPES = ['Note', 'Article', 'Media', 'Event', 'Link']

function TypeFilter() {
  const dispatch = useDispatch()
  const { activeTypes } = useSelector((state) => state.feed)
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0 border-b border-base-300 pb-3">
      <button
        onClick={() => dispatch(clearTypes())}
        className={`px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 ${
          activeTypes.length === 0
            ? 'bg-primary text-primary-content'
            : 'bg-base-200 text-base-content/60 hover:bg-base-300'
        }`}
      >
        {t('feed.all')}
      </button>
      {POST_TYPES.map((type) => {
        const active = activeTypes.includes(type)
        return (
          <button
            key={type}
            onClick={() => dispatch(toggleType(type))}
            title={t(`postTypes.${type}`, { defaultValue: type })}
            className={`flex items-center gap-1.5 px-3 py-2 font-ui text-xs uppercase tracking-widest transition-colors border-r border-base-300 last:border-r-0 ${
              active
                ? 'bg-primary text-primary-content'
                : 'bg-base-200 text-base-content/60 hover:bg-base-300'
            }`}
          >
            <PostTypeIcon type={type} size="sm" />
            <span className="hidden sm:inline">{t({ Note: 'feed.notes', Article: 'feed.articles', Media: 'feed.media', Event: 'feed.events', Link: 'feed.links' }[type] ?? type)}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function CirclePostsPage() {
  const { id } = useParams()
  const { activeTypes } = useSelector((state) => state.feed)
  const { user, sessionChecked } = useSelector((state) => state.auth)
  const client = useClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const circleId = decodeURIComponent(id)

  const [circle, setCircle]     = useState(null)
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Load circle metadata
  useEffect(() => {
    if (!sessionChecked || !client) return
    client.feeds.getCircle({ circleId })
      .then((res) => setCircle(res))
      .catch((err) => {
        if (err?.status === 404 || err?.response?.status === 404) setNotFound(true)
        else setNotFound(true) // treat any error as not found — don't leak
      })
  }, [client, circleId, sessionChecked])

  // Load posts
  const loadPosts = useCallback(async () => {
    if (!sessionChecked || !client || notFound) return
    setLoading(true)
    try {
      const res = await client.feeds.getCirclePosts({
        circleId,
        types: activeTypes.length ? activeTypes : undefined,
      })
      setPosts(res?.orderedItems ?? [])
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) setNotFound(true)
      else setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [client, circleId, activeTypes, sessionChecked, notFound])

  useEffect(() => { loadPosts() }, [loadPosts])

  if (!sessionChecked) return null

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 py-16 items-center">
        <p className="font-display text-5xl text-base-content/20">404</p>
        <p className="font-ui text-xs uppercase tracking-widest text-base-content/40">
          {t('circle.notFound', { defaultValue: 'Feed not found' })}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 font-ui text-xs uppercase tracking-widest text-base-content/40 hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> {t('common.goBack', { defaultValue: 'Go back' })}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + circle name */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/circles/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {circle?.name ?? '…'}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('circle.posts', { defaultValue: 'Posts' })}
        </h1>
      </div>

      <TypeFilter />

      {user && (
        <PostComposer
          onPostCreated={loadPosts}
          initialValues={{ to: circleId }}
          prompt={t('composer.promptCircle', { name: circle?.name ?? '…', defaultValue: `Write a post to ${circle?.name ?? '…'}…` })}
        />
      )}

      {loading
        ? <Spinner centered />
        : <PostList posts={posts} />
      }
    </div>
  )
}
