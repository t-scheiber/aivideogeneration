'use client'

import { useState } from 'react'
import { MAX_PROVIDER_KEY_LENGTH, normalizeProviderKey } from '@/lib/byok'
import type { StoredKeys } from '@/lib/browser-keys'
import type { VideoProvider } from '@/lib/video-providers'

interface ApiKeysPanelProps {
  providers: VideoProvider[]
  keys: StoredKeys
  selectedProviderId: string
  /** Providers this caller can use with a server key */
  serverKeys: Record<string, boolean> | null
  onSave: (providerId: string, value: string) => boolean
  onClearAll: () => void
}

const mask = (key: string) => `••••${key.slice(-4)}`

export default function ApiKeysPanel({
  providers,
  keys,
  selectedProviderId,
  serverKeys,
  onSave,
  onClearAll,
}: ApiKeysPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const savedCount = Object.keys(keys).length

  const save = (providerId: string) => {
    const key = normalizeProviderKey(drafts[providerId])
    if (!key) {
      setError('That does not look like an API key. Paste it without spaces or line breaks.')
      return
    }
    if (!onSave(providerId, key)) {
      setError('This browser blocked storage, so the key could not be saved.')
      return
    }
    setError('')
    setDrafts((d) => ({ ...d, [providerId]: '' }))
    setEditing((e) => ({ ...e, [providerId]: false }))
  }

  return (
    <div id="api-keys" className="scroll-mt-6 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Your API keys</h3>
        {savedCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-red-300 underline-offset-2 hover:underline"
          >
            Forget all
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Keys stay in this browser&apos;s local storage. A key goes to this server only with a generation
        you start, and the server passes it to the provider without storing it.
      </p>

      <ul className="mt-4 space-y-4">
        {providers.map((provider) => {
          const saved = keys[provider.id]
          const showInput = !saved || editing[provider.id]
          const inputId = `api-key-${provider.id}`
          const hasServerKey = serverKeys?.[provider.id] === true
          return (
            <li
              key={provider.id}
              className={`space-y-2 rounded-xl border p-3 ${
                provider.id === selectedProviderId
                  ? 'border-blue-600/50 bg-blue-950/20'
                  : 'border-gray-700/60 bg-gray-900/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={inputId} className="text-sm font-medium text-white">
                  {provider.name}
                </label>
                <span className="text-xs text-gray-400">
                  {saved ? `Saved ${mask(saved)}` : hasServerKey ? 'Using server key' : 'No key'}
                </span>
              </div>

              {showInput ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    save(provider.id)
                  }}
                >
                  <input
                    id={inputId}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={MAX_PROVIDER_KEY_LENGTH}
                    value={drafts[provider.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [provider.id]: e.target.value }))}
                    placeholder="Paste your key"
                    className="min-w-0 flex-1 rounded-lg border border-gray-700/60 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!drafts[provider.id]?.trim()}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-(--motion-fast) ease-out hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                  {saved && (
                    <button
                      type="button"
                      onClick={() => setEditing((e) => ({ ...e, [provider.id]: false }))}
                      className="shrink-0 px-1 text-xs text-gray-400 hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  )}
                </form>
              ) : (
                <div className="flex gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditing((e) => ({ ...e, [provider.id]: true }))}
                    className="font-medium text-blue-300 underline-offset-2 hover:underline"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => onSave(provider.id, '')}
                    className="font-medium text-red-300 underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {!saved && (
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-300 underline-offset-2 hover:underline"
                >
                  Get a {provider.name} key
                </a>
              )}
            </li>
          )
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Anyone with access to this browser profile can read saved keys. On a shared computer, use
        Forget all when you are done, and set spending limits with your provider.
      </p>
    </div>
  )
}
