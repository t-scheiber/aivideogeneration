'use client'

import React, { useMemo, useState } from 'react'
import { useSession, signIn } from '@/lib/auth-client'
import { getAllProviders, VideoProvider, calculateCost } from '@/lib/video-providers'

interface GenerationMeta {
  provider: string
  cost?: number
  startedAt?: number
  completedAt?: number
  error?: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

export default function VideoGenerator() {
  const { data: session, isPending } = useSession()
  const providers = useMemo(() => getAllProviders(), [])
  const [provider, setProvider] = useState(() => providers[0]?.id ?? 'veo-3')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [numberOfVideos, setNumberOfVideos] = useState(1)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [durationSeconds, setDurationSeconds] = useState(5)
  const [conditioningImage, setConditioningImage] = useState<File | null>(null)
  const [veo3Model, setVeo3Model] = useState('veo3-fast')
  const [veo3Resolution, setVeo3Resolution] = useState('720p')
  const [veo3Audio, setVeo3Audio] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [videos, setVideos] = useState<string[]>([])
  const [generationMeta, setGenerationMeta] = useState<GenerationMeta | null>(null)
  const [copiedVideoUrl, setCopiedVideoUrl] = useState<string | null>(null)

  const selectedProvider = useMemo<VideoProvider | undefined>(() => {
    return providers.find((p) => p.id === provider)
  }, [providers, provider])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setConditioningImage(file)
    }
  }

  React.useEffect(() => {
    if (!selectedProvider) {
      return
    }

    setNumberOfVideos((prev) => {
      if (!selectedProvider.capabilities.supportsMultipleVideos) {
        return 1
      }
      const maxVideos = selectedProvider.capabilities.maxVideos || 1
      return Math.min(Math.max(1, prev), maxVideos)
    })

    setConditioningImage((prev) =>
      selectedProvider.capabilities.supportsConditioningImage ? prev : null
    )

    setNegativePrompt((prev) =>
      selectedProvider.capabilities.supportsNegativePrompt ? prev : ''
    )

    setAspectRatio((prev) => {
      if (selectedProvider.supportedAspectRatios.includes(prev)) {
        return prev
      }
      return selectedProvider.supportedAspectRatios[0] ?? '16:9'
    })

    setDurationSeconds((prev) => {
      const allowedDurations = selectedProvider.capabilities.supportedDurations
      if (allowedDurations.length > 0 && !allowedDurations.includes(prev)) {
        return allowedDurations[0]
      }
      return Math.min(prev, selectedProvider.maxDuration)
    })
  }, [selectedProvider])

  const estimatedCostPerVideo = useMemo(() => {
    if (!selectedProvider) {
      return 0
    }
    return calculateCost(selectedProvider, durationSeconds)
  }, [selectedProvider, durationSeconds])

  const estimatedTotalCost = useMemo(() => {
    return estimatedCostPerVideo * Math.max(1, numberOfVideos)
  }, [estimatedCostPerVideo, numberOfVideos])

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
            : 'Add more context (≥ 15 words) for cinematic results',
      },
      {
        label: 'Provider limits',
        ready: Boolean(selectedProvider),
        helper: selectedProvider
          ? `Max ${selectedProvider.maxDuration}s • ${selectedProvider.supportedAspectRatios.join(', ')}`
          : 'Choose a provider',
      },
      {
        label: 'Reference image',
        ready:
          !selectedProvider?.capabilities.supportsConditioningImage || Boolean(conditioningImage),
        helper: selectedProvider?.capabilities.supportsConditioningImage
          ? conditioningImage
            ? `${conditioningImage.name} attached`
            : 'Optional but helps with consistency'
          : 'Not available for this provider',
      },
      {
        label: 'Batch size',
        ready:
          !selectedProvider?.capabilities.supportsMultipleVideos ||
          numberOfVideos <= (selectedProvider?.capabilities.maxVideos ?? 1),
        helper: selectedProvider?.capabilities.supportsMultipleVideos
          ? `Up to ${selectedProvider?.capabilities.maxVideos ?? 1} variations`
          : 'Single video only',
      },
    ],
    [promptInsights.score, selectedProvider, conditioningImage, numberOfVideos]
  )

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

    setIsGenerating(true)
    setMessage('Generating...')
    setVideos([])

    const startedAt = Date.now()
    setGenerationMeta({ provider, startedAt })

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('negativePrompt', negativePrompt)
      formData.append('numberOfVideos', numberOfVideos.toString())
      formData.append('aspectRatio', aspectRatio)
      formData.append('durationSeconds', durationSeconds.toString())
      formData.append('provider', provider)

      if (provider === 'veo-3') {
        formData.append('veo3Model', veo3Model)
        formData.append('veo3Resolution', veo3Resolution)
        formData.append('veo3Audio', veo3Audio.toString())
      }

      if (conditioningImage) {
        formData.append('conditioningImage', conditioningImage)
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const result = await response.json()
      setVideos(result.videos || [])
      setGenerationMeta({
        provider: result.provider || provider,
        cost: result.cost,
        startedAt,
        completedAt: Date.now(),
      })
      setMessage(
        result.cost
          ? `Video generated successfully • ${formatCurrency(result.cost)}`
          : 'Video generated successfully!'
      )
    } catch (error) {
      console.error('Error generating video:', error)
      setGenerationMeta({
        provider,
        startedAt,
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      setMessage('Failed to generate video. Please try again.')
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

          {selectedProvider?.capabilities.supportsNegativePrompt && (
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="provider-selection" className="text-sm font-semibold text-gray-200">
                Video Generation Provider
              </label>
              <span className="text-xs text-gray-400">Cost adapts per provider</span>
            </div>
            <div className="relative">
              <select
                id="provider-selection"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                aria-label="Video generation provider selection"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                    {p.name} — ${p.pricing.costPerSecond.toFixed(2)}/sec
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {selectedProvider && (
              <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-900/60 p-4 text-sm text-gray-300">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-gray-400">{selectedProvider.description}</span>
                  <span
                    className={`rounded-full border px-2 py-1 font-medium ${
                      selectedProvider.pricing.costPerSecond <= 0.03
                        ? 'border-green-600/30 bg-green-900/30 text-green-400'
                        : selectedProvider.pricing.costPerSecond <= 0.05
                        ? 'border-yellow-600/30 bg-yellow-900/30 text-yellow-400'
                        : 'border-red-600/30 bg-red-900/30 text-red-400'
                    }`}
                  >
                    ${selectedProvider.pricing.costPerSecond.toFixed(2)}/sec
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-gray-400">
                  <span>Est. cost: {formatCurrency(estimatedTotalCost)}</span>
                  {selectedProvider.pricing.freeTier && (
                    <span className="text-green-400">{selectedProvider.pricing.freeTier.description}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.features.map((feature) => (
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
                We only render controls the selected provider supports.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {selectedProvider?.capabilities.supportsMultipleVideos && (
                <div className="space-y-3">
                  <label htmlFor="number-of-videos" className="text-sm font-semibold text-gray-200">
                    Number of Videos
                  </label>
                  <div className="relative">
                    <input
                      id="number-of-videos"
                      type="number"
                      min={1}
                      max={selectedProvider.capabilities.maxVideos || 1}
                      value={numberOfVideos}
                      onChange={(e) => setNumberOfVideos(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="Number of videos to generate"
                    />
                    <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center space-x-2 text-xs text-gray-400">
                      <span>max {selectedProvider.capabilities.maxVideos}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Generate up to {selectedProvider.capabilities.maxVideos} variations in one run.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="aspect-ratio" className="text-sm font-semibold text-gray-200">
                  Aspect Ratio
                </label>
                <div className="relative">
                  <select
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                    aria-label="Aspect ratio"
                  >
                    {selectedProvider?.supportedAspectRatios.map((ratio) => (
                      <option key={ratio} value={ratio} className="bg-gray-900 text-white">
                        {ratio}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Landscape</span>
                  <span className="font-semibold text-blue-400">{aspectRatio}</span>
                  <span>Portrait</span>
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="duration-seconds" className="text-sm font-semibold text-gray-200">
                  Duration
                </label>
                {selectedProvider?.capabilities.supportedDurations.length ? (
                  <div className="relative">
                    <select
                      id="duration-seconds"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      className="w-full appearance-none rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="Video duration in seconds"
                    >
                      {selectedProvider.capabilities.supportedDurations.map((duration) => (
                        <option key={duration} value={duration} className="bg-gray-900 text-white">
                          {duration}s
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    id="duration-seconds"
                    type="number"
                    min={3}
                    max={selectedProvider?.maxDuration ?? 10}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Math.max(3, Number(e.target.value)))}
                    className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                    aria-label="Video duration in seconds"
                  />
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>3s</span>
                  <span className="font-semibold text-blue-400">{durationSeconds}s</span>
                  <span>{selectedProvider?.maxDuration ?? 10}s</span>
                </div>
              </div>

              {selectedProvider?.capabilities.supportsConditioningImage && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-200">
                    Reference Image <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <label
                    htmlFor="conditioning-image-input"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-600/70 bg-gray-900/60 p-4 text-center text-sm text-gray-300 transition hover:border-solid hover:border-blue-500/60 hover:bg-gray-900"
                  >
                    <input
                      type="file"
                      id="conditioning-image-input"
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <svg className="mb-2 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Upload reference image</span>
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

              {provider === 'veo-3' && (
                <>
                  <div className="space-y-3">
                    <label htmlFor="veo3-model" className="text-sm font-semibold text-gray-200">
                      VEO3 Model
                    </label>
                    <select
                      id="veo3-model"
                      value={veo3Model}
                      onChange={(e) => setVeo3Model(e.target.value)}
                      className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="VEO3 model selection"
                    >
                      <option value="veo3-fast">VEO3 Fast (10-15 credits)</option>
                      <option value="veo3-quality">VEO3 Quality (20-30 credits)</option>
                    </select>
                    <p className="text-xs text-gray-400">
                      {veo3Model === 'veo3-fast'
                        ? 'Faster generations with slightly softer detail.'
                        : 'Highest fidelity with longer wait times.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="veo3-resolution" className="text-sm font-semibold text-gray-200">
                      Resolution
                    </label>
                    <select
                      id="veo3-resolution"
                      value={veo3Resolution}
                      onChange={(e) => setVeo3Resolution(e.target.value)}
                      className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="VEO3 resolution"
                    >
                      <option value="720p">720p (Standard)</option>
                      <option value="1080p">1080p (HD)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-200">Audio Generation</label>
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={veo3Audio}
                        onChange={(e) => setVeo3Audio(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500/60"
                      />
                      <span>Generate synchronized audio (+5 credits)</span>
                    </label>
                  </div>
                </>
              )}

              {selectedProvider?.capabilities.supportsResolution &&
                selectedProvider.capabilities.supportedResolutions.length > 0 &&
                provider !== 'veo-3' && (
                  <div className="space-y-3">
                    <label htmlFor="resolution" className="text-sm font-semibold text-gray-200">
                      Resolution
                    </label>
                    <select
                      id="resolution"
                      className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="Video resolution"
                    >
                      {selectedProvider.capabilities.supportedResolutions.map((resolution) => (
                        <option key={resolution} value={resolution} className="bg-gray-900 text-white">
                          {resolution}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {selectedProvider?.capabilities.supportsFPS &&
                selectedProvider.capabilities.supportedFPS.length > 0 && (
                  <div className="space-y-3">
                    <label htmlFor="fps" className="text-sm font-semibold text-gray-200">
                      Frame Rate (FPS)
                    </label>
                    <select
                      id="fps"
                      className="w-full rounded-2xl border border-gray-700/60 bg-gray-900/60 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      aria-label="Video frame rate"
                    >
                      {selectedProvider.capabilities.supportedFPS.map((fps) => (
                        <option key={fps} value={fps} className="bg-gray-900 text-white">
                          {fps} FPS
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-purple-600 py-4 text-center text-base font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  Generating with {selectedProvider?.name ?? provider}...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate with {selectedProvider?.name ?? provider}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Estimated total cost {formatCurrency(estimatedTotalCost)} • {numberOfVideos} video(s) ×{' '}
              {durationSeconds}s
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/40 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Better Auth session</p>
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
                <dt className="text-gray-400">Cost / sec</dt>
                <dd>{selectedProvider ? `$${selectedProvider.pricing.costPerSecond.toFixed(2)}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Max duration</dt>
                <dd>{selectedProvider?.maxDuration ?? 0}s</dd>
              </div>
              <div>
                <dt className="text-gray-400">Aspect ratios</dt>
                <dd className="text-xs">
                  {selectedProvider?.supportedAspectRatios?.join(', ') ?? '—'}
                </dd>
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
                    Actual cost: {formatCurrency(generationMeta.cost)}
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
            <h3 className="text-base font-semibold text-white">Tips & troubleshooting</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>• If something looks off after the Better Auth migration, sign out/in once.</li>
              <li>• Ensure the provider API key exists before hitting generate.</li>
              <li>• Prefer longer prompts with camera moves for the best motion cues.</li>
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

