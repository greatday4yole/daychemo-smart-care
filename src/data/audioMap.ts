// 离线语音包映射：核心播报场景 → 预生成 MP3（弱网/断网时优先播放，失败自动回落系统 TTS）
export const TEMPLATE_AUDIO: Record<string, string> = {
  'tpl-pre-24': 'audio/pre-01.mp3',
  'tpl-pre-2': 'audio/pre-02.mp3',
  'tpl-during-30': 'audio/during-01.mp3',
  'tpl-during-60': 'audio/during-02.mp3',
  'tpl-post-6': 'audio/post-01.mp3',
  'tpl-post-24': 'audio/post-01.mp3',
  'tpl-post-120': 'audio/post-02.mp3',
  'tpl-post-48-mid': 'audio/post-04.mp3',
  'tpl-post-72-high': 'audio/post-02.mp3',
  'tpl-post-168': 'audio/post-04.mp3',
  'tpl-post-240': 'audio/post-04.mp3',
  'tpl-post-336': 'audio/post-05.mp3',
}

export const EDUCATION_AUDIO: Record<string, string> = {
  'edu-pre-01': 'audio/pre-01.mp3',
  'edu-post-01': 'audio/post-01.mp3',
  'edu-post-03': 'audio/post-03.mp3',
  'edu-post-04': 'audio/post-04.mp3',
  'edu-post-06': 'audio/welcome.mp3',
}

export const CLIP = {
  welcome: 'audio/welcome.mp3',
  emergency: 'audio/emergency.mp3',
} as const

// 相对路径需带 base（支持 GitHub Pages 子路径部署）
export const audioUrl = (src: string) => {
  const base = (import.meta as any).env?.BASE_URL ?? '/'
  return `${base.replace(/\/$/, '')}/${src.replace(/^\//, '')}`
}

// 兜底：新增模板若未配置离线音频，按阶段回落到通用片段（保证离线场景仍有声音）
export const PHASE_FALLBACK: Record<string, string> = {
  pre: 'audio/pre-01.mp3',
  during: 'audio/during-01.mp3',
  post: 'audio/post-01.mp3',
}

export const offlineFor = (templateId: string, phase?: string): string | undefined => {
  if (TEMPLATE_AUDIO[templateId]) return TEMPLATE_AUDIO[templateId]
  if (phase && PHASE_FALLBACK[phase]) return PHASE_FALLBACK[phase]
  return undefined
}
