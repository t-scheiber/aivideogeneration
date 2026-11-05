'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Provider keys the visitor saved in this browser, keyed by provider ID.
// They live in localStorage and only leave the browser as a request header
// on a generation the visitor starts.

const STORAGE_KEY = 'aivideo.providerKeys.v1'
const CHANGE_EVENT = 'aivideo:provider-keys'

export type StoredKeys = Record<string, string>

const EMPTY: StoredKeys = {}
let cachedRaw: string | null = null
let cachedKeys: StoredKeys = EMPTY

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // Storage blocked (private mode, disabled cookies)
  }
}

function getSnapshot(): StoredKeys {
  const raw = readRaw()
  if (raw === cachedRaw) return cachedKeys
  cachedRaw = raw
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    cachedKeys =
      parsed && typeof parsed === 'object'
        ? Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''
            )
          )
        : EMPTY
  } catch {
    cachedKeys = EMPTY
  }
  return cachedKeys
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', onStorage) // Other tabs
  window.addEventListener(CHANGE_EVENT, onChange) // This tab
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function write(keys: StoredKeys): boolean {
  try {
    if (Object.keys(keys).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return true
  } catch {
    return false
  }
}

export function useStoredKeys() {
  const keys = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)

  const setKey = useCallback((providerId: string, value: string) => {
    const next = { ...getSnapshot() }
    const trimmed = value.trim()
    if (trimmed) next[providerId] = trimmed
    else delete next[providerId]
    return write(next)
  }, [])

  const clearAll = useCallback(() => write({}), [])

  return { keys, setKey, clearAll }
}
