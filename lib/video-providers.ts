// Provider and model catalog. Model limits come from each provider's API
// reference (checked November 2026). The server validates every request
// against this file, and the UI only renders the options listed here.

export type CostUnit = 'USD' | 'credits'

export interface CostEstimate {
  amount: number
  unit: CostUnit
}

export interface CostOptions {
  durationSeconds: number
  resolution: string
  audio: boolean
}

export interface VideoModel {
  /** Model ID sent to the provider API */
  id: string
  name: string
  description: string
  durations: number[]
  aspectRatios: string[]
  resolutions: string[]
  supportsAudio: boolean
  supportsImage: boolean
  supportsNegativePrompt: boolean
  /** Durations that cannot be combined with a start image */
  textOnlyDurations?: number[]
  /** Short label for the price shown in the model picker */
  priceLabel: string
  estimateCost: (options: CostOptions) => CostEstimate
}

export interface VideoProvider {
  id: string
  name: string
  description: string
  /** Environment variables checked in order for the API key */
  apiKeyEnv: string[]
  docsUrl: string
  /** Most requests one generation run may send in parallel */
  maxVideos: number
  models: VideoModel[]
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

const usdPerSecond =
  (base: number, withAudio = base) =>
  ({ durationSeconds, audio }: CostOptions): CostEstimate => ({
    amount: (audio ? withAudio : base) * durationSeconds,
    unit: 'USD',
  })

// veo3gen.app (Imaginary) bills credits per clip. Table from imaginary.app/docs.
const VEO3GEN_CREDITS: Record<string, Record<string, [number, number]>> = {
  'veo3-lite': { '720p': [2, 3], '1080p': [3, 5] },
  'veo3-fast': { '720p': [6, 10], '1080p': [6, 10], '4k': [19, 22] },
  'veo3-quality': { '720p': [13, 26], '1080p': [13, 26], '4k': [26, 38] },
}

const veo3genCost =
  (model: string) =>
  ({ resolution, audio }: CostOptions): CostEstimate => {
    const [silent, withAudio] = VEO3GEN_CREDITS[model]?.[resolution] ?? [0, 0]
    return { amount: audio ? withAudio : silent, unit: 'credits' }
  }

// Luma Agents API bills credits per clip. Table from docs.agents.lumalabs.ai/guides/pricing.
const LUMA_RAY_CREDITS: Record<string, Record<number, number>> = {
  '360p': { 5: 20, 10: 60 },
  '540p': { 5: 50, 10: 150 },
  '720p': { 5: 100, 10: 300 },
  '1080p': { 5: 400, 10: 1200 },
}

const veo3genModel = (
  id: string,
  name: string,
  description: string,
  resolutions: string[],
  priceLabel: string
): VideoModel => ({
  id,
  name,
  description,
  durations: [8],
  aspectRatios: ['16:9', '9:16'],
  resolutions,
  supportsAudio: true,
  supportsImage: true,
  supportsNegativePrompt: true,
  priceLabel,
  estimateCost: veo3genCost(id),
})

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  'veo-3': {
    id: 'veo-3',
    name: 'Google Veo 3.1 (veo3gen)',
    description: 'Veo 3.1 through veo3gen.app with native audio, portrait output and 4K on Fast and Quality.',
    apiKeyEnv: ['VEO3_API_KEY'],
    docsUrl: 'https://www.imaginary.app/docs',
    maxVideos: 4,
    models: [
      veo3genModel(
        'veo3-fast',
        'Veo 3.1 Fast',
        'Good default. Quick turnaround, 4K available.',
        ['720p', '1080p', '4k'],
        '6–22 credits/clip'
      ),
      veo3genModel(
        'veo3-quality',
        'Veo 3.1 Quality',
        'Highest fidelity Veo output. Slower and pricier.',
        ['720p', '1080p', '4k'],
        '13–38 credits/clip'
      ),
      veo3genModel(
        'veo3-lite',
        'Veo 3.1 Lite',
        'Cheapest Veo tier for drafts. Up to 1080p.',
        ['720p', '1080p'],
        '2–5 credits/clip'
      ),
    ],
  },
  runwayml: {
    id: 'runwayml',
    name: 'Runway API',
    description: 'Runway Gen-4.5 plus partner models (Veo, Kling, Seedance, Wan) on one Runway key.',
    apiKeyEnv: ['RUNWAYML_API_SECRET', 'RUNWAYML_API_KEY'],
    docsUrl: 'https://docs.dev.runwayml.com/guides/models/',
    maxVideos: 4,
    models: [
      {
        id: 'gen4.5',
        name: 'Gen-4.5',
        description: "Runway's own flagship model. Strong motion and prompt adherence.",
        durations: range(2, 10),
        aspectRatios: ['16:9', '9:16'],
        resolutions: ['720p'],
        supportsAudio: false,
        supportsImage: true,
        supportsNegativePrompt: false,
        priceLabel: '$0.12/s',
        estimateCost: usdPerSecond(0.12),
      },
      {
        id: 'veo3.1',
        name: 'Veo 3.1',
        description: 'Google Veo 3.1 billed through Runway credits.',
        durations: [4, 6, 8],
        aspectRatios: ['16:9', '9:16'],
        resolutions: ['720p', '1080p'],
        supportsAudio: true,
        supportsImage: true,
        supportsNegativePrompt: true,
        priceLabel: 'from $0.20/s',
        estimateCost: usdPerSecond(0.2, 0.4),
      },
      {
        id: 'veo3.1_fast',
        name: 'Veo 3.1 Fast',
        description: 'Faster, cheaper Veo 3.1 variant.',
        durations: [4, 6, 8],
        aspectRatios: ['16:9', '9:16'],
        resolutions: ['720p', '1080p'],
        supportsAudio: true,
        supportsImage: true,
        supportsNegativePrompt: true,
        priceLabel: 'from $0.10/s',
        estimateCost: usdPerSecond(0.1, 0.15),
      },
      {
        id: 'kling_4',
        name: 'Kling 4',
        description: 'Long clips up to 30 seconds at 720p or 1080p.',
        durations: range(3, 30),
        aspectRatios: ['16:9', '9:16', '1:1'],
        resolutions: ['720p', '1080p'],
        supportsAudio: false,
        supportsImage: true,
        supportsNegativePrompt: false,
        priceLabel: 'from $0.157/s',
        estimateCost: usdPerSecond(0.157),
      },
      {
        id: 'seedance2_5',
        name: 'Seedance 2.5',
        description: 'ByteDance Seedance 2.5 with audio, up to 30 seconds.',
        durations: [5, 10, 15, 20, 25, 30],
        aspectRatios: ['16:9', '9:16', '1:1'],
        resolutions: ['720p', '1080p'],
        supportsAudio: true,
        supportsImage: true,
        supportsNegativePrompt: false,
        priceLabel: 'from $0.20/s',
        estimateCost: usdPerSecond(0.2),
      },
      {
        id: 'wan3',
        name: 'Wan 3',
        description: 'Budget option with audio, 2–30 seconds.',
        durations: range(2, 30),
        aspectRatios: ['16:9', '9:16', '1:1'],
        resolutions: ['720p', '1080p'],
        supportsAudio: true,
        supportsImage: true,
        supportsNegativePrompt: false,
        priceLabel: 'from $0.05/s',
        estimateCost: usdPerSecond(0.05),
      },
    ],
  },
  luma: {
    id: 'luma',
    name: 'Luma Ray 3.2',
    description: 'Luma Ray 3.2 through the Luma Agents API. Wide aspect ratio support.',
    apiKeyEnv: ['LUMA_AGENTS_API_KEY', 'LUMA_API_KEY'],
    docsUrl: 'https://docs.agents.lumalabs.ai/guides/videos/generation',
    maxVideos: 4,
    models: [
      {
        id: 'ray-3.2',
        name: 'Ray 3.2',
        description: '5s or 10s clips. 10s clips cannot start from an image.',
        durations: [5, 10],
        textOnlyDurations: [10],
        aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        resolutions: ['720p', '1080p', '540p', '360p'],
        supportsAudio: false,
        supportsImage: true,
        supportsNegativePrompt: false,
        priceLabel: '20–1200 credits/clip',
        estimateCost: ({ resolution, durationSeconds }) => ({
          amount: LUMA_RAY_CREDITS[resolution]?.[durationSeconds] ?? 0,
          unit: 'credits',
        }),
      },
    ],
  },
}

export function getProviderById(id: string): VideoProvider | undefined {
  return VIDEO_PROVIDERS[id]
}

export function getAllProviders(): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS)
}

export function getModel(provider: VideoProvider, modelId: string): VideoModel | undefined {
  return provider.models.find((model) => model.id === modelId)
}

export function formatCost({ amount, unit }: CostEstimate): string {
  if (unit === 'credits') {
    return `${Math.round(amount)} credits`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}
