import { NextRequest, NextResponse } from 'next/server'
import { isEmailAllowed, isGuestModeEnabled } from '@/lib/access'
import { getServerSession } from '@/lib/auth-server'
import { PROVIDER_KEY_HEADER, normalizeProviderKey } from '@/lib/byok'
import {
  VideoGenerationRequest,
  generateVideos,
  getApiKey,
  validateRequest,
} from '@/lib/video-provider-service'
import { getProviderById } from '@/lib/video-providers'

// Generations poll the provider until the clip is ready, which can take minutes.
export const maxDuration = 800

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  const member = Boolean(session?.user) && isEmailAllowed(session?.user.email)
  // The caller's own key for the selected provider. Used for this request
  // only: it is never stored or logged.
  const ownKey = normalizeProviderKey(request.headers.get(PROVIDER_KEY_HEADER))

  if (!member && !ownKey) {
    if (!isGuestModeEnabled()) {
      return session?.user
        ? NextResponse.json({ error: 'This account is not allowed to generate videos' }, { status: 403 })
        : NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Add your own API key for this provider to generate as a guest.' },
      { status: 401 }
    )
  }
  if (!member && !isGuestModeEnabled()) {
    return NextResponse.json({ error: 'Guest mode is turned off on this server. Sign in instead.' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const text = (key: string) => (form.get(key) as string | null) ?? ''
    const imageFile = form.get('conditioningImage') as File | null

    if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Reference image must be 5 MB or smaller' }, { status: 400 })
    }

    const generation: VideoGenerationRequest = {
      providerId: text('provider'),
      modelId: text('model'),
      prompt: text('prompt'),
      negativePrompt: text('negativePrompt') || undefined,
      durationSeconds: Number(text('durationSeconds')),
      aspectRatio: text('aspectRatio'),
      resolution: text('resolution'),
      audio: text('audio') === 'true',
      numberOfVideos: Number(text('numberOfVideos') || '1'),
      conditioningImage: imageFile
        ? {
            mimeType: imageFile.type,
            imageBytes: Buffer.from(await imageFile.arrayBuffer()).toString('base64'),
          }
        : undefined,
    }

    const invalid = validateRequest(generation)
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 })
    }

    const provider = getProviderById(generation.providerId)!
    // Your own key wins; members fall back to the server key
    const apiKey = ownKey ?? (member ? getApiKey(provider) : undefined)
    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider.name} has no API key on the server. Add your own key or set ${provider.apiKeyEnv[0]}.` },
        { status: 503 }
      )
    }

    const keySource = ownKey ? 'own key' : 'server key'
    console.log(
      `Generating ${generation.numberOfVideos} video(s) with ${provider.id}/${generation.modelId} (${member ? 'member' : 'guest'}, ${keySource})`
    )
    const result = await generateVideos(generation, apiKey)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Generation failed' }, { status: 502 })
    }

    return NextResponse.json({
      videos: result.videos,
      provider: result.provider,
      model: result.model,
      cost: result.cost,
      warning: result.error,
    })
  } catch (error) {
    console.error('Error generating video:', error)
    return NextResponse.json({ error: 'Failed to generate video. Please try again.' }, { status: 500 })
  }
}
