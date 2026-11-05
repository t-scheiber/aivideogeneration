// Sign-in allowlist. ALLOWED_EMAILS is a comma-separated list of addresses.
// When it is unset, any Google account may sign in (fine for local dev,
// not for a public deployment that holds paid API keys).

function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowed = allowedEmails()
  if (allowed.length === 0) return true
  return Boolean(email) && allowed.includes(email!.toLowerCase())
}

// Guest mode lets visitors without an approved account generate with their
// own provider keys. Server keys are never used for guests.
// Set GUEST_MODE=off to require sign-in for everything.
export function isGuestModeEnabled(): boolean {
  const value = (process.env.GUEST_MODE ?? 'on').trim().toLowerCase()
  return !['off', 'false', '0', 'no'].includes(value)
}
