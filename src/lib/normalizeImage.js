// Bake EXIF orientation into pixels (and cap size) before upload, in the browser.
//
// Mirrors the mobile app's src/lib/normalizeImage.js. Desktop browsers send the
// original file with its EXIF orientation tag intact and our server auto-orients
// from it -- but some mobile browsers strip the tag while leaving the pixels
// sideways (the same failure the native picker had), so those uploads would land
// rotated. Normalizing here guarantees upright images no matter what the browser
// does with the tag.
//
// This is deterministic: we read the EXIF Orientation tag ourselves and apply the
// exact canvas transform to the RAW pixels (imageOrientation:'none'), rather than
// relying on the browser's own auto-orient -- so it can't double-rotate or regress
// on a browser that ignores the from-image hint.
//
// JPEG/HEIC only. PNG/GIF/WebP/video/audio pass through untouched (re-encoding a
// GIF would flatten its animation; a transparent PNG would lose its alpha).

const MAX_DIM = 2048
const ROTATABLE = /^image\/(jpe?g|heic|heif)$/i
const ROTATABLE_EXT = /\.(jpe?g|heic|heif)$/i

function isRotatable(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return false
  if (file.type && ROTATABLE.test(file.type)) return true
  if (!file.type && file.name && ROTATABLE_EXT.test(file.name)) return true
  return false
}

// Read the EXIF Orientation tag (1..8) from a JPEG buffer; returns 1 if absent.
function getExifOrientation(buf) {
  try {
    const view = new DataView(buf)
    if (view.getUint16(0, false) !== 0xffd8) return 1 // not a JPEG
    const len = view.byteLength
    let offset = 2
    while (offset < len) {
      const marker = view.getUint16(offset, false)
      offset += 2
      if (marker === 0xffe1) {
        // APP1 — verify "Exif\0\0"
        if (view.getUint32(offset + 2, false) !== 0x45786966) return 1
        // "Exif" (4) + 0x0000 (2) -> TIFF header starts 8 bytes past the length.
        const tiff = offset + 8
        const little = view.getUint16(tiff, false) === 0x4949
        const firstIFD = view.getUint32(tiff + 4, little)
        let dir = tiff + firstIFD
        const entries = view.getUint16(dir, little)
        dir += 2
        for (let i = 0; i < entries; i++) {
          const entry = dir + i * 12
          if (view.getUint16(entry, little) === 0x0112) {
            const o = view.getUint16(entry + 8, little)
            return o >= 1 && o <= 8 ? o : 1
          }
        }
        return 1
      } else if ((marker & 0xff00) !== 0xff00) {
        break // not a valid marker
      } else {
        offset += view.getUint16(offset, false)
      }
    }
  } catch {
    /* fall through */
  }
  return 1
}

export async function normalizeImageFile(file) {
  if (!isRotatable(file)) return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  try {
    const buf = await file.arrayBuffer()
    const orientation = getExifOrientation(buf)

    // Raw pixels, explicitly NOT auto-oriented by the browser -- we apply the
    // rotation ourselves below.
    const bitmap = await createImageBitmap(
      new Blob([buf], { type: file.type || 'image/jpeg' }),
      { imageOrientation: 'none' }
    )

    const rawW = bitmap.width
    const rawH = bitmap.height
    const swap = orientation >= 5 && orientation <= 8 // 90-degree rotations

    // Scale so the longest *display* edge <= MAX_DIM (server downsizes anyway;
    // this keeps mobile uploads fast). Longest edge is orientation-invariant.
    const scale = Math.max(rawW, rawH) > MAX_DIM ? MAX_DIM / Math.max(rawW, rawH) : 1
    const sW = Math.round(rawW * scale)
    const sH = Math.round(rawH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = swap ? sH : sW
    canvas.height = swap ? sW : sH
    const ctx = canvas.getContext('2d')

    // Canonical EXIF-orientation canvas transforms (operate in scaled space).
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, sW, 0); break // mirror X
      case 3: ctx.transform(-1, 0, 0, -1, sW, sH); break // 180
      case 4: ctx.transform(1, 0, 0, -1, 0, sH); break // mirror Y
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break // transpose
      case 6: ctx.transform(0, 1, -1, 0, sH, 0); break // 90 CW
      case 7: ctx.transform(0, -1, -1, 0, sH, sW); break // transverse
      case 8: ctx.transform(0, -1, 1, 0, 0, sW); break // 90 CCW
      default: break // 1: identity
    }
    ctx.drawImage(bitmap, 0, 0, sW, sH)
    bitmap.close?.()

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    )
    if (!blob) return file

    const base = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (e) {
    // Never block an upload on normalization -- the server still auto-orients any
    // file that arrives with its EXIF tag intact.
    console.warn('normalizeImageFile failed; using original:', e?.message)
    return file
  }
}
