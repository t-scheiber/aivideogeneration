'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSession, signIn } from '@/lib/auth-client'
import {
  CostEstimate,
  VideoModel,
  VideoProvider,
  formatCost,
  getAllProviders,
} from '@/lib/video-providers'

interface GenerationMeta {
  provider: string
  model: string
  cost?: CostEstimate
  startedAt?: number
  completedAt?: number
  error?: string
}

const selectClass =
  'w-full appearance-none rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60'

const Chevron = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
)

const keepOrFirst = <T,>(allowed: T[], current: T): T =>
  allowed.includes(current) ? current : allowed[0]

export default function VideoGenerator() {
  const { data: session, isPending } = useSession()
  const providers = useMemo(() => getAllProviders(), [])
  const [providerId, setProviderId] = useState(() => providers[0]?.id ?? 'veo-3')
  const [modelId, setModelId] = useState(() => providers[0]?.models[0]?.id ?? '')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [numberOfVideos, setNumberOfVideos] = useState(1)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [durationSeconds, setDurationSeconds] = useState(8)
  const [resolution, setResolution] = useState('720p')
  const [audio, setAudio] = useState(true)
  const [conditioningImage, setConditioningImage] = useState<File | null>(null)
  const [configured, setConfigured] = useState<Record<string, boolean> | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [videos, setVideos] = useState<string[]>([])
  const [generationMeta, setGenerationMeta] = useState<GenerationMeta | null>(null)
  const [copiedVideoUrl, setCopiedVideoUrl] = useState<string | null>(null)

  const selectedProvider = useMemo<VideoProvider | undefined>(
    () => providers.find((p) => p.id === providerId),
    [providers, providerId]
  )
  const selectedModel = useMemo<VideoModel | undefined>(
    () => selectedProvider?.models.find((m) => m.id === modelId) ?? selectedProvider?.models[0],
    [selectedProvider, modelId]
  )

  useEffect(() => {
    if (!session) return
    fetch('/api/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConfigured(data?.configured ?? null))
      .catch(() => setConfigured(null))
  }, [session])

  const handleProviderChange = (id: string) => {
    const next = providers.find((p) => p.id === id)
    setProviderId(id)
    setModelId(next?.models[0]?.id ?? '')
  }

  // Keep every option valid for the selected model
  useEffect(() => {
    if (!selectedModel || !selectedProvider) return
    setAspectRatio((prev) => keepOrFirst(selectedModel.aspectRatios, prev))
    setResolution((prev) => keepOrFirst(selectedModel.resolutions, prev))
    setDurationSeconds((prev) => keepOrFirst(selectedModel.durations, prev))
    setNumberOfVideos((prev) => Math.min(Math.max(1, prev), selectedProvider.maxVideos))
    if (!selectedModel.supportsImage) setConditioningImage(null)
    if (!selectedModel.supportsNegativePrompt) setNegativePrompt('')
  }, [selectedModel, selectedProvider])

  const imageBlockedByDuration = Boolean(
    conditioningImage && selectedModel?.textOnlyDurations?.includes(durationSeconds)
  )

  const estimatedCost = useMemo<CostEstimate | null>(() => {
    if (!selectedModel) return null
    const perVideo = selectedModel.estimateCost({
      durationSeconds,
      resolution,
      audio: selectedModel.supportsAudio && audio,
    })
    return { ...perVideo, amount: perVideo.amount * Math.max(1, numberOfVideos) }
  }, [selectedModel, durationSeconds, resolution, audio, numberOfVideos])

  const providerConfigured = configured ? configured[providerId] !== false : true

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setConditioningImage(file)
    }
  }

  const promptInsights = useMemo(() => {
    const trimmed = prompt.trim()
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0

    if (words === 0) {
      return {
        words,
        quality: 'Add a descriptive prompt',
        helper: 'Describe the subject, setting, and motion you expect.',
        badgeClass: 'bg-red-900/30 text-red-300 border border-red-600/30',
        score: 0,
      }
    }

    if (words < 12) {
      return {
        words,
        quality: 'Needs more detail',
        helper: 'Aim for at least 12 words so providers have enough context.',
        badgeClass: 'bg-yellow-900/30 text-yellow-300 border border-yellow-600/30',
        score: 1,
      }
    }

    if (words < 30) {
      return {
        words,
        quality: 'Great start',
        helper: 'Add camera cues or mood to push it even further.',
        badgeClass: 'bg-blue-900/30 text-blue-200 border border-blue-600/30',
        score: 2,
      }
    }

    return {
      words,
      quality: 'Production ready',
      helper: 'Plenty of detail. You can generate with confidence.',
      badgeClass: 'bg-green-900/30 text-green-200 border border-green-600/30',
      score: 3,
    }
  }, [prompt])

  const readinessChecklist = useMemo(
    () => [
      {
        label: 'Prompt clarity',
        ready: promptInsights.score >= 2,
        helper:
          promptInsights.score >= 2
            ? 'Strong descriptive prompt'
            : 'Add more context (12+ words) for cinematic results',
      },
      {
        label: 'Provider key',
        ready: providerConfigured,
        helper: providerConfigured
          ? `${selectedProvider?.name ?? 'Provider'} is ready`
          : `Set ${selectedProvider?.apiKeyEnv[0]} on the server`,
      },
      {
        label: 'Model limits',
        ready: Boolean(selectedModel) && !imageBlockedByDuration,
        helper: imageBlockedByDuration
          ? `${durationSeconds}s clips cannot start from an image`
          : selectedModel
          ? `${selectedModel.durations[0]}–${selectedModel.durations[selectedModel.durations.length - 1]}s • ${selectedModel.aspectRatios.join(', ')}`
          : 'Choose a model',
      },
      {
        label: 'Reference image',
        ready: !selectedModel?.supportsImage || Boolean(conditioningImage),
        helper: selectedModel?.supportsImage
          ? conditioningImage
            ? `${conditioningImage.name} attached`
            : 'Optional but helps with consistency'
          : 'Not available for this model',
      },
    ],
    [
      promptInsights.score,
      providerConfigured,
      selectedProvider,
      selectedModel,
      imageBlockedByDuration,
      durationSeconds,
      conditioningImage,
    ]
  )

  const modelFeatures = useMemo(() => {
    if (!selectedModel) return []
    const top = selectedModel.resolutions.includes('4k')
      ? '4K'
      : selectedModel.resolutions.includes('1080p')
      ? '1080p'
      : selectedModel.resolutions[0]
    return [
      selectedModel.supportsImage ? 'Image-to-video' : null,
      selectedModel.supportsAudio ? 'Native audio' : null,
      selectedModel.supportsNegativePrompt ? 'Negative prompt' : null,
      `Up to ${selectedModel.durations[selectedModel.durations.length - 1]}s`,
      `Up to ${top}`,
    ].filter((f): f is string => Boolean(f))
  }, [selectedModel])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center space-y-6 bg-gray-900/40 border border-gray-700/60 rounded-2xl p-10 backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Sign in to generate videos</h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            We just migrated to Better Auth for more reliable sessions. Please continue with Google
            to unlock the studio.
          </p>
        </div>
        <ul className="text-sm text-gray-300 space-y-2 text-left max-w-xl mx-auto">
          <li>• Secure Google OAuth powered by Better Auth</li>
          <li>• Access to all providers with adaptive UI</li>
          <li>• Project-safe storage in your local browser</li>
        </ul>
        <button
          type="button"
          onClick={() => signIn.social({ provider: 'google', callbackURL: '/' })}
          className="bg-white text-gray-900 font-semibold py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/70 shadow-lg"
        >
          Continue with Google
        </button>
      </div>
    )
  }

  const handleCopyVideoUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedVideoUrl(url)
      setTimeout(() => setCopiedVideoUrl(null), 2000)
    } catch (error) {
      console.error('Failed to copy video URL:', error)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setMessage('Please enter a prompt before generating.')
      return
    }
    if (!selectedModel) {
      setMessage('Please choose a model.')
      return
    }

    setIsGenerating(true)
    setMessage(`Generating with ${selectedModel.name}. This can take a few minutes...`)
    setVideos([])

    const startedAt = Date.now()
    setGenerationMeta({ provider: providerId, model: selectedModel.id, startedAt })

    try {
      const formData = new FormData()
      formData.append('provider', providerId)
      formData.append('model', selectedModel.id)
      formData.append('prompt', prompt)
      formData.append('negativePrompt', negativePrompt)
      formData.append('numberOfVideos', numberOfVideos.toString())
      formData.append('aspectRatio', aspectRatio)
      formData.append('durationSeconds', durationSeconds.toString())
      formData.append('resolution', resolution)
      formData.append('audio', String(selectedModel.supportsAudio && audio))
      if (conditioningImage) {
        formData.append('conditioningImage', conditioningImage)
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || `Request failed with status ${response.status}`)
      }

      setVideos(result.videos || [])
      setGenerationMeta({
        provider: result.provider || providerId,
        model: result.model || selectedModel.id,
        cost: result.cost,
        startedAt,
        completedAt: Date.now(),
      })
      const costNote = result.cost ? ` • ${formatCost(result.cost)}` : ''
      setMessage(
        result.warning
          ? `Video generated successfully${costNote}. ${result.warning}`
          : `Video generated successfully${costNote}`
      )
    } catch (error) {
      console.error('Error generating video:', error)
      const reason = error instanceof Error ? error.message : 'Unknown error'
      setGenerationMeta({
        provider: providerId,
        model: selectedModel.id,
        startedAt,
        completedAt: Date.now(),
        error: reason,
      })
      setMessage(`Failed to generate video: ${reason}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const lastGenerationDuration =
    generationMeta?.startedAt && generationMeta?.completedAt
      ? Math.max(1, Math.round((generationMeta.completedAt - generationMeta.startedAt) / 1000))
      : null

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[3fr,2fr]">
        <section className="space-y-8">
          <div className="space-y-4 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-semibold text-gray-200" htmlFor="video-prompt">
                Video Prompt
              </label>
              <span className={`text-xs px-3 py-1 rounded-full ${promptInsights.badgeClass}`}>
                {promptInsights.quality}
              </span>
            </div>
            <textarea
              id="video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4 text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              placeholder="Describe the shot, subject, mood, and motion. Example: “A sweeping dolly shot through a neon-drenched market in Tokyo during a rainy night...”"
              aria-label="Video generation prompt"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-400">
              <span>{promptInsights.helper}</span>
              <span>{promptInsights.words} words</span>
            </div>
          </div>

          {selectedModel?.supportsNegativePrompt && (
            <div className="space-y-3 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
              <label htmlFor="negative-prompt-input" className="text-sm font-semibold text-gray-200">
                Negative Prompt <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="negative-prompt-input"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4 text-white placeholder-gray-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                placeholder="What you want to avoid: text overlays, flicker, blurry shots..."
                aria-label="Video generation negative prompt"
              />
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="provider-selection" className="text-sm font-semibold text-gray-200">
                  Provider
                </label>
                <div className="relative">
                  <select
                    id="provider-selection"
                    value={providerId}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className={selectClass}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                        {p.name}
                        {configured && configured[p.id] === false ? ' (no API key)' : ''}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="model-selection" className="text-sm font-semibold text-gray-200">
                  Model
                </label>
                <div className="relative">
                  <select
                    id="model-selection"
                    value={selectedModel?.id ?? ''}
                    onChange={(e) => setModelId(e.target.value)}
                    className={selectClass}
                  >
                    {selectedProvider?.models.map((m) => (
                      <option key={m.id} value={m.id} className="bg-gray-900 text-white">
                        {m.name} ({m.priceLabel})
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>
            </div>

            {selectedProvider && selectedModel && (
              <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-900/60 p-4 text-sm text-gray-300">
                <p className="text-xs text-gray-400">
                  {selectedProvider.description} {selectedModel.description}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span>Est. cost: {estimatedCost ? formatCost(estimatedCost) : '—'}</span>
                  <a
                    href={selectedProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 underline-offset-2 hover:underline"
                  >
                    Provider docs
                  </a>
                </div>
                {!providerConfigured && (
                  <p className="rounded-lg border border-yellow-600/40 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                    No API key for {selectedProvider.name} on this server. Set{' '}
                    <code>{selectedProvider.apiKeyEnv[0]}</code> to enable it.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {modelFeatures.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-gray-700/60 bg-gray-800/60 px-3 py-1 text-xs text-gray-200"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Creative controls</h3>
              <p className="text-xs text-gray-400">
                We only render controls the selected model supports.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="aspect-ratio" className="text-sm font-semibold text-gray-200">
                  Aspect Ratio
                </label>
                <div className="relative">
                  <select
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className={selectClass}
                  >
                    {selectedModel?.aspectRatios.map((ratio) => (
                      <option key={ratio} value={ratio} className="bg-gray-900 text-white">
                        {ratio}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="duration-seconds" className="text-sm font-semibold text-gray-200">
                  Duration
                </label>
                <div className="relative">
                  <select
                    id="duration-seconds"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className={selectClass}
                  >
                    {selectedModel?.durations.map((duration) => (
                      <option key={duration} value={duration} className="bg-gray-900 text-white">
                        {duration}s
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
                {imageBlockedByDuration && (
                  <p className="text-xs text-yellow-300">
                    {selectedModel?.name} cannot start a {durationSeconds}s clip from an image. Pick a
                    shorter duration or remove the image.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label htmlFor="resolution" className="text-sm font-semibold text-gray-200">
                  Resolution
                </label>
                <div className="relative">
                  <select
                    id="resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className={selectClass}
                  >
                    {selectedModel?.resolutions.map((res) => (
                      <option key={res} value={res} className="bg-gray-900 text-white">
                        {res === '4k' ? '4K' : res}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="number-of-videos" className="text-sm font-semibold text-gray-200">
                  Variations
                </label>
                <div className="relative">
                  <select
                    id="number-of-videos"
                    value={numberOfVideos}
                    onChange={(e) => setNumberOfVideos(Number(e.target.value))}
                    className={selectClass}
                  >
                    {Array.from({ length: selectedProvider?.maxVideos ?? 1 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="bg-gray-900 text-white">
                        {n}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
                <p className="text-xs text-gray-400">Each variation is a separate, billed generation.</p>
              </div>

              {selectedModel?.supportsAudio && (
                <div className="space-y-3">
                  <span className="text-sm font-semibold text-gray-200">Audio</span>
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={audio}
                      onChange={(e) => setAudio(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500/60"
                    />
                    <span>Generate synchronized audio (costs more)</span>
                  </label>
                </div>
              )}

              {selectedModel?.supportsImage && (
                <div className="space-y-3">
                  <span className="text-sm font-semibold text-gray-200">
                    Reference Image <span className="text-gray-400 font-normal">(Optional, max 5 MB)</span>
                  </span>
                  <label
                    htmlFor="conditioning-image-input"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-600/70 bg-gray-900/60 p-4 text-center text-sm text-gray-300 transition hover:border-solid hover:border-blue-500/60 hover:bg-gray-900"
                  >
                    <input
                      type="file"
                      id="conditioning-image-input"
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                    />
                    <svg className="mb-2 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Upload a start frame</span>
                  </label>
                  {conditioningImage && (
                    <div className="flex items-center justify-between rounded-xl border border-green-600/40 bg-green-900/20 px-4 py-2 text-xs text-green-200">
                      <span className="truncate">{conditioningImage.name}</span>
                      <button
                        type="button"
                        onClick={() => setConditioningImage(null)}
                        className="text-green-100 underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || imageBlockedByDuration || !providerConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-purple-600 py-4 text-center text-base font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  Generating with {selectedModel?.name ?? providerId}...
                </>
              ) : (
                <>Generate with {selectedModel?.name ?? providerId}</>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Estimated total {estimatedCost ? formatCost(estimatedCost) : '—'} • {numberOfVideos} video(s) ×{' '}
              {durationSeconds}s at {resolution === '4k' ? '4K' : resolution}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Signed in as</p>
                <p className="text-lg font-semibold text-white">
                  {session.user?.name ?? session.user?.email}
                </p>
              </div>
              <span className="rounded-full border border-green-600/40 bg-green-900/30 px-3 py-1 text-xs font-medium text-green-300">
                Active
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <dt className="text-gray-400">Provider</dt>
                <dd className="font-medium text-white">{selectedProvider?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Model</dt>
                <dd className="font-medium text-white">{selectedModel?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Pricing</dt>
                <dd>{selectedModel?.priceLabel ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Aspect ratios</dt>
                <dd className="text-xs">{selectedModel?.aspectRatios.join(', ') ?? '—'}</dd>
              </div>
            </dl>
            {generationMeta?.completedAt && (
              <div className="mt-6 rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4 text-sm text-gray-300">
                <p className="text-xs uppercase tracking-wide text-gray-400">Last generation</p>
                <p className="text-white">
                  {generationMeta.error
                    ? `Failed after ${lastGenerationDuration ?? 0}s`
                    : `Finished in ~${lastGenerationDuration ?? 0}s`}
                </p>
                {generationMeta.cost && (
                  <p className="text-xs text-gray-400">
                    Reported cost: {formatCost(generationMeta.cost)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <h3 className="text-sm font-semibold text-white">Run readiness</h3>
            <ul className="mt-4 space-y-4">
              {readinessChecklist.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.helper}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      item.ready ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {item.ready ? 'Ready' : 'Action'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-blue-600/40 bg-linear-to-br from-blue-900/40 to-purple-900/30 p-6 text-sm text-blue-50">
            <h3 className="text-base font-semibold text-white">Tips</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>• Download clips you want to keep. Runway and Luma links expire after about an hour.</li>
              <li>• Veo 3.1 Lite or Wan 3 are cheap for drafting a prompt before a 1080p or 4K run.</li>
              <li>• Name the camera move, lighting and pacing in the prompt for better motion.</li>
            </ul>
          </div>
        </aside>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-4 ${
            message.includes('successfully')
              ? 'border-green-600/40 bg-green-900/30 text-green-200'
              : message.includes('Failed') || message.includes('Please')
              ? 'border-red-600/40 bg-red-900/30 text-red-200'
              : 'border-blue-600/40 bg-blue-900/30 text-blue-200'
          }`}
        >
          {message}
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Generated videos</h3>
            <p className="text-xs text-gray-400">
              We keep the links available while your session stays active.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {videos.map((video, index) => (
              <div
                key={`${video}-${index}`}
                className="space-y-3 rounded-2xl border border-gray-700/60 bg-gray-900/50 p-4"
              >
                <video controls className="w-full rounded-xl" src={video}>
                  Your browser does not support the video tag.
                </video>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300">
                  <span>Variation {index + 1}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCopyVideoUrl(video)}
                      className="text-xs font-semibold text-blue-300 underline-offset-2 hover:underline"
                    >
                      {copiedVideoUrl === video ? 'Copied!' : 'Copy link'}
                    </button>
                    <a
                      href={video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-white underline-offset-2 hover:underline"
                    >
                      Open
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
