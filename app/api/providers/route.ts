import { NextResponse } from 'next/server'
import { isEmailAllowed, isGuestModeEnabled } from '@/lib/access'
import { getServerSession } from '@/lib/auth-server'
import { getApiKey } from '@/lib/video-provider-service'
import { getAllProviders } from '@/lib/video-providers'

// Tells the UI which providers this caller can use with a server key, and
// whether guests may bring their own. Never returns the keys.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession()
  const member = Boolean(session?.user) && isEmailAllowed(session?.user.email)

  // Guests and non-allowlisted accounts never get server keys
  const configured = Object.fromEntries(
    getAllProviders().map((provider) => [provider.id, member && Boolean(getApiKey(provider))])
  )
  return NextResponse.json({ configured, member, guestMode: isGuestModeEnabled() })
}
