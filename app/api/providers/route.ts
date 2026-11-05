import { NextResponse } from 'next/server'
import { getApiKey } from '@/lib/video-provider-service'
import { getAllProviders } from '@/lib/video-providers'

// Tells the UI which providers have an API key on the server. Never returns the keys.
export const dynamic = 'force-dynamic'

export function GET() {
  const configured = Object.fromEntries(
    getAllProviders().map((provider) => [provider.id, Boolean(getApiKey(provider))])
  )
  return NextResponse.json({ configured })
}
