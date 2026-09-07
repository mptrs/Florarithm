/**
 * Getting a phone photograph down to something worth keeping.
 *
 * A photo off an iPhone is four megabytes and four thousand pixels wide; the
 * hero it lands in is 340 tall. Shrinking on the way in rather than on the way
 * out is what keeps IndexedDB small enough to survive Safari's eviction, and —
 * for the day photos reach the private repo — keeps a commit from being four
 * megabytes of camera noise.
 */

/** Long edge, in pixels. Twice the hero's height on a 3× screen, so the photo
 *  still holds up if it is ever opened full screen. */
const MAX_EDGE = 1600

/** JPEG, not PNG: these are photographs, and a PNG of a photograph is roughly
 *  ten times the size for a difference nobody can see. */
const QUALITY = 0.82

export type ResizedImage = { blob: Blob; width: number; height: number }

/** Thrown for anything the browser could not turn into pixels — a HEIC it does
 *  not know, a truncated file, a PDF someone picked by mistake. */
export class ImageDecodeError extends Error {}

export async function resizeForStorage(file: Blob): Promise<ResizedImage> {
  const source = await decode(file)

  try {
    const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width
    const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height
    if (!sourceWidth || !sourceHeight) throw new ImageDecodeError('That image has no size.')

    // Only ever downwards: blowing a small photo up to 1600 would cost bytes
    // and add nothing.
    const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new ImageDecodeError('This browser would not give us a canvas.')
    context.drawImage(source, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    })
    if (!blob) throw new ImageDecodeError('The photo could not be re-encoded.')

    return { blob, width, height }
  } finally {
    if ('close' in source) source.close()
  }
}

/**
 * `imageOrientation: 'from-image'` is the entire reason this goes through
 * `createImageBitmap`. A portrait photo off a phone is stored landscape with an
 * EXIF flag saying "rotate this", and `drawImage` on a plain `<img>` ignores
 * that flag — which is exactly how a photograph ends up sideways in the one
 * place it was meant to look right.
 *
 * The `<img>` path is the fallback, and worth having for its own reason: iOS
 * Safari can decode a HEIC in an `<img>` that `createImageBitmap` refuses.
 */
async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through — the element below may still manage it.
    }
  }

  return decodeInElement(file)
}

function decodeInElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageDecodeError('That file is not an image this browser can read.'))
    }

    image.src = url
  })
}
