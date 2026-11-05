// Bring-your-own-key constants shared by the browser and the API routes.

/** Request header that carries the caller's key for the selected provider */
export const PROVIDER_KEY_HEADER = 'x-provider-api-key'

/** Longest key the server accepts. Real keys are well under this. */
export const MAX_PROVIDER_KEY_LENGTH = 512

/** Trims a key and rejects values that cannot be a provider key. */
export function normalizeProviderKey(value: string | null | undefined): string | null {
  const key = value?.trim() ?? ''
  if (!key || key.length > MAX_PROVIDER_KEY_LENGTH) return null
  // Header values must be visible ASCII; anything else is a paste error
  if (!/^[\x21-\x7e]+$/.test(key)) return null
  return key
}
