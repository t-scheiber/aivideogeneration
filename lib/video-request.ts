import { getProviderById } from './video-providers'

export function parseVideoForm(form: FormData) {
  const text = (name: string, fallback?: string): string => {
    const values = form.getAll(name)
    if (values.length > 1 || values.some(value => typeof value !== 'string')) throw new Error('Invalid form field')
    return (values[0] as string | undefined) ?? fallback ?? ''
  }
  const integer = (name: string): number => {
    const value = text(name)
    if (!/^[1-9]\d*$/.test(value)) throw new Error('Invalid numeric option')
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed)) throw new Error('Invalid numeric option')
    return parsed
  }
  const prompt = text('prompt').trim()
  const negativePrompt = text('negativePrompt')
  const provider = text('provider', 'veo-3') || 'veo-3'
  const selected = getProviderById(provider)
  if (!selected || !prompt || prompt.length > 10000 || negativePrompt.length > 10000) throw new Error('Invalid provider or prompt')
  const durationSeconds = integer('durationSeconds')
  const numberOfVideos = integer('numberOfVideos')
  const aspectRatio = text('aspectRatio')
  if (!selected.supportedAspectRatios.includes(aspectRatio) || durationSeconds > selected.maxDuration ||
      !selected.capabilities.supportedDurations.includes(durationSeconds) ||
      numberOfVideos > selected.capabilities.maxVideos ||
      (!selected.capabilities.supportsMultipleVideos && numberOfVideos !== 1)) throw new Error('Unsupported video options')
  const veo3Model = text('veo3Model', 'veo3-fast') || 'veo3-fast'
  const veo3Resolution = text('veo3Resolution', '720p') || '720p'
  const audio = text('veo3Audio', 'false')
  if (provider === 'veo-3' && (!['veo3-fast', 'veo3-quality'].includes(veo3Model) ||
      !selected.capabilities.supportedResolutions.includes(veo3Resolution) || !['true', 'false'].includes(audio))) throw new Error('Unsupported VEO options')
  const images = form.getAll('conditioningImage')
  const conditioningImageFile = images[0] ?? null
  if (images.length > 1 || (conditioningImageFile !== null &&
      (typeof conditioningImageFile === 'string' || !selected.capabilities.supportsConditioningImage ||
       !['image/png', 'image/jpeg', 'image/webp'].includes(conditioningImageFile.type) ||
       conditioningImageFile.size === 0 || conditioningImageFile.size > 10 * 1024 * 1024))) throw new Error('Invalid conditioning image')
  return {prompt, negativePrompt, provider, durationSeconds, numberOfVideos, aspectRatio,
    veo3Model, veo3Resolution, veo3Audio: audio === 'true', conditioningImageFile: conditioningImageFile as File | null}
}
