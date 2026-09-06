import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { VideoProviderService } from '@/lib/video-provider-service'
import { parseVideoForm } from '../../../lib/video-request'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let options: ReturnType<typeof parseVideoForm>
    try {
      options = parseVideoForm(await request.formData())
    } catch {
      return NextResponse.json({ error: 'Invalid video generation request' }, { status: 400 })
    }
    const { prompt, negativePrompt, numberOfVideos, aspectRatio, durationSeconds, provider,
      conditioningImageFile, veo3Model, veo3Resolution, veo3Audio } = options

    // Initialize the provider service
    const providerService = new VideoProviderService()

    // Prepare the request data
    const requestData = {
      prompt,
      negativePrompt: negativePrompt || undefined,
      durationSeconds,
      aspectRatio,
      numberOfVideos,
      conditioningImage: conditioningImageFile ? {
        mimeType: conditioningImageFile.type,
        imageBytes: Buffer.from(await conditioningImageFile.arrayBuffer()).toString('base64')
      } : undefined,
      // VEO3-specific parameters
      veo3Model,
      veo3Resolution,
      veo3Audio
    }

    // Get the appropriate API key based on provider
    let apiKey: string | undefined
    switch (provider) {
      case 'veo-3':
        // VEO3 uses its own API key
        apiKey = process.env.VEO3_API_KEY
        if (!apiKey) {
          return NextResponse.json({ 
            error: 'VEO3 API key required. Please set VEO3_API_KEY in your environment variables.' 
          }, { status: 500 })
        }
        break
      case 'runwayml':
        apiKey = process.env.RUNWAYML_API_KEY
        break
      case 'luma':
        apiKey = process.env.LUMA_API_KEY
        break
      case 'openai-sora':
        apiKey = process.env.OPENAI_API_KEY
        break
    }

    // Generate video using the selected provider
    const result = await providerService.generateVideo(provider, requestData, apiKey)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to generate video. Please try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      videos: result.videos,
      provider: result.provider,
      cost: result.cost
    })
  } catch {
    console.error('Video generation request failed')

    return NextResponse.json(
      { error: 'Failed to generate video. Please try again.' },
      { status: 500 }
    )
  }
}

