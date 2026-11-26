// AI 语音引擎：浏览器 TTS（普通话、语速可调）+ 离线语音包回放 + 语音识别（STT）
import type { ReminderSettings } from '../types'
import { isInQuietHours } from '../lib/date'

export interface VoiceState {
  speaking: boolean
  supported: boolean
  listening: boolean
  sttSupported: boolean
  lastText: string
  engine: 'system' | 'offline' | 'none'
}

let sttRec: any = null

export const voiceSupport = () => {
  if (typeof window === 'undefined') return { tts: false, stt: false }
  const tts = 'speechSynthesis' in window
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return { tts, stt: !!SR }
}

export const listVoices = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices()
}

export const pickZhVoice = () => {
  const voices = listVoices()
  return (
    voices.find((v) => /zh-CN|zh_CN|Chinese \(China/i.test(`${v.lang} ${v.name}`) && /Ting|Xiaoxiao|Huihui|Yaoyao|Mei|Flo|Eddy|Sin/i.test(v.name)) ??
    voices.find((v) => /zh[-_]CN/i.test(v.lang)) ??
    voices.find((v) => /zh/i.test(v.lang)) ??
    null
  )
}

const splitSentences = (text: string) =>
  text
    .replace(/\n+/g, '。')
    .split(/(?<=[。！？；])/)
    .map((s) => s.trim())
    .filter(Boolean)

// 播放离线语音包（构建期由 say+ffmpeg 生成），失败自动回落到系统 TTS
export const playOfflinePack = async (src: string, rate = 1): Promise<boolean> => {
  try {
    const audio = new Audio(src)
    audio.playbackRate = Math.max(0.5, Math.min(2, rate))
    await audio.play()
    return true
  } catch {
    return false
  }
}

export interface SpeakOptions {
  rate?: number
  volume?: number
  onBoundary?: (charIndex: number) => void
  onEnd?: () => void
  respectQuiet?: boolean
  settings?: ReminderSettings
}

export const speak = (text: string, opts: SpeakOptions = {}) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    opts.onEnd?.()
    return false
  }
  const rate = opts.rate ?? 1
  if (opts.respectQuiet && opts.settings && isInQuietHours(opts.settings.quietStart, opts.settings.quietEnd)) {
    opts.onEnd?.()
    return false
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const voice = pickZhVoice()
  const parts = splitSentences(text)
  let idx = 0
  const next = () => {
    if (idx >= parts.length) {
      opts.onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(parts[idx++])
    u.lang = 'zh-CN'
    u.rate = Math.max(0.5, Math.min(1.6, rate))
    u.pitch = 1
    u.volume = opts.volume ?? 1
    if (voice) u.voice = voice
    u.onboundary = opts.onBoundary as any
    u.onend = next
    u.onerror = next
    synth.speak(u)
  }
  next()
  return true
}

export const stopSpeak = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  if (typeof window !== 'undefined' && currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}

let currentAudio: HTMLAudioElement | null = null

// 统一播放入口：优先离线语音包（弱网可用），失败回落系统 TTS
export const speakOrPlay = async (
  text: string,
  opts: SpeakOptions & { offlineSrc?: string; useOffline?: boolean } = {},
): Promise<'offline' | 'tts' | 'muted'> => {
  if (opts.respectQuiet && opts.settings && isInQuietHours(opts.settings.quietStart, opts.settings.quietEnd)) {
    opts.onEnd?.()
    return 'muted'
  }
  stopSpeak()
  if (opts.offlineSrc && opts.useOffline !== false) {
    try {
      const audio = new Audio(opts.offlineSrc)
      audio.playbackRate = Math.max(0.5, Math.min(2, opts.rate ?? 1))
      audio.onended = () => { currentAudio = null; opts.onEnd?.() }
      audio.onerror = () => { currentAudio = null; speak(text, opts) }
      currentAudio = audio
      await audio.play()
      return 'offline'
    } catch {
      currentAudio = null
    }
  }
  speak(text, opts)
  return 'tts'
}

export interface ListenOptions {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (msg: string) => void
  onEnd?: () => void
}

// 语音识别（普通话），不可用时回落到提示文字输入
export const listen = (opts: ListenOptions = {}): (() => void) => {
  const SR: any = typeof window === 'undefined' ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    opts.onError?.('浏览器不支持语音识别，请使用文字输入')
    opts.onEnd?.()
    return () => {}
  }
  stopListen()
  const rec = new SR()
  sttRec = rec
  rec.lang = 'zh-CN'
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.onresult = (e: any) => {
    let interim = ''
    let final = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) final += r[0].transcript
      else interim += r[0].transcript
    }
    if (interim) opts.onPartial?.(interim)
    if (final) opts.onFinal?.(final.trim())
  }
  rec.onerror = (e: any) => {
    const map: Record<string, string> = {
      'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许麦克风',
      'no-speech': '没有检测到语音，请再试一次',
      'audio-capture': '未找到麦克风设备',
      network: '语音识别服务不可用（网络受限），请改用文字输入',
    }
    opts.onError?.(map[e.error] ?? `语音识别失败：${e.error}`)
  }
  rec.onend = () => {
    sttRec = null
    opts.onEnd?.()
  }
  try {
    rec.start()
  } catch {
    opts.onError?.('语音识别启动失败，请稍后重试')
  }
  return () => {
    try {
      rec.stop()
    } catch {
      /* noop */
    }
  }
}

export const stopListen = () => {
  if (sttRec) {
    try {
      sttRec.stop()
    } catch {
      /* noop */
    }
    sttRec = null
  }
}

// 语速档位（患者端极简三档）
export const RATE_LABELS: { value: number; label: string }[] = [
  { value: 0.8, label: '慢' },
  { value: 1.0, label: '正常' },
  { value: 1.2, label: '快' },
]
