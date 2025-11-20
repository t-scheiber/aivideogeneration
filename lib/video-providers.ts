export interface VideoProvider {
  id: string
  name: string
  description: string
  pricing: {
    costPerSecond: number
    currency: string
    freeTier?: {
      seconds: number
      description: string
    }
  }
  features: string[]
  maxDuration: number
  supportedAspectRatios: string[]
  apiEndpoint: string
  requiresAuth: boolean
  authType: 'api_key' | 'oauth' | 'bearer'
  capabilities: {
    supportsMultipleVideos: boolean
    supportsConditioningImage: boolean
    supportsNegativePrompt: boolean
    supportsResolution: boolean
    supportsFPS: boolean
    maxVideos: number
    supportedResolutions: string[]
    supportedFPS: number[]
    supportedDurations: number[]
  }
}

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  'veo-3': {
    id: 'veo-3',
    name: 'VEO3 API',
    description: 'Advanced video generation with enhanced capabilities, audio generation, and two speed tiers',
    pricing: {
      costPerSecond: 0.08, // Average pricing between fast and quality models
      currency: 'USD',
      freeTier: {
        seconds: 20,
        description: '20 seconds free per month'
      }
    },
    features: ['Text-to-video', 'Image-to-video', 'Audio generation', 'Enhanced prompts', 'Two speed tiers', 'Credit system'],
    maxDuration: 8, // VEO3: Always 8 seconds
    supportedAspectRatios: ['16:9'], // VEO3: landscape only
    apiEndpoint: 'https://api.veo3gen.app/api/generate',
    requiresAuth: true,
    authType: 'bearer',
    capabilities: {
      supportsMultipleVideos: false, // VEO3: single video only
      supportsConditioningImage: true,
      supportsNegativePrompt: true,
      supportsResolution: true, // VEO3: 720p and 1080p
      supportsFPS: false, // VEO3: no FPS control
      maxVideos: 1,
      supportedResolutions: ['720p', '1080p'],
      supportedFPS: [],
      supportedDurations: [8] // VEO3: Always 8 seconds
    }
  },
  'runwayml': {
    id: 'runwayml',
    name: 'RunwayML Gen-4',
    description: 'Professional video generation with Gen-4 model featuring enhanced camera controls and style consistency',
    pricing: {
      costPerSecond: 0.05,
      currency: 'USD',
      freeTier: {
        seconds: 125,
        description: '125 seconds free per month'
      }
    },
    features: ['Text-to-video', 'Image-to-video', 'Video-to-video', 'Camera controls', 'Keyframe controls', 'Style consistency'],
    maxDuration: 18,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    apiEndpoint: 'https://api.runwayml.com/v1/image_to_video',
    requiresAuth: true,
    authType: 'bearer',
    capabilities: {
      supportsMultipleVideos: true,
      supportsConditioningImage: true,
      supportsNegativePrompt: true,
      supportsResolution: true,
      supportsFPS: true,
      maxVideos: 4,
      supportedResolutions: ['720p', '1080p', '4K'],
      supportedFPS: [24, 30, 60],
      supportedDurations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    }
  },
  'luma': {
    id: 'luma',
    name: 'Luma Dream Machine',
    description: 'State-of-the-art video generation producing 120 frames in 2 minutes with character consistency and realistic physics',
    pricing: {
      costPerSecond: 0.02,
      currency: 'USD',
      freeTier: {
        seconds: 30,
        description: '30 seconds free per month'
      }
    },
    features: ['Text-to-video', 'Image-to-video', 'Character consistency', 'Realistic physics', 'Camera motion control', 'Loop creation'],
    maxDuration: 5,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    apiEndpoint: 'https://api.lumalabs.ai/dream-machine/v1/generations',
    requiresAuth: true,
    authType: 'bearer',
    capabilities: {
      supportsMultipleVideos: false,
      supportsConditioningImage: true,
      supportsNegativePrompt: true,
      supportsResolution: true,
      supportsFPS: false,
      maxVideos: 1,
      supportedResolutions: ['720p', '1080p'],
      supportedFPS: [],
      supportedDurations: [3, 4, 5]
    }
  },
  'openai-sora': {
    id: 'openai-sora',
    name: 'OpenAI Sora',
    description: 'Advanced video generation with exceptional quality and realistic physics',
    pricing: {
      costPerSecond: 0.10,
      currency: 'USD',
      freeTier: {
        seconds: 10,
        description: '10 seconds free per month'
      }
    },
    features: ['Text-to-video', 'Image-to-video', 'Exceptional quality', 'Realistic physics', 'Complex scenes', 'Long-form content'],
    maxDuration: 60,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '21:9'],
    apiEndpoint: 'https://api.openai.com/v1/video/generations',
    requiresAuth: true,
    authType: 'bearer',
    capabilities: {
      supportsMultipleVideos: true,
      supportsConditioningImage: true,
      supportsNegativePrompt: true,
      supportsResolution: true,
      supportsFPS: true,
      maxVideos: 4,
      supportedResolutions: ['720p', '1080p', '4K'],
      supportedFPS: [24, 30, 60],
      supportedDurations: [5, 10, 15, 20, 30, 45, 60]
    }
  }
}

export function getProviderById(id: string): VideoProvider | undefined {
  return VIDEO_PROVIDERS[id]
}

export function getAllProviders(): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS)
}

export function getProvidersByBudget(maxCostPerSecond: number): VideoProvider[] {
  return getAllProviders().filter(provider => provider.pricing.costPerSecond <= maxCostPerSecond)
}

export function calculateCost(provider: VideoProvider, durationSeconds: number): number {
  return provider.pricing.costPerSecond * durationSeconds
}
