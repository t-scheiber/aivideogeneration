import { VideoModel, VideoProvider, getModel, getProviderById } from './video-providers'

export interface ConditioningImage {
  mimeType: string
  /** Base64 without a data: prefix */
  imageBytes: string
}

export interface VideoGenerationRequest {
  providerId: string
  modelId: string
  prompt: string
  negativePrompt?: string
  durationSeconds: number
  aspectRatio: string
  resolution: string
  audio: boolean
  numberOfVideos: number
  conditioningImage?: ConditioningImage
}

export interface VideoGenerationResponse {
  success: boolean
  videos?: string[]
  error?: string
  provider: string
  model?: string
  /** Cost the provider reported, when it reports one */
  cost?: { amount: number; unit: 'USD' | 'credits' }
}

const POLL_INTERVAL_MS = 10_000
const MAX_WAIT_MS = 10 * 60_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Checks a request against the model catalog. Returns an error message or null. */
export function validateRequest(request: VideoGenerationRequest): string | null {
  const provider = getProviderById(request.providerId)
  if (!provider) return `Unknown provider "${request.providerId}"`

  const model = getModel(provider, request.modelId)
  if (!model) return `Unknown model "${request.modelId}" for ${provider.name}`

  if (!request.prompt.trim()) return 'Prompt is required'
  if (!model.durations.includes(request.durationSeconds)) {
    return `${model.name} supports durations ${model.durations.join(', ')}s`
  }
  if (!model.aspectRatios.includes(request.aspectRatio)) {
    return `${model.name} supports aspect ratios ${model.aspectRatios.join(', ')}`
  }
  if (!model.resolutions.includes(request.resolution)) {
    return `${model.name} supports resolutions ${model.resolutions.join(', ')}`
  }
  if (request.conditioningImage && !model.supportsImage) {
    return `${model.name} does not accept a reference image`
  }
  if (request.conditioningImage && model.textOnlyDurations?.includes(request.durationSeconds)) {
    return `${model.name} cannot use a reference image with ${request.durationSeconds}s clips`
  }
  if (
    !Number.isInteger(request.numberOfVideos) ||
    request.numberOfVideos < 1 ||
    request.numberOfVideos > provider.maxVideos
  ) {
    return `Number of videos must be between 1 and ${provider.maxVideos}`
  }
  return null
}

export function getApiKey(provider: VideoProvider): string | undefined {
  for (const name of provider.apiKeyEnv) {
    const value = process.env[name]
    if (value) return value
  }
  return undefined
}

async function readError(response: Response, label: string): Promise<Error> {
  const body = await response.text().catch(() => '')
  const hints: Record<number, string> = {
    401: `Authentication failed. Check your ${label} API key.`,
    402: `Not enough ${label} credits.`,
    429: `${label} rate limit reached. Try again later.`,
  }
  const hint = hints[response.status] ?? `${label} API error ${response.status}`
  return new Error(body ? `${hint} ${body.slice(0, 500)}` : hint)
}

/** One generation. Returns the video URL and the cost the provider reported, if any. */
type SingleRun = (
  model: VideoModel,
  request: VideoGenerationRequest,
  apiKey: string
) => Promise<{ url: string; cost?: number }>

// veo3gen.app (Imaginary). Docs: https://www.imaginary.app/docs
const runVeo3gen: SingleRun = async (model, request, apiKey) => {
  const body = {
    model: model.id,
    modelVersion: '3.1',
    prompt: request.prompt,
    audio: request.audio,
    ...(request.conditioningImage && {
      image: {
        bytesBase64Encoded: request.conditioningImage.imageBytes,
        mimeType: request.conditioningImage.mimeType,
      },
    }),
    options: {
      resolution: request.resolution,
      aspectRatio: request.aspectRatio,
      ...(request.negativePrompt && { negativePrompt: request.negativePrompt }),
    },
  }

  const start = await fetch('https://api.veo3gen.app/api/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!start.ok) throw await readError(start, 'veo3gen')

  const { taskId } = await start.json()
  if (!taskId) throw new Error('veo3gen did not return a task ID')

  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const status = await fetch(`https://api.veo3gen.app/api/status/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!status.ok) throw await readError(status, 'veo3gen')

    const data = await status.json()
    if (data.status === 'completed') {
      if (!data.result?.videoUrl) throw new Error('veo3gen finished without a video URL')
      return { url: data.result.videoUrl, cost: data.credits?.charged }
    }
    if (data.status === 'failed' || data.status === 'timeout') {
      throw new Error(`veo3gen generation ${data.status}: ${data.error?.message ?? 'no details'}`)
    }
  }
  throw new Error('veo3gen generation did not finish within 10 minutes')
}

// Runway API. Docs: https://docs.dev.runwayml.com/api/
const RUNWAY_BASE = 'https://api.dev.runwayml.com'
const RUNWAY_VERSION = '2024-11-06'

function runwayRatio(modelId: string, aspectRatio: string, resolution: string, withImage: boolean) {
  // Kling 4 image-to-video only accepts "follow the image" sizes
  if (modelId === 'kling_4' && withImage) return `auto_${resolution}`

  const square720 = modelId === 'kling_4' ? '940:940' : '960:960'
  const sizes: Record<string, Record<string, string>> = {
    '720p': { '16:9': '1280:720', '9:16': '720:1280', '1:1': square720 },
    '1080p': { '16:9': '1920:1080', '9:16': '1080:1920', '1:1': '1440:1440' },
  }
  const ratio = sizes[resolution]?.[aspectRatio]
  if (!ratio) throw new Error(`No Runway size for ${aspectRatio} at ${resolution}`)
  return ratio
}

const runRunway: SingleRun = async (model, request, apiKey) => {
  const withImage = Boolean(request.conditioningImage)
  const body: Record<string, unknown> = {
    model: model.id,
    promptText: request.prompt,
    ratio: runwayRatio(model.id, request.aspectRatio, request.resolution, withImage),
    duration: request.durationSeconds,
  }
  if (model.supportsAudio) body.audio = request.audio
  if (model.supportsNegativePrompt && request.negativePrompt) {
    body.negativePrompt = request.negativePrompt
  }
  if (request.conditioningImage) {
    body.promptImage = `data:${request.conditioningImage.mimeType};base64,${request.conditioningImage.imageBytes}`
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_VERSION,
  }
  const endpoint = withImage ? 'image_to_video' : 'text_to_video'
  const start = await fetch(`${RUNWAY_BASE}/v1/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!start.ok) throw await readError(start, 'Runway')

  const { id } = await start.json()
  if (!id) throw new Error('Runway did not return a task ID')

  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const status = await fetch(`${RUNWAY_BASE}/v1/tasks/${id}`, { headers })
    if (!status.ok) throw await readError(status, 'Runway')

    const task = await status.json()
    if (task.status === 'SUCCEEDED') {
      const url = task.output?.[0]
      if (!url) throw new Error('Runway finished without an output URL')
      // Runway credits cost $0.01 each
      const credits = task.cost?.credits
      return { url, cost: typeof credits === 'number' ? credits / 100 : undefined }
    }
    if (task.status === 'FAILED' || task.status === 'CANCELLED') {
      throw new Error(`Runway task ${task.status.toLowerCase()}: ${task.failure ?? 'no details'}`)
    }
  }
  throw new Error('Runway task did not finish within 10 minutes')
}

