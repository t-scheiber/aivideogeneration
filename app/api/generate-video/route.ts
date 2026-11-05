import { NextRequest, NextResponse } from 'next/server'
import { isEmailAllowed } from '@/lib/access'
import { getServerSession } from '@/lib/auth-server'
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
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (!isEmailAllowed(session.user.email)) {
    return NextResponse.json({ error: 'This account is not allowed to generate videos' }, { status: 403 })
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
    const apiKey = getApiKey(provider)
    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider.name} is not configured. Set ${provider.apiKeyEnv[0]} on the server.` },
        { status: 503 }
      )
    }

    console.log(`Generating ${generation.numberOfVideos} video(s) with ${provider.id}/${generation.modelId}`)
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
