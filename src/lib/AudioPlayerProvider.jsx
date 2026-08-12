// AudioPlayerProvider — one global audio player + queue, matching the mobile
// app (issue #83). Only one clip plays at a time: every "play audio" request
// goes through here, so tapping a new clip either plays now or queues (prompt
// when something's already playing). Renders a persistent right-edge
// slide-out bar (title + rw/prev/play/next/ff + close) and the play-now/
// add-to-queue prompt. Consume via useAudioBar(): { requestTrack, current, ... }.
//
// Mounted once at the App root (alongside ToastStack) so it survives route
// navigation — audio keeps playing as you move around the SPA.

import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, FastForward, Music, Pause, Play, Rewind, SkipBack, SkipForward, X } from 'lucide-react'

const Ctx = createContext(null)
export function useAudioBar() {
  return useContext(Ctx)
}

const SEEK = 15 // seconds for rw/ff
const HANDLE_W = 40

// Right-edge slide-out player: a small tab clings to the right edge; click it
// and the full player slides out. Starts minimized (a fresh session always
// resets to the tab); the user's expand/collapse choice persists within a session.
function AudioBar({ api }) {
  const { current, playing, position, duration, queue, index, toggle, prev, next, seekBy, stop } = api
  const [expanded, setExpanded] = useState(false)
  const [panelW, setPanelW] = useState(340)
  const hasCurrent = !!current
  const hadCurrentRef = useRef(false)

  useEffect(() => {
    function updateWidth() {
      setPanelW(Math.min(340, window.innerWidth - 16))
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Collapse whenever a fresh session starts (a track appears after the bar
  // was empty) — otherwise `expanded` persists from before you hit X and the
  // next clip pops the player open instead of staying a tab. Within a session
  // (next/prev/queue), the user's expand/collapse choice is preserved.
  useEffect(() => {
    if (hasCurrent && !hadCurrentRef.current) setExpanded(false)
    hadCurrentRef.current = hasCurrent
  }, [hasCurrent])

  if (!current) return null

  const canPrev = index > 0 || position > 3
  const canNext = index + 1 < queue.length
  const pct = duration ? Math.min(100, (position / duration) * 100) : 0

  return createPortal(
    <div
      className="fixed z-40 flex items-stretch shadow-lg transition-transform duration-200 ease-out"
      style={{
        right: 0,
        top: 'max(5rem, 38vh)',
        width: panelW,
        transform: `translateX(${expanded ? 0 : panelW - HANDLE_W}px)`,
      }}
    >
      {/* Handle — the always-visible tab on the right edge. */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'Collapse player' : 'Expand player'}
        style={{ width: HANDLE_W, backgroundColor: 'var(--post-color-media)' }}
        className="flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
      >
        {expanded
          ? <ChevronRight size={20} color="var(--color-secondary-content)" strokeWidth={2} />
          : <Music size={20} color="var(--color-secondary-content)" strokeWidth={1.75} />
        }
      </button>

      {/* Player */}
      <div className="flex-1 px-3 pt-2 pb-2" style={{ backgroundColor: 'var(--post-color-media)' }}>
        <div className="flex items-center">
          <span className="font-ui text-xs truncate flex-1" style={{ color: 'var(--color-secondary-content)' }}>
            {current.title || 'Audio'}
            {queue.length > 1 ? `  ·  ${index + 1}/${queue.length}` : ''}
          </span>
          <button type="button" onClick={stop} aria-label="Close player" className="ml-2 shrink-0 opacity-85 hover:opacity-100 transition-opacity">
            <X size={18} color="var(--color-secondary-content)" strokeWidth={2} />
          </button>
        </div>
        <div className="flex items-center justify-center mt-1.5 gap-4">
          <button type="button" onClick={() => seekBy(-SEEK)} aria-label="Rewind 15 seconds" className="opacity-85 hover:opacity-100 transition-opacity">
            <Rewind size={18} color="var(--color-secondary-content)" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={prev} disabled={!canPrev} aria-label="Previous track">
            <SkipBack size={20} color="var(--color-secondary-content)" strokeWidth={1.75} style={{ opacity: canPrev ? 1 : 0.35 }} />
          </button>
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="opacity-95 hover:opacity-100 transition-opacity">
            {playing
              ? <Pause size={26} color="var(--color-secondary-content)" fill="var(--color-secondary-content)" strokeWidth={0} />
              : <Play size={26} color="var(--color-secondary-content)" fill="var(--color-secondary-content)" strokeWidth={0} />
            }
          </button>
          <button type="button" onClick={next} disabled={!canNext} aria-label="Next track">
            <SkipForward size={20} color="var(--color-secondary-content)" strokeWidth={1.75} style={{ opacity: canNext ? 1 : 0.35 }} />
          </button>
          <button type="button" onClick={() => seekBy(SEEK)} aria-label="Fast-forward 15 seconds" className="opacity-85 hover:opacity-100 transition-opacity">
            <FastForward size={18} color="var(--color-secondary-content)" strokeWidth={1.75} />
          </button>
        </div>
        <div className="h-0.5 bg-black/25 mt-2">
          <div className="h-0.5 bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Play now / Add to queue prompt — shown when something's already playing and
// a different track is requested.
function QueuePrompt({ prompt, onPlayNow, onEnqueue, onDismiss }) {
  if (!prompt) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onDismiss} />
      <div className="relative w-full sm:w-[26rem] bg-base-100 px-5 pt-4 pb-6 sm:pb-5">
        <p className="font-ui text-sm text-base-content/60 mb-1">Something&rsquo;s already playing</p>
        <p className="font-ui text-base text-base-content font-bold mb-4 truncate">
          {prompt.track?.title || 'Audio'}
        </p>
        <button
          type="button"
          onClick={() => onPlayNow(prompt.track)}
          className="w-full bg-primary text-primary-content py-3 font-ui uppercase tracking-[0.14em] text-xs font-bold hover:opacity-90 transition-opacity mb-2"
        >
          Play now
        </button>
        <button
          type="button"
          onClick={() => onEnqueue(prompt.track)}
          className="w-full bg-base-200 text-base-content py-3 font-ui uppercase tracking-[0.14em] text-xs hover:bg-base-300 transition-colors"
        >
          Add to queue
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function AudioPlayerProvider({ children }) {
  const audioElRef = useRef(null)
  if (!audioElRef.current && typeof Audio !== 'undefined') {
    audioElRef.current = new Audio()
  }

  // Queue + index are authoritative in refs (no stale closures in callbacks);
  // a version counter forces re-render for the bar.
  const queueRef = useRef([])
  const indexRef = useRef(-1)
  const promptRef = useRef(null) // { track } while asking play-now vs queue
  const [, bump] = useReducer((x) => x + 1, 0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  function setState(queue, index) {
    queueRef.current = queue
    indexRef.current = index
    bump()
  }

  const current =
    indexRef.current >= 0 && indexRef.current < queueRef.current.length
      ? queueRef.current[indexRef.current]
      : null

  function updateMediaSession(track) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: track?.title || 'Audio',
      artist: 'Kowloon',
    })
  }

  function loadAndPlay(track) {
    const a = audioElRef.current
    if (!a || !track?.url) return
    a.src = track.url
    a.play().catch(() => {})
    updateMediaSession(track)
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  function startFresh(track) {
    setState([track], 0)
    loadAndPlay(track)
  }
  function playNow(track) {
    promptRef.current = null
    const q = queueRef.current.filter((t) => t.id !== track.id)
    const i = Math.max(indexRef.current, -1)
    const next = [...q.slice(0, i + 1), track, ...q.slice(i + 1)]
    const newIndex = next.findIndex((t) => t.id === track.id)
    setState(next, newIndex)
    loadAndPlay(track)
  }
  function enqueue(track) {
    promptRef.current = null
    if (indexRef.current < 0) return startFresh(track)
    if (queueRef.current.some((t) => t.id === track.id)) return bump()
    setState([...queueRef.current, track], indexRef.current)
  }
  function requestTrack(track) {
    if (!track?.url) return
    if (indexRef.current < 0) return startFresh(track)
    if (current?.id === track.id) {
      toggle()
      return
    }
    promptRef.current = { track }
    bump()
  }
  function toggle() {
    const a = audioElRef.current
    if (!a) return
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }
  function next() {
    const q = queueRef.current, i = indexRef.current
    if (i + 1 < q.length) { setState(q, i + 1); loadAndPlay(q[i + 1]) }
  }
  function prev() {
    const a = audioElRef.current
    if (position > 3) { if (a) a.currentTime = 0; return }
    const q = queueRef.current, i = indexRef.current
    if (i > 0) { setState(q, i - 1); loadAndPlay(q[i - 1]) }
    else if (a) a.currentTime = 0
  }
  function seekBy(delta) {
    const a = audioElRef.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(duration || 0, position + delta))
  }
  function stop() {
    const a = audioElRef.current
    if (a) { a.pause(); a.removeAttribute('src'); a.load() }
    setState([], -1)
  }

  // Wire the <audio> element's events once.
  useEffect(() => {
    const a = audioElRef.current
    if (!a) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setPosition(a.currentTime || 0)
    const onLoadedMeta = () => setDuration(a.duration || 0)
    const onEnded = () => {
      const q = queueRef.current, i = indexRef.current
      if (i + 1 < q.length) { setState(q, i + 1); loadAndPlay(q[i + 1]) }
      else setPlaying(false)
    }
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('timeupdate', onTimeUpdate)
    a.addEventListener('loadedmetadata', onLoadedMeta)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('timeupdate', onTimeUpdate)
      a.removeEventListener('loadedmetadata', onLoadedMeta)
      a.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // OS-level media controls (lock screen / hardware keys / notification) via
  // the Media Session API — the web equivalent of expo-audio's lock-screen
  // controls on mobile.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => toggle())
    navigator.mediaSession.setActionHandler('pause', () => toggle())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-SEEK))
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(SEEK))
    return () => {
      try {
        for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward']) {
          navigator.mediaSession.setActionHandler(action, null)
        }
      } catch { /* unsupported action type in some browsers */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  const api = {
    requestTrack, playNow, enqueue, toggle, next, prev, seekBy, stop,
    current, playing, position, duration,
    queue: queueRef.current, index: indexRef.current,
  }

  const prompt = promptRef.current

  return (
    <Ctx.Provider value={api}>
      {children}
      <AudioBar api={api} />
      <QueuePrompt
        prompt={prompt}
        onPlayNow={playNow}
        onEnqueue={enqueue}
        onDismiss={() => { promptRef.current = null; bump() }}
      />
    </Ctx.Provider>
  )
}
