const STUDIO_ORIGIN = 'https://studio.arc.io'
const HANDSHAKE_TIMEOUT_MS = 1500
const trimSlash = (url: string) => url.replace(/\/+$/, '')
const ownBase = () =>
  trimSlash(
    window.location.origin +
      ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'),
  )
let cached: Promise<string> | undefined

export function getShareBase(): Promise<string> {
  if (window.self === window.top) return Promise.resolve(ownBase())
  cached ??= new Promise<string>((resolve) => {
    const finish = (url: string) => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(url)
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== STUDIO_ORIGIN || event.source !== window.parent) return
      const data = event.data as { type?: string; url?: unknown } | null
      if (data?.type === 'arc-share:url' && typeof data.url === 'string')
        finish(trimSlash(data.url))
    }
    const timer = setTimeout(() => finish(ownBase()), HANDSHAKE_TIMEOUT_MS)
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'arc-share:hello' }, STUDIO_ORIGIN)
  })
  return cached
}
