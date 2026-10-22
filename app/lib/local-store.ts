/** localStorage 上的一個 JSON 值；storage 事件讓其他分頁同步 */
export function localStore<T>(key: string, empty: T) {
  const listeners = new Set<() => void>()
  let cache: { raw: string | null; value: T } = { raw: null, value: empty }

  const get = (): T => {
    let raw: string | null
    try {
      raw = localStorage.getItem(key)
    } catch {
      return empty
    }
    if (raw !== cache.raw) {
      try {
        cache = { raw, value: raw ? (JSON.parse(raw) as T) : empty }
      } catch {
        cache = { raw, value: empty }
      }
    }
    return cache.value
  }

  return {
    get,
    getServer: () => empty,
    set: (update: (prev: T) => T) => {
      try {
        localStorage.setItem(key, JSON.stringify(update(get())))
      } catch {
        // 無痕模式或容量滿：只是前端暫存，靜默略過
      }
      listeners.forEach((l) => l())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      const onStorage = (e: StorageEvent) => e.key === key && listener()
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
  }
}
