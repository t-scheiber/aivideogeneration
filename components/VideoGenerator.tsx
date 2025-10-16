'use client'

import React, { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { getAllProviders, VideoProvider, calculateCost } from '@/lib/video-providers'

interface VideoGenerationParams {
  prompt: string
  negativePrompt: string
  numberOfVideos: number
  aspectRatio: string
  durationSeconds: number
  conditioningImage: { mimeType: string; imageBytes: string } | null
  provider: string
}

export default function VideoGenerator() {
  const { data: session, status } = useSession()
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [numberOfVideos, setNumberOfVideos] = useState(1)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [durationSeconds, setDurationSeconds] = useState(5)
  const [conditioningImage, setConditioningImage] = useState<File | null>(null)
  const [provider, setProvider] = useState('veo-3')
  const [veo3Model, setVeo3Model] = useState('veo3-fast')
  const [veo3Resolution, setVeo3Resolution] = useState('720p')
  const [veo3Audio, setVeo3Audio] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [videos, setVideos] = useState<string[]>([])
  const [providers] = useState<VideoProvider[]>(getAllProviders())
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setConditioningImage(file)
    }
  }

  // Update selected provider when provider changes
  React.useEffect(() => {
    const providerData = providers.find(p => p.id === provider)
    setSelectedProvider(providerData || null)
    
    // Reset values that are not supported by the new provider
    if (providerData) {
      if (!providerData.capabilities.supportsMultipleVideos) {
        setNumberOfVideos(1)
      } else {
        setNumberOfVideos(Math.min(numberOfVideos, providerData.capabilities.maxVideos))
      }
      
      if (!providerData.capabilities.supportsConditioningImage) {
        setConditioningImage(null)
      }
      
      if (!providerData.capabilities.supportsNegativePrompt) {
        setNegativePrompt('')
      }
      
      // Update aspect ratio if not supported
      if (!providerData.supportedAspectRatios.includes(aspectRatio)) {
        setAspectRatio(providerData.supportedAspectRatios[0] || '16:9')
      }
      
      // Update duration if not supported
      if (providerData.capabilities.supportedDurations.length > 0 && 
          !providerData.capabilities.supportedDurations.includes(durationSeconds)) {
        setDurationSeconds(providerData.capabilities.supportedDurations[0])
      }
    }
  }, [provider, providers, numberOfVideos, aspectRatio, durationSeconds])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Sign in to Generate Videos</h2>
        <p className="text-gray-400">You need to be signed in to use the video generator.</p>
        <button
          onClick={() => signIn('google')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setMessage('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setMessage('Generating...')
    setVideos([])

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('negativePrompt', negativePrompt)
      formData.append('numberOfVideos', numberOfVideos.toString())
      formData.append('aspectRatio', aspectRatio)
      formData.append('durationSeconds', durationSeconds.toString())
      formData.append('provider', provider)
      
      // Add VEO3-specific parameters
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
      setMessage('Video generated successfully!')
    } catch (error) {
      console.error('Error generating video:', error)
      setMessage('Failed to generate video. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Main Prompt */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-200 block">
          Video Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none backdrop-blur-sm"
          placeholder="Describe the video you want to create... e.g., 'A cinematic shot of a futuristic city at night with neon lights reflecting on wet streets'"
          aria-label="Video generation prompt"
        />
      </div>

      {/* Negative Prompt - Only show if supported */}
      {selectedProvider?.capabilities.supportsNegativePrompt && (
        <div className="space-y-3">
          <label htmlFor="negative-prompt-input" className="text-sm font-semibold text-gray-200 block">
            Negative Prompt <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="negative-prompt-input"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={3}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none backdrop-blur-sm"
            placeholder="What you don't want in the video... e.g., 'text, watermarks, blurry, low quality'"
            aria-label="Video generation negative prompt"
          />
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-3">
        <label htmlFor="provider-selection" className="text-sm font-semibold text-gray-200 block">
          Video Generation Provider
        </label>
        <div className="relative">
          <select
            id="provider-selection"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
            aria-label="Video generation provider selection"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id} className="bg-gray-800 text-white">
                {p.name} - ${p.pricing.costPerSecond.toFixed(2)}/sec
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {(() => {
          const selectedProvider = providers.find(p => p.id === provider)
          if (!selectedProvider) return null
          
          const estimatedCost = calculateCost(selectedProvider, durationSeconds * numberOfVideos)
          
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{selectedProvider.description}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedProvider.pricing.costPerSecond <= 0.03 
                    ? 'bg-green-900/30 text-green-400 border border-green-600/30' 
                    : selectedProvider.pricing.costPerSecond <= 0.05
                    ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/30'
                    : 'bg-red-900/30 text-red-400 border border-red-600/30'
                }`}>
                  ${selectedProvider.pricing.costPerSecond.toFixed(2)}/sec
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Estimated cost: ${estimatedCost.toFixed(2)}</span>
                {selectedProvider.pricing.freeTier && (
                  <span className="text-green-400">
                    {selectedProvider.pricing.freeTier.description}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedProvider.features.map((feature, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Number of Videos - Only show if supported */}
        {selectedProvider?.capabilities.supportsMultipleVideos && (
          <div className="space-y-3">
            <label htmlFor="number-of-videos" className="text-sm font-semibold text-gray-200 block">
              Number of Videos
            </label>
            <div className="relative">
              <input
                id="number-of-videos"
                type="number"
                min="1"
                max={selectedProvider?.capabilities.maxVideos || 4}
                value={numberOfVideos}
                onChange={(e) => setNumberOfVideos(parseInt(e.target.value))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Number of videos to generate"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setNumberOfVideos(Math.max(1, numberOfVideos - 1))}
                  disabled={numberOfVideos <= 1}
                  className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberOfVideos(Math.min(selectedProvider?.capabilities.maxVideos || 4, numberOfVideos + 1))}
                  disabled={numberOfVideos >= (selectedProvider?.capabilities.maxVideos || 4)}
                  className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Generate 1-{selectedProvider?.capabilities.maxVideos || 4} videos with different variations
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <label htmlFor="aspect-ratio" className="text-sm font-semibold text-gray-200 block">
            Aspect Ratio
          </label>
          <div className="relative">
            <select
              id="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
              aria-label="Aspect ratio"
            >
              {selectedProvider?.supportedAspectRatios.map((ratio) => (
                <option key={ratio} value={ratio} className="bg-gray-800 text-white">
                  {ratio === '16:9' && '16:9 (Landscape)'}
                  {ratio === '21:9' && '21:9 (Cinematic)'}
                  {ratio === '9:16' && '9:16 (Portrait)'}
                  {ratio === '1:1' && '1:1 (Square)'}
                  {ratio === '4:3' && '4:3 (Standard)'}
                  {ratio === '3:4' && '3:4 (Vertical)'}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Landscape</span>
            <span className="font-medium text-blue-400">
              {aspectRatio === '16:9' && '16:9'}
              {aspectRatio === '21:9' && '21:9'}
              {aspectRatio === '9:16' && '9:16'}
              {aspectRatio === '1:1' && '1:1'}
              {aspectRatio === '4:3' && '4:3'}
              {aspectRatio === '3:4' && '3:4'}
            </span>
            <span>Portrait</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <label htmlFor="duration-seconds" className="text-sm font-semibold text-gray-200 block">
            Duration
          </label>
          {selectedProvider?.capabilities.supportedDurations && selectedProvider.capabilities.supportedDurations.length > 0 ? (
            <div className="relative">
              <select
                id="duration-seconds"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
                aria-label="Video duration in seconds"
              >
                {selectedProvider.capabilities.supportedDurations.map((duration) => (
                  <option key={duration} value={duration} className="bg-gray-800 text-white">
                    {duration}s
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                id="duration-seconds"
                type="number"
                min="3"
                max={selectedProvider?.maxDuration || 10}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Video duration in seconds"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setDurationSeconds(Math.max(3, durationSeconds - 1))}
                  disabled={durationSeconds <= 3}
                  className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDurationSeconds(Math.min(selectedProvider?.maxDuration || 10, durationSeconds + 1))}
                  disabled={durationSeconds >= (selectedProvider?.maxDuration || 10)}
                  className="w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>3s</span>
            <span className="font-medium text-blue-400">{durationSeconds}s</span>
            <span>{selectedProvider?.maxDuration || 10}s</span>
          </div>
        </div>
        
        {/* Reference Image - Only show if supported */}
        {selectedProvider?.capabilities.supportsConditioningImage && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-200 block">
              Reference Image <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="file"
                id="conditioning-image-input"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*"
              />
              <label
                htmlFor="conditioning-image-input"
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 text-white hover:bg-gray-600/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm cursor-pointer block text-center border-dashed hover:border-solid"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Choose Image</span>
                </div>
              </label>
            </div>
            {conditioningImage && (
              <div className="mt-2 p-2 bg-green-900/20 border border-green-600/30 rounded-lg">
                <p className="text-xs text-green-400 font-medium">✓ {conditioningImage.name}</p>
              </div>
            )}
          </div>
        )}
        
        {/* VEO3 Model Selection - Only show for VEO3 */}
        {provider === 'veo-3' && (
          <div className="space-y-3">
            <label htmlFor="veo3-model" className="text-sm font-semibold text-gray-200 block">
              VEO3 Model
            </label>
            <div className="relative">
              <select
                id="veo3-model"
                value={veo3Model}
                onChange={(e) => setVeo3Model(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
                aria-label="VEO3 model selection"
              >
                <option value="veo3-fast" className="bg-gray-800 text-white">
                  VEO3 Fast (1-3 min, 10-15 credits)
                </option>
                <option value="veo3-quality" className="bg-gray-800 text-white">
                  VEO3 Quality (2-5 min, 20-30 credits)
                </option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              {veo3Model === 'veo3-fast' 
                ? 'Faster generation with good quality' 
                : 'Higher quality with longer generation time'
              }
            </p>
          </div>
        )}

        {/* VEO3 Resolution - Only show for VEO3 */}
        {provider === 'veo-3' && (
          <div className="space-y-3">
            <label htmlFor="veo3-resolution" className="text-sm font-semibold text-gray-200 block">
              Resolution
            </label>
            <div className="relative">
              <select
                id="veo3-resolution"
                value={veo3Resolution}
                onChange={(e) => setVeo3Resolution(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
                aria-label="VEO3 resolution"
              >
                <option value="720p" className="bg-gray-800 text-white">720p (Standard)</option>
                <option value="1080p" className="bg-gray-800 text-white">1080p (HD)</option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* VEO3 Audio - Only show for VEO3 */}
        {provider === 'veo-3' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-200 block">
              Audio Generation
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={veo3Audio}
                  onChange={(e) => setVeo3Audio(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">Generate audio</span>
              </label>
            </div>
            <p className="text-xs text-gray-400">
              {veo3Audio 
                ? 'AI will generate audio for your video (+5 credits)' 
                : 'Video will be generated without audio'
              }
            </p>
          </div>
        )}

        {/* Resolution - Only show if supported and not VEO3 */}
        {selectedProvider?.capabilities.supportsResolution && selectedProvider?.capabilities.supportedResolutions && selectedProvider.capabilities.supportedResolutions.length > 0 && provider !== 'veo-3' && (
          <div className="space-y-3">
            <label htmlFor="resolution" className="text-sm font-semibold text-gray-200 block">
              Resolution
            </label>
            <div className="relative">
              <select
                id="resolution"
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
                aria-label="Video resolution"
              >
                {selectedProvider.capabilities.supportedResolutions.map((resolution) => (
                  <option key={resolution} value={resolution} className="bg-gray-800 text-white">
                    {resolution}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {/* FPS - Only show if supported */}
        {selectedProvider?.capabilities.supportsFPS && selectedProvider?.capabilities.supportedFPS && selectedProvider.capabilities.supportedFPS.length > 0 && (
          <div className="space-y-3">
            <label htmlFor="fps" className="text-sm font-semibold text-gray-200 block">
              Frame Rate (FPS)
            </label>
            <div className="relative">
              <select
                id="fps"
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm appearance-none cursor-pointer"
                aria-label="Video frame rate"
              >
                {selectedProvider.capabilities.supportedFPS.map((fps) => (
                  <option key={fps} value={fps} className="bg-gray-800 text-white">
                    {fps} FPS
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="pt-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating Video with {providers.find(p => p.id === provider)?.name || provider}...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Generate Video with {providers.find(p => p.id === provider)?.name || provider}</span>
            </div>
          )}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-xl border ${
          message.includes('successfully') 
            ? 'bg-green-900/20 border-green-600/30 text-green-400' 
            : message.includes('Failed') || message.includes('Please enter')
            ? 'bg-red-900/20 border-red-600/30 text-red-400'
            : 'bg-blue-900/20 border-blue-600/30 text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {message.includes('successfully') && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {message.includes('Failed') && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* Generated Videos */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Generated Videos</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {videos.map((video, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                <video
                  controls
                  className="w-full h-auto"
                  src={video}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
