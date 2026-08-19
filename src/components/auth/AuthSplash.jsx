import { useEffect, useRef } from 'react'
import nightSceneSvg from '../../assets/splash/night-scene.svg?raw'
import daySceneSvg from '../../assets/splash/day-scene.svg?raw'
import planeUrl from '../../assets/splash/plane.svg'

// Animated day/night city scene for the auth screens' decorative panel —
// same illustrations, clouds, occasional plane, and window-flicker as the
// kowloon.network marketing splash, ported to a mounted/unmounted React
// component instead of a static page (hence the careful cleanup below —
// this thing comes and goes as people navigate between Login/Register).
//
// Deliberately plain Canvas 2D for the clouds/plane layer, not p5.js — that
// library is ~800KB for what's here just a couple dozen drifting ellipses
// and one translating image; not worth it as an app dependency for a
// decorative element.
//
// Fills whatever sized container it's rendered in (parent must be
// `position: relative`); the scene SVGs use preserveAspectRatio="xMidYMid
// slice" (baked into the copied asset files) so they cover an arbitrary
// panel aspect ratio instead of letterboxing like the marketing site's
// fixed 16:9 hero does.

const SCENES = {
  night: { bg: '#130848', cloud: [48, 25, 171] },
  day: { bg: '#ADD8E1', cloud: [255, 255, 255] },
}

const PLANE_ASPECT = 2334 / 2030
const PLANE_WIDTH_RATIO = 0.093
const PLANE_MOBILE_BREAKPOINT = 720
const PLANE_Y_MIN_RATIO = -0.3
const PLANE_Y_MAX_RATIO = 1.3
const PLANE_MIN_DELAY_MS = 10000
const PLANE_MAX_DELAY_MS = 30000
const PLANE_VX = -Math.SQRT1_2
const PLANE_VY = -Math.SQRT1_2
const FLICKER_COLORS = ['#dd308c', '#1b0360']
const FLICKER_INTERVAL_MS = 3000

function random(min, max) {
  return min + Math.random() * (max - min)
}

export default function AuthSplash() {
  const containerRef = useRef(null)
  const imgbgRef = useRef(null)
  const nightRef = useRef(null)
  const dayRef = useRef(null)
  const canvasRef = useRef(null)
  const planeImgRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const planeImg = new Image()
    let planeReady = false
    planeImg.onload = () => { planeReady = true }
    planeImg.src = planeUrl
    planeImgRef.current = planeImg

    const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
    const lightMq = window.matchMedia('(prefers-color-scheme: light)')
    let currentSceneId = 'night'
    let cloudColor = SCENES.night.cloud

    function pickScene() {
      if (darkMq.matches) return 'night'
      if (lightMq.matches) return 'day'
      const hour = new Date().getHours()
      return hour >= 6 && hour < 20 ? 'day' : 'night'
    }

    function applyScene() {
      const id = pickScene()
      const s = SCENES[id]
      nightRef.current.style.display = id === 'night' ? 'block' : 'none'
      dayRef.current.style.display = id === 'day' ? 'block' : 'none'
      imgbgRef.current.style.background = s.bg
      cloudColor = s.cloud
      currentSceneId = id
    }

    applyScene()
    darkMq.addEventListener('change', applyScene)
    lightMq.addEventListener('change', applyScene)

    let clouds = []
    let plane = null
    let nextPlaneAt = 0
    let planeBaseW = 0
    let planeSpeedMult = 1
    let width = 0
    let height = 0

    function scheduleNextPlane() {
      nextPlaneAt = performance.now() + random(PLANE_MIN_DELAY_MS, PLANE_MAX_DELAY_MS)
    }

    function launchPlane() {
      const scale = random(0.75, 1.25)
      const w = planeBaseW * scale
      const h = w / PLANE_ASPECT
      const speed = random(1.6, 2.3) * planeSpeedMult
      plane = {
        x: width + w,
        y: random(height * PLANE_Y_MIN_RATIO, height * PLANE_Y_MAX_RATIO),
        w,
        h,
        vx: PLANE_VX * speed,
        vy: PLANE_VY * speed,
      }
    }

    function setupSizing() {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = width
      canvas.height = height
      planeBaseW = width * PLANE_WIDTH_RATIO
      planeSpeedMult = width < PLANE_MOBILE_BREAKPOINT ? 0.5 : 1

      const minSize = width * 0.03
      const maxSize = width * 0.2
      clouds = Array.from({ length: 20 }, () => ({
        x: random(0, width),
        y: random(0, height * 0.5),
        size: random(minSize, maxSize),
        speed: random(0.05, 0.2),
      }))
    }

    setupSizing()
    scheduleNextPlane()

    const resizeObserver = new ResizeObserver(() => setupSizing())
    resizeObserver.observe(container)

    let rafId
    function draw() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = `rgb(${cloudColor[0]}, ${cloudColor[1]}, ${cloudColor[2]})`
      for (const c of clouds) {
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, c.size / 2, (c.size * 0.6) / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        c.x += c.speed
        if (c.x - c.size > width) c.x = -c.size
      }

      if (currentSceneId !== 'day') {
        plane = null
      } else if (!plane && performance.now() > nextPlaneAt) {
        launchPlane()
      }
      if (plane) {
        if (planeReady) {
          ctx.drawImage(planeImg, plane.x, plane.y, plane.w, plane.h)
        }
        plane.x += plane.vx
        plane.y += plane.vy
        if (plane.x < -plane.w || plane.y < -plane.h) {
          plane = null
          scheduleNextPlane()
        }
      }

      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    const flickerId = setInterval(() => {
      for (let i = 1; i <= 8; i++) {
        const el = container.querySelector('#window' + i)
        if (el) el.style.fill = FLICKER_COLORS[Math.floor(Math.random() * FLICKER_COLORS.length)]
      }
    }, FLICKER_INTERVAL_MS)

    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(flickerId)
      resizeObserver.disconnect()
      darkMq.removeEventListener('change', applyScene)
      lightMq.removeEventListener('change', applyScene)
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0">
      <div ref={imgbgRef} className="absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <div
        ref={nightRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        dangerouslySetInnerHTML={{ __html: nightSceneSvg }}
      />
      <div
        ref={dayRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        dangerouslySetInnerHTML={{ __html: daySceneSvg }}
      />
    </div>
  )
}
