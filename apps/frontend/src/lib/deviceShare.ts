import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativeApp } from './platform'

export async function shareLink(url: string, title?: string) {
  if (isNativeApp) {
    await Share.share({ url, title })
  } else if (navigator.share) {
    await navigator.share({ url, title })
  } else {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }
}

export function shareCanceled(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : isNativeApp && error instanceof Error && /cancel/i.test(error.message)
}

function base64File(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(file)
  })
}

export async function downloadFile(file: Blob, filename: string) {
  if (isNativeApp) {
    const path = 'exports/' + filename.replace(/[^\p{L}\p{N}._ -]/gu, '_')
    const { uri } = await Filesystem.writeFile({
      path,
      data: await base64File(file),
      directory: Directory.Cache,
      recursive: true,
    })
    await Share.share({ files: [uri] })
    return
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
