import { VideoProvider, getProviderById } from './video-providers'

export interface VideoGenerationRequest {
  prompt: string
  negativePrompt?: string
  durationSeconds: number
  aspectRatio: string
  numberOfVideos: number
  conditioningImage?: {
    mimeType: string
    imageBytes: string
  }
  // VEO3-specific parameters
  veo3Model?: string
  veo3Resolution?: string
  veo3Audio?: boolean
}

export interface VideoGenerationResponse {
  success: boolean
  videos?: string[]
  error?: string
  provider: string
  cost?: number
}

export class VideoProviderService {
  private providers: Map<string, VideoProvider> = new Map()

  constructor() {
    // Initialize providers
    Object.values(require('./video-providers').VIDEO_PROVIDERS).forEach((provider: any) => {
      this.providers.set(provider.id, provider)
    })
  }

  async generateVideo(
    providerId: string, 
    request: VideoGenerationRequest,
    apiKey?: string
  ): Promise<VideoGenerationResponse> {
    const provider = getProviderById(providerId)
    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerId} not found`,
        provider: providerId
      }
    }

    try {
      switch (providerId) {
        case 'veo-3':
          return await this.generateWithVeo3API(request, apiKey)
        case 'runwayml':
          return await this.generateWithRunwayML(provider, request, apiKey)
        case 'luma':
          return await this.generateWithLuma(provider, request, apiKey)
        // case 'pika': // Temporarily disabled - awaiting API access approval
        case 'openai-sora':
          return await this.generateWithOpenAISora(provider, request, apiKey)
        default:
          return {
            success: false,
            error: `Provider ${providerId} not implemented`,
            provider: providerId
          }
      }
    } catch (error) {
      console.error(`Error generating video with ${providerId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: providerId
      }
    }
  }


  private async generateWithVeo3API(
    request: VideoGenerationRequest,
    apiKey?: string
  ): Promise<VideoGenerationResponse> {
    if (!apiKey) {
      throw new Error('VEO3 API key required')
    }

    // Step 1: Start generation
    const requestBody = {
      model: request.veo3Model || 'veo3-fast',
      prompt: request.prompt,
      audio: request.veo3Audio !== false, // Default to true if not specified
      options: {
        resolution: request.veo3Resolution || '720p',
        ...(request.negativePrompt && { negativePrompt: request.negativePrompt }),
        ...(request.conditioningImage && { 
          image: `data:${request.conditioningImage.mimeType};base64,${request.conditioningImage.imageBytes}` 
        })
      }
    }

    const generateResponse = await fetch('https://api.veo3gen.app/api/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      let errorMessage = `VEO3 API error: ${generateResponse.status}`
      
      if (generateResponse.status === 401) {
        errorMessage = 'Authentication failed. Please check your VEO3 API key.'
      } else if (generateResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (generateResponse.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const generateData = await generateResponse.json()
    
    if (!generateData.taskId) {
      throw new Error('No task ID returned from VEO3 API')
    }

    const taskId = generateData.taskId
    console.log(`VEO3 generation started with task ID: ${taskId}`)

    // Step 2: Poll for completion
    const maxWaitTime = 300000 // 5 minutes
    const startTime = Date.now()
    const pollInterval = 10000 // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      const statusResponse = await fetch(`https://api.veo3gen.app/api/status/${taskId}`, {
        headers: { 
          'Authorization': `Bearer ${apiKey}` 
        }
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        throw new Error(`Status check failed: ${errorText}`)
      }

      const statusData = await statusResponse.json()
      console.log(`VEO3 status: ${statusData.status}`)

      if (statusData.status === 'completed') {
        if (!statusData.result?.videoUrl) {
          throw new Error('No video URL returned from VEO3 API')
        }

        const cost = statusData.credits?.charged || 0

        return {
          success: true,
          videos: [statusData.result.videoUrl],
          provider: 'veo-3',
          cost
        }
      }
      
      if (statusData.status === 'failed') {
        const errorMessage = statusData.error?.message || 'Generation failed'
        throw new Error(`VEO3 generation failed: ${errorMessage}`)
      }

      if (statusData.status === 'timeout') {
        throw new Error('VEO3 generation timed out')
      }
    }

    throw new Error('VEO3 generation timed out after 5 minutes')
  }


  private async generateWithRunwayML(
    provider: VideoProvider, 
    request: VideoGenerationRequest,
    apiKey?: string
  ): Promise<VideoGenerationResponse> {
    if (!apiKey) {
      throw new Error('RunwayML API key required')
    }

    // RunwayML Gen-4 with enhanced features
    const requestBody: any = {
      prompt: request.prompt,
      duration: request.durationSeconds,
      aspect_ratio: request.aspectRatio,
      model: 'gen4', // RunwayML's Gen-4 model
      style_consistency: true, // Gen-4 feature
      camera_controls: true, // Gen-4 feature
      keyframe_controls: true, // Gen-4 feature
      ...(request.negativePrompt && { negative_prompt: request.negativePrompt }),
      ...(request.conditioningImage && {
        image: `data:${request.conditioningImage.mimeType};base64,${request.conditioningImage.imageBytes}`
      })
    }

    const response = await fetch('https://api.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `RunwayML API error: ${response.status}`
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your RunwayML API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (response.status === 402) {
        errorMessage = 'Insufficient credits. Please add credits to your RunwayML account.'
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.video_url && !data.video) {
      throw new Error('No video URL returned from RunwayML API')
    }

    const videoUrl = data.video_url || data.video
    const cost = provider.pricing.costPerSecond * request.durationSeconds * request.numberOfVideos

    return {
      success: true,
      videos: [videoUrl],
      provider: provider.id,
      cost
    }
  }

  private async generateWithLuma(
    provider: VideoProvider, 
    request: VideoGenerationRequest,
    apiKey?: string
  ): Promise<VideoGenerationResponse> {
    if (!apiKey) {
      throw new Error('Luma AI API key required')
    }

    const requestBody: any = {
      prompt: request.prompt,
      duration: request.durationSeconds,
      aspect_ratio: request.aspectRatio,
      model: 'dream_machine_v1', // Luma's Dream Machine model
      ...(request.negativePrompt && { negative_prompt: request.negativePrompt }),
      ...(request.conditioningImage && {
        image: `data:${request.conditioningImage.mimeType};base64,${request.conditioningImage.imageBytes}`
      })
    }

    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Luma AI API error: ${response.status}`
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your Luma AI API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (response.status === 402) {
        errorMessage = 'Insufficient credits. Please add credits to your Luma AI account.'
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.video_url && !data.video) {
      throw new Error('No video URL returned from Luma AI API')
    }

    const videoUrl = data.video_url || data.video
    const cost = provider.pricing.costPerSecond * request.durationSeconds * request.numberOfVideos

    return {
      success: true,
      videos: [videoUrl],
      provider: provider.id,
      cost
    }
  }



  private async generateWithOpenAISora(
    provider: VideoProvider, 
    request: VideoGenerationRequest,
    apiKey?: string
  ): Promise<VideoGenerationResponse> {
    if (!apiKey) {
      throw new Error('OpenAI API key required for Sora')
    }

    const requestBody: any = {
      model: 'sora-1.0',
      prompt: request.prompt,
      duration: request.durationSeconds,
      aspect_ratio: request.aspectRatio,
      quality: 'hd', // High definition quality
      ...(request.negativePrompt && { negative_prompt: request.negativePrompt }),
      ...(request.conditioningImage && {
        image: `data:${request.conditioningImage.mimeType};base64,${request.conditioningImage.imageBytes}`
      })
    }

    const response = await fetch('https://api.openai.com/v1/video/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `OpenAI Sora API error: ${response.status}`
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your OpenAI API key.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (response.status === 402) {
        errorMessage = 'Insufficient credits. Please add credits to your OpenAI account.'
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.video_url && !data.video) {
      throw new Error('No video URL returned from OpenAI Sora API')
    }

    const videoUrl = data.video_url || data.video
    const cost = provider.pricing.costPerSecond * request.durationSeconds * request.numberOfVideos

    return {
      success: true,
      videos: [videoUrl],
      provider: provider.id,
      cost
    }
  }
}