// Luma Agents API. Docs: https://docs.agents.lumalabs.ai/guides/videos/generation
const LUMA_BASE = 'https://agents.lumalabs.ai/v1'

const runLuma: SingleRun = async (model, request, apiKey) => {
  const body = {
    model: model.id,
    type: 'video',
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio,
    video: {
      resolution: request.resolution,
      duration: `${request.durationSeconds}s`,
      ...(request.conditioningImage && {
        start_frame: {
          data: request.conditioningImage.imageBytes,
          media_type: request.conditioningImage.mimeType,
        },
      }),
    },
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const start = await fetch(`${LUMA_BASE}/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!start.ok) throw await readError(start, 'Luma')

  const { id } = await start.json()
  if (!id) throw new Error('Luma did not return a generation ID')

  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const status = await fetch(`${LUMA_BASE}/generations/${id}`, { headers })
    if (!status.ok) throw await readError(status, 'Luma')

    const generation = await status.json()
    if (generation.state === 'completed') {
      const url = generation.output?.find((item: { type?: string }) => item.type === 'video')?.url
        ?? generation.output?.[0]?.url
      if (!url) throw new Error('Luma finished without a video URL')
      const credits = generation.usage?.credits_charged
      return { url, cost: typeof credits === 'number' ? credits : undefined }
    }
    if (generation.state === 'failed') {
      throw new Error(`Luma generation failed: ${generation.failure_reason ?? 'no details'}`)
    }
  }
  throw new Error('Luma generation did not finish within 10 minutes')
}

const RUNNERS: Record<string, SingleRun> = {
  'veo-3': runVeo3gen,
  runwayml: runRunway,
  luma: runLuma,
}

export async function generateVideos(
  request: VideoGenerationRequest,
  apiKey: string
): Promise<VideoGenerationResponse> {
  const provider = getProviderById(request.providerId)
  const model = provider && getModel(provider, request.modelId)
  const run = RUNNERS[request.providerId]
  if (!provider || !model || !run) {
    return { success: false, error: 'Unsupported provider or model', provider: request.providerId }
  }

  const results = await Promise.allSettled(
    Array.from({ length: request.numberOfVideos }, () => run(model, request, apiKey))
  )
  const succeeded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const failures = results.flatMap((r) =>
    r.status === 'rejected' ? [r.reason instanceof Error ? r.reason.message : String(r.reason)] : []
  )
  failures.forEach((message) => console.error(`[${provider.id}/${model.id}] ${message}`))

  if (succeeded.length === 0) {
    return { success: false, error: failures[0] ?? 'Generation failed', provider: provider.id, model: model.id }
  }

  const reported = succeeded.map((r) => r.cost).filter((c): c is number => typeof c === 'number')
  const unit = model.estimateCost({ durationSeconds: 1, resolution: request.resolution, audio: false }).unit
  return {
    success: true,
    videos: succeeded.map((r) => r.url),
    provider: provider.id,
    model: model.id,
    cost: reported.length ? { amount: reported.reduce((a, b) => a + b, 0), unit } : undefined,
    ...(failures.length > 0 && {
      error: `${failures.length} of ${request.numberOfVideos} variations failed: ${failures[0]}`,
    }),
  }
}
