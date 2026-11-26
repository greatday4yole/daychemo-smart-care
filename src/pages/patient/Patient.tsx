import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, BellRing, BookOpen, Bot, CheckCircle2, ChevronRight, CircleHelp,
  Clock, HeartPulse, History, Home, Mic, MicOff, Phone, Plus, Send, Settings, ShieldAlert,
  Sparkles, Stethoscope, Thermometer, Volume2, VolumeX, X, CalendarClock, FileText,
} from 'lucide-react'
import {
  useApp, askAi, escalateChat, submitSymptoms, ackDispatch, saveSettings, markVoicePlayed,
  patientById, dispatchesOf, followupsOf, symptomsOf, chatsOf, roleText,
} from '../../store/app'
import { Badge, Empty, GradeBadge, Modal, RiskBadge, cn } from '../../components/ui'
import { listen, speak, speakOrPlay, stopListen, stopSpeak, voiceSupport, RATE_LABELS } from '../../voice/engine'
import { TEMPLATE_AUDIO, EDUCATION_AUDIO, CLIP, audioUrl, offlineFor, PHASE_FALLBACK } from '../../data/audioMap'
import { CTCAE_TERMS } from '../../data/ctcae'
import { EMERGENCY_SIGNS, termSummary } from '../../lib/ctcae'
import { isInQuietHours, relFuture, relTime, fmtDate, fmtTime } from '../../lib/date'
import type { ReminderDispatch } from '../../types'

const SYMPTOM_OPTIONS = [
  { key: 'fever', label: '发热', icon: '🌡️' },
  { key: 'nausea', label: '恶心', icon: '🤢' },
  { key: 'vomit', label: '呕吐', icon: '🤮' },
  { key: 'diarrhea', label: '腹泻', icon: '🚽' },
  { key: 'fatigue', label: '乏力', icon: '😴' },
  { key: 'mucositis', label: '口腔溃疡', icon: '👄' },
  { key: 'bleeding', label: '出血/瘀斑', icon: '🩸' },
  { key: 'rash', label: '皮疹/瘙痒', icon: '🔴' },
  { key: 'breath', label: '胸闷气促', icon: '😮‍💨' },
  { key: 'neuropathy', label: '手脚麻木', icon: '🦶' },
]

type TabKey = 'home' | 'symptoms' | 'ai' | 'education' | 'mine'

// 离线音频寻址：优先模板专属片段，缺失时按阶段回落通用片段
const offlineSrcFor = (d: { templateId: string; title?: string }): string | undefined => {
  const src = offlineFor(d.templateId, undefined)
  if (src) return audioUrl(src)
  const title = d.title ?? ''
  const phase = /化疗前|明日|准备/.test(title) ? 'pre' : /输注|化疗中|观察/.test(title) ? 'during' : 'post'
  return audioUrl(PHASE_FALLBACK[phase])
}

export default function Patient({ onExit }: { onExit: () => void }) {
  const state = useApp()
  const settings = state.settings
  const pid = state.activePatientId
  const patient = patientById(pid)
  const [tab, setTab] = useState<TabKey>('home')
  const [elder, setElder] = useState(true)
  const [detail, setDetail] = useState<string | null>(null)

  // 首次进入：语音欢迎 + 今日提醒播报
  const [banner, setBanner] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setBanner('已开启语音助手，可在页面右下角点击话筒直接提问'), 6000)
    return () => clearTimeout(t)
  }, [])

  if (!patient) return null

  const dispatches = dispatchesOf(pid).sort((a, b) => b.dueAt.localeCompare(a.dueAt))
  const todayStr = fmtDate(new Date())
  const windowStart = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  const windowEnd = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  const recentReminders = dispatches
    .filter((d) => d.dueAt.slice(0, 10) >= windowStart && d.dueAt.slice(0, 10) <= windowEnd)
    .sort((a, b) => Math.abs(new Date(a.dueAt).getTime() - Date.now()) - Math.abs(new Date(b.dueAt).getTime() - Date.now()))
  const todayReminders = dispatches.filter((d) => d.dueAt.slice(0, 10) === todayStr)
  // 首页主卡：优先展示“最近且未确认”的提醒（若都在窗口内已确认，则展示最接近当前时间的提醒）
  const closest = (list: typeof dispatches) =>
    [...list].sort((a, b) => Math.abs(new Date(a.dueAt).getTime() - Date.now()) - Math.abs(new Date(b.dueAt).getTime() - Date.now()))[0]
  const latestReminder =
    closest(recentReminders.filter((d) => d.status !== 'ack' && d.status !== 'muted')) ??
    closest(recentReminders.length ? recentReminders : dispatches)
  const openReminders = dispatches.filter((d) => d.status === 'pending' || (d.status === 'sent' && !d.readAt))
  const followups = followupsOf(pid).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const pendingFollow = followups.filter((f) => f.status !== 'done')

  return (
    <div className={cn('min-h-screen bg-gradient-to-b from-brand-50 via-slate-50 to-white', elder && 'elder-mode')}>
      {/* 顶部患者条 */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
            {patient.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
              <RiskBadge level={patient.risk} />
            </div>
            <p className="truncate text-[11px] text-slate-500">{patient.cycle} · {patient.phase === 'during' ? '化疗输注中' : patient.phase === 'pre' ? '待化疗' : `化疗后第 ${Math.max(0, Math.round((Date.now() - new Date(`${patient.chemoDate}T08:30:00`).getTime()) / 86400000))} 天`}</p>
          </div>
          <button onClick={onExit} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600">退出</button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-3 px-3 pb-24 pt-3">
        {tab === 'home' && <PatientHome {...{ patient, dispatches, todayReminders, recentReminders, latestReminder, openReminders, followups, pendingFollow, setDetail, setTab, onExit, elder, setElder }} />}
        {tab === 'symptoms' && <SymptomReportPanel pid={pid} />}
        {tab === 'ai' && <AiAssistant pid={pid} patientName={patient.name} />}
        {tab === 'education' && <EducationPanel pid={pid} risk={patient.risk} phase={patient.phase} />}
        {tab === 'mine' && <MinePanel pid={pid} elder={elder} setElder={setElder} />}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {[
            { k: 'home' as TabKey, l: '首页', i: Home },
            { k: 'symptoms' as TabKey, l: '症状上报', i: Activity },
            { k: 'ai' as TabKey, l: '语音小助手', i: Bot },
            { k: 'education' as TabKey, l: '我的宣教', i: BookOpen },
            { k: 'mine' as TabKey, l: '我的', i: Settings },
          ].map((n) => {
            const Icon = n.i
            const active = tab === n.k
            return (
              <button key={n.k} onClick={() => setTab(n.k)} className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', active ? 'text-brand-700' : 'text-slate-500')}>
                <Icon className={cn('h-5 w-5', active && 'text-brand-600')} />
                <span className={cn(active && 'font-semibold')}>{n.l}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* 提醒详情 */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="提醒详情" width="max-w-md">
        {(() => {
          const d = dispatches.find((x) => x.id === detail)
          if (!d) return null
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">{d.title}</p>
                <Badge tone={d.status === 'ack' ? 'emerald' : 'amber'}>{d.status === 'ack' ? '已确认' : '待确认'}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{d.body}</p>
              <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                <span>计划时间 {d.dueAt.slice(0, 16).replace('T', ' ')}</span>
               ·<span>渠道 {d.channel.join(' / ')}</span>
                {d.voicePlayedAt && <span>· 语音已播报</span>}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-soft flex-1"
                  onClick={() => {
                    speakOrPlay(d.body, {
                      rate: settings.rate,
                      offlineSrc: offlineSrcFor(d),
                      useOffline: settings.offlinePack,
                    })
                    markVoicePlayed(d.id)
                  }}
                >
                  <Volume2 className="h-4 w-4" /> 语音播报
                </button>
                <button className="btn-primary flex-1" onClick={() => { ackDispatch(d.id, patient.name) }}>
                  <CheckCircle2 className="h-4 w-4" /> 我已了解
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {banner && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 animate-slide-up">
          <button onClick={() => setBanner(null)} className="rounded-full bg-slate-900/90 px-4 py-2 text-xs text-white shadow-float">
            {banner} <X className="ml-1 inline h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- 首页 ----------------
function PatientHome({ patient, dispatches, todayReminders, recentReminders, latestReminder, openReminders, followups, pendingFollow, setDetail, setTab, elder, setElder }: any) {
  const state = useApp()
  const settings = state.settings
  const [playing, setPlaying] = useState<string | null>(null)
  const [engineHint, setEngineHint] = useState<string | null>(null)
  const support = useMemo(() => voiceSupport(), [])
  const quiet = isInQuietHours(settings.quietStart, settings.quietEnd)

  const play = async (d: any) => {
    setPlaying(d.id)
    setEngineHint(null)
    const mode = await speakOrPlay(d.body, {
      rate: settings.rate,
      offlineSrc: offlineSrcFor(d),
      useOffline: settings.offlinePack,
      onEnd: () => setPlaying(null),
    })
    markVoicePlayed(d.id)
    setEngineHint(mode === 'offline' ? '离线语音包' : mode === 'muted' ? '免打扰时段（仅文字）' : '系统语音引擎')
  }

  const nextFollow = pendingFollow[0]

  return (
    <>
      {/* AI 语音提醒卡 */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-card">
        <div className="flex items-center gap-1.5 text-[11px] text-brand-100">
          <Sparkles className="h-3.5 w-3.5" />AI 语音提醒 · 分时序智能推送
        </div>
        {latestReminder ? (
          <>
            <p className="mt-1.5 text-sm font-semibold leading-snug">{latestReminder.title}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-brand-50/90">{latestReminder.body}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => play(latestReminder)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-[13px] font-medium ring-1 ring-white/20 backdrop-blur active:bg-white/25"
              >
                {playing === latestReminder.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {playing === latestReminder.id ? '正在播报…' : '语音播报'}
              </button>
              <button onClick={() => setDetail(latestReminder.id)} className="flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2.5 text-[13px] font-medium text-brand-800">
                查看 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-brand-100/70">
              {engineHint ? `播放引擎：${engineHint}` : quiet ? '⏰ 当前为免打扰时段（夜间静音），语音将静默推送' : `语速 ${settings.rate}x · ${settings.offlinePack ? '离线语音包优先' : ''}${support.tts ? ' · 系统语音兜底' : ' · 当前浏览器不支持语音播报，可查看文字'}`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm">今日暂无提醒</p>
        )}
      </section>

      {/* 快速操作 */}
      <section className="grid grid-cols-2 gap-2.5">
        {[
          { t: '上报症状', d: '体温 / 不适', i: Thermometer, k: 'symptoms' as TabKey, tone: 'bg-rose-50 text-rose-600' },
          { t: '问语音助手', d: '居家护理疑问', i: Mic, k: 'ai' as TabKey, tone: 'bg-brand-50 text-brand-700' },
          { t: '复查安排', d: `${pendingFollow.length} 项待办`, i: CalendarClock, k: 'home' as TabKey, tone: 'bg-amber-50 text-amber-600' },
          { t: '联系医护', d: '一键转人工', i: Phone, k: 'ai' as TabKey, tone: 'bg-violet-50 text-violet-600' },
        ].map((a) => {
          const Icon = a.i
          return (
            <button key={a.t} onClick={() => setTab(a.k)} className="card flex items-center gap-2.5 p-3 text-left transition active:scale-[.98]">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', a.tone)}><Icon className="h-4.5 w-4.5" /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-800">{a.t}</span>
                <span className="block truncate text-[10px] text-slate-500">{a.d}</span>
              </span>
            </button>
          )
        })}
      </section>

      {/* 下次随访 */}
      {nextFollow && (
        <section className="card p-3.5">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-amber-500" />下次随访</h2>
            <Badge tone={nextFollow.dueDate === fmtDate(new Date()) ? 'rose' : 'slate'}>{relFuture(`${nextFollow.dueDate}T09:00:00`)}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-amber-50/70 px-3 py-2.5">
            <div className="text-center">
              <p className="text-xl font-bold text-amber-700 tnum">{nextFollow.dueDate.slice(8)}</p>
              <p className="text-[10px] text-amber-600">{nextFollow.dueDate.slice(5, 7)} 月</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{nextFollow.type}</p>
              <p className="text-[11px] text-slate-500">{nextFollow.note ?? '请携带化疗记录单，空腹前往'}</p>
            </div>
          </div>
          {(followups as any[]).length > 1 && (
            <div className="mt-2 space-y-1">
              {(followups as any[]).slice(1, 4).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{f.dueDate} · {f.type}</span>
                  <span className="text-slate-400">{relFuture(`${f.dueDate}T09:00:00`)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 今日提醒清单 */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
          <h2 className="section-title flex items-center gap-1.5"><BellRing className="h-3.5 w-3.5 text-brand-600" />近期提醒（{recentReminders.length}）</h2>
          {openReminders.length > 0 && <Badge tone="amber">{openReminders.length} 条待确认</Badge>}
        </div>
        {recentReminders.length === 0 && <div className="p-3"><Empty title="近期无提醒" hint="系统会按化疗时间轴自动推送" /></div>}
        <div className="divide-y divide-slate-50">
          {recentReminders.slice(0, 6).map((d: ReminderDispatch) => (
            <div key={d.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
              <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', d.status === 'ack' ? 'bg-emerald-400' : 'bg-brand-400')} />
              <button onClick={() => setDetail(d.id)} className="min-w-0 flex-1 text-left">
                <p className={cn('text-[13px] leading-snug', d.status === 'ack' ? 'text-slate-500' : 'font-medium text-slate-800')}>{d.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{d.body}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{d.dueAt.slice(11, 16)} · {d.channel.includes('voice') ? '语音+推送' : '推送'}</p>
              </button>
              <button onClick={() => d.channel.includes('voice') && speakOrPlay(d.body, { rate: settings.rate, offlineSrc: offlineSrcFor(d), useOffline: settings.offlinePack })} className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500" aria-label="播报">
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 老年模式提示 */}
      <section className="card flex items-center gap-2.5 p-3">
        <CircleHelp className="h-4 w-4 shrink-0 text-brand-600" />
        <p className="flex-1 text-[11px] leading-relaxed text-slate-600">
          本页面已默认开启<strong>大字模式</strong>与语音播报，方便老年患者使用。可随时点“语音小助手”用说话方式提问。
        </p>
      </section>
    </>
  )
}

// ---------------- 症状上报 ----------------
function SymptomReportPanel({ pid }: { pid: string }) {
  const state = useApp()
  const patient = patientById(pid)!
  const [selected, setSelected] = useState<string[]>([])
  const [temp, setTemp] = useState('')
  const [extra, setExtra] = useState('')
  const [result, setResult] = useState<null | { grade: number; termId: string; emergency: boolean; adrId?: string }>(null)
  const [listening, setListening] = useState(false)

  const reports = symptomsOf(pid).slice(0, 8)

  const toggle = (k: string) => setSelected((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))

  const submit = () => {
    const t = temp ? Number(temp) : undefined
    const res = submitSymptoms(pid, selected, t, patient.name, 'patient')
    setResult({ grade: res.grade as number, termId: res.termId, emergency: (res as any).emergency, adrId: res.adrId })
    setSelected([])
    setTemp('')
    setExtra('')
    if ((res as any).emergency) {
      speakOrPlay(
        '您上报的症状需要立即处理。请立即联系您的责任护士，或拨打日间化疗中心电话，情况紧急请拨打一百二十或前往急诊。我已同时通知医护。',
        { rate: state.settings.rate, offlineSrc: audioUrl(CLIP.emergency), useOffline: state.settings.offlinePack },
      )
    }
  }

  const useVoice = () => {
    if (listening) { stopListen(); setListening(false); return }
    setListening(true)
    listen({
      onPartial: () => {},
      onFinal: (text) => {
        setListening(false)
        const map: { kw: string[]; key: string }[] = [
          { kw: ['发烧', '发热', '体温', '烧'], key: 'fever' },
          { kw: ['恶心', '想吐'], key: 'nausea' },
          { kw: ['呕吐', '吐了'], key: 'vomit' },
          { kw: ['腹泻', '拉肚子'], key: 'diarrhea' },
          { kw: ['乏力', '没劲', '累'], key: 'fatigue' },
          { kw: ['口腔', '溃疡', '嘴疼'], key: 'mucositis' },
          { kw: ['出血', '瘀斑', '鼻血', '牙龈'], key: 'bleeding' },
          { kw: ['皮疹', '痒'], key: 'rash' },
          { kw: ['胸闷', '气促', '喘'], key: 'breath' },
          { kw: ['麻木', '手麻', '脚麻'], key: 'neuropathy' },
        ]
        const hit = map.filter((m) => m.kw.some((k) => text.includes(k))).map((m) => m.key)
        if (hit.length) setSelected((p) => [...new Set([...p, ...hit])])
        setExtra(text)
      },
      onError: (msg) => { setListening(false); setExtra(msg) },
    })
  }

  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">居家症状自助上报</h2>
          <Badge tone="brand">CTCAE 自动初筛</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">请如实选择今天出现的症状，系统会按 CTCAE 标准初步分级，高危症状将立即通知医护。</p>

        <button onClick={useVoice} className={cn('mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition elder-btn',
          listening ? 'bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-700')}>
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? '正在听… 请说出您的症状' : '不方便点选？说一句也行'}
        </button>

        <div className="mt-3">
          <p className="label mb-1.5">今天有什么不舒服（可多选）</p>
          <div className="grid grid-cols-3 gap-2">
            {SYMPTOM_OPTIONS.map((s) => (
              <button key={s.key} onClick={() => toggle(s.key)}
                className={cn('flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[12px] transition elder-btn',
                  selected.includes(s.key) ? 'border-rose-300 bg-rose-50 font-semibold text-rose-700' : 'border-slate-200 bg-white text-slate-600')}>
                <span className="text-lg leading-none">{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">体温（℃）</span>
            <input className="input mt-1 text-base" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="如 37.5" />
          </label>
          <label className="block">
            <span className="label">其它补充</span>
            <input className="input mt-1" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="如已呕吐 2 次" />
          </label>
        </div>

        <button className="btn-primary mt-3 w-full py-3 text-base elder-btn" disabled={selected.length === 0 && !temp} onClick={submit}>
          <Send className="h-4 w-4" /> 提交上报
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          提示：发热 ≥38.3℃、出血不止、胸闷气促属于高危症状，提交后会立即推送医护并语音提示就医。
        </p>
      </section>

      {/* 高危症状识别要点 */}
      <section className="card p-3.5">
        <h3 className="section-title mb-2 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-rose-500" />红色清单：出现以下情况请立即就医</h3>
        <div className="space-y-1.5">
          {EMERGENCY_SIGNS.slice(0, 6).map((e) => (
            <div key={e.key} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />{e.label}
            </div>
          ))}
        </div>
      </section>

      {/* 上报记录 */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-3.5 py-2.5"><h3 className="section-title">我的上报记录</h3></div>
        {reports.length === 0 && <div className="p-3"><Empty title="暂无记录" /></div>}
        <div className="divide-y divide-slate-50">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3.5 py-2.5">
              <div>
                <p className="text-xs text-slate-700">{r.symptoms.map((k) => SYMPTOM_OPTIONS.find((s) => s.key === k)?.label ?? k).join('、')}{r.temp ? ` · ${r.temp}℃` : ''}</p>
                <p className="text-[10px] text-slate-400">{relTime(r.createdAt)}{r.adrId ? ' · 已通知医护' : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                {r.escalated && <Badge tone="rose">高危</Badge>}
                <GradeBadge grade={r.grade} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 结果 */}
      <Modal open={!!result} onClose={() => setResult(null)} title={result?.emergency ? '⚠ 请立即联系医护' : '上报成功'} width="max-w-md"
        footer={<button className="btn-primary w-full" onClick={() => setResult(null)}>我知道了</button>}>
        {result && (
          <div className="space-y-3">
            {(() => {
              const t = CTCAE_TERMS.find((x) => x.id === result.termId)
              return (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <GradeBadge grade={result.grade as number} />
                    {result.emergency ? <Badge tone="rose"><ShieldAlert className="h-3 w-3" />触发高危预警</Badge> : <Badge tone="emerald">已同步医护</Badge>}
                  </div>
                  {t && <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-800">CTCAE 对照（{t.term} {result.grade} 级）：{termSummary(t, result.grade as any)}</p>}
                  <p className="text-xs leading-relaxed text-slate-600">
                    {result.emergency
                      ? '您描述的症状属于高危信号，系统已立即通知您的责任护士。请现在：① 联系医护或拨打日间化疗中心电话 010-8888 2046；② 情况紧急请拨打 120 或前往急诊；③ 携带化疗记录单与化验单。'
                      : '系统已记录您的上报并同步医护。请继续按宣教要求观察，如症状加重或出现发热，请再次上报或直接联系医护。'}
                  </p>
                  {result.adrId && <p className="text-[11px] text-slate-400">已自动生成不良反应事件并推送处置 SOP，医护会主动联系您。</p>}
                  {result.emergency && (
                    <div className="flex gap-2">
                      <a href="tel:120" className="btn-danger flex-1"><Phone className="h-4 w-4" />拨打 120</a>
                      <a href="tel:01088882046" className="btn-ghost flex-1"><Phone className="h-4 w-4" />科室电话</a>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ---------------- AI 语音助手 ----------------
function AiAssistant({ pid, patientName }: { pid: string; patientName: string }) {
  const state = useApp()
  const patient = patientById(pid)!
  const chats = chatsOf(pid)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [voiceReply, setVoiceReply] = useState(true)
  const support = useMemo(() => voiceSupport(), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.chats.length])

  const ask = useCallback((q: string) => {
    if (!q.trim()) return
    const res = askAi(pid, q, patientName)
    setInput('')
    setPartial('')
    if (voiceReply && support.tts) {
      speak(res.answer.replace(/\n/g, '。'), { rate: state.settings.rate })
    }
  }, [pid, patientName, voiceReply, support.tts, state.settings.rate])

  const startVoice = () => {
    if (listening) { stopListen(); setListening(false); return }
    stopSpeak()
    setListening(true)
    setPartial('')
    listen({
      onPartial: (t) => setPartial(t),
      onFinal: (t) => { setListening(false); setPartial(''); ask(t) },
      onError: (m) => { setListening(false); setPartial(m) },
    })
  }

  const quickQuestions = ['化疗后发烧了怎么办？', '化疗后能吃什么？', '牙龈出血怎么办？', '血常规白细胞低要紧吗？', '化疗后多久复查？', '手脚麻木正常吗？']

  return (
    <div className="space-y-3">
      {/* 语音交互区 */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-brand-100"><Bot className="h-3.5 w-3.5" />AI 语音小助手（专科知识库）</div>
          <button onClick={() => setVoiceReply((v) => !v)} className="rounded-full bg-white/15 px-2 py-1 text-[10px] ring-1 ring-white/20">
            {voiceReply ? '🔊 语音回复开' : '🔇 仅文字'}
          </button>
        </div>
        <div className="mt-3 flex flex-col items-center">
          <button onClick={startVoice} className={cn('flex h-20 w-20 items-center justify-center rounded-full transition',
            listening ? 'bg-rose-400/30 ring-4 ring-rose-300/40 animate-pulse' : 'bg-white/15 ring-2 ring-white/25 hover:bg-white/25')}>
            {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="mt-2 text-xs text-brand-100">{listening ? '正在聆听，请说普通话…' : '点击话筒说出您的问题'}</p>
          {partial && <p className="mt-1 text-center text-[11px] text-brand-200">“{partial}”</p>}
          {!support.stt && <p className="mt-1 text-center text-[10px] text-amber-200">当前浏览器不支持语音识别，请使用下方文字输入或 Chrome 浏览器</p>}
        </div>
        <div className="mt-3 flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="也可以直接打字提问…"
            className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-brand-200/60 outline-none ring-1 ring-white/15 focus:ring-white/30"
          />
          <button onClick={() => ask(input)} className="rounded-xl bg-white px-3 py-2 text-brand-800"><Send className="h-4 w-4" /></button>
        </div>
      </section>

      {/* 快捷提问 */}
      <section className="card p-3">
        <p className="label mb-1.5">您可能想问</p>
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600 hover:bg-brand-50 hover:text-brand-700">{q}</button>
          ))}
        </div>
      </section>

      {/* 对话记录 */}
      <section className="space-y-2.5">
        {chats.length === 0 && <div className="card p-4"><Empty title="还没有对话记录" hint="点击话筒或上方快捷问题开始" /></div>}
        {chats.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-[13px] leading-relaxed text-white">
                {c.question}
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Bot className="h-3.5 w-3.5" /></div>
              <div className="min-w-0 flex-1">
                <div className="max-w-full rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 shadow-card">
                  <p className="whitespace-pre-wrap">{c.answer}</p>
                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-1.5">
                    <Badge tone={c.needsHuman ? 'amber' : 'brand'}>{c.intent}</Badge>
                    <button className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-brand-600"
                      onClick={() => speak(c.answer.replace(/\n/g, '。'), { rate: state.settings.rate })}>
                      <Volume2 className="h-3 w-3" /> 朗读
                    </button>
                    {c.escalated ? (
                      <Badge tone="emerald">已转人工</Badge>
                    ) : (
                      <button className="flex items-center gap-1 text-[10px] text-amber-600 hover:underline" onClick={() => escalateChat(c.id, patient.name)}>
                        <Phone className="h-3 w-3" /> 转医护
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
        <Stethoscope className="mr-1 inline h-3 w-3" />
        AI 仅提供专科宣教指引与风险分流，<strong>不替代执业医师诊疗</strong>。涉及用药调整、方案变更、病情预后等问题将强制转医护人工接诊；急症将引导立即拨打 120 或前往急诊。
      </p>
    </div>
  )
}

// ---------------- 宣教 ----------------
function EducationPanel({ pid, risk, phase }: { pid: string; risk: 'low' | 'mid' | 'high'; phase: 'pre' | 'during' | 'post' }) {
  const state = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pre' | 'during' | 'post'>('all')

  const items = state.education
    .filter((e) => e.audience === 'all' || e.audience.includes(risk))
    .filter((e) => filter === 'all' || e.phase === filter)

  const current = state.education.find((e) => e.id === open)

  return (
    <div className="space-y-3">
      <section className="card p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">我的宣教</h2>
          <Badge tone="brand">按风险与阶段精准推送</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          以下内容由肿瘤科专科医护审核入库，按您的风险等级（{risk === 'high' ? '高危' : risk === 'mid' ? '中危' : '低危'}）与化疗阶段（{phase === 'pre' ? '化疗前' : phase === 'during' ? '化疗中' : '化疗后'}）精准推送。
        </p>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
          {[{ k: 'all', l: '全部' }, { k: 'pre', l: '化疗前' }, { k: 'during', l: '化疗中' }, { k: 'post', l: '化疗后' }].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k as any)}
              className={cn('shrink-0 rounded-full px-3 py-1 text-[11px]', filter === f.k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{f.l}</button>
          ))}
        </div>
      </section>

      <div className="space-y-2">
        {items.map((e) => (
          <button key={e.id} onClick={() => setOpen(e.id)} className="card flex w-full items-start gap-3 p-3.5 text-left">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', e.form.includes('语音') ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>
              {e.form.includes('语音') ? <Volume2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Badge tone={e.phase === 'pre' ? 'violet' : e.phase === 'during' ? 'amber' : 'emerald'}>{e.phase === 'pre' ? '化疗前' : e.phase === 'during' ? '化疗中' : '化疗后'}</Badge>
                <span className="text-[10px] text-slate-400">{e.form}</span>
              </div>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-800">{e.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{e.body.slice(0, 80)}…</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
          </button>
        ))}
        {items.length === 0 && <Empty title="暂无匹配的宣教内容" />}
      </div>

      <Modal open={!!current} onClose={() => setOpen(null)} title={current?.title ?? ''} width="max-w-md"
        footer={current ? (
          <div className="flex gap-2">
            <button className="btn-soft flex-1" onClick={() => speakOrPlay(`${current.title}。${current.body}`, { rate: state.settings.rate, offlineSrc: EDUCATION_AUDIO[current.id] ? audioUrl(EDUCATION_AUDIO[current.id]) : undefined, useOffline: state.settings.offlinePack })}>
              <Volume2 className="h-4 w-4" /> 语音朗读全文
            </button>
            <button className="btn-primary flex-1" onClick={() => setOpen(null)}>我已阅读</button>
          </div>
        ) : null}>
        {current && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              <Badge tone={current.phase === 'pre' ? 'violet' : current.phase === 'during' ? 'amber' : 'emerald'}>{current.phase === 'pre' ? '化疗前' : current.phase === 'during' ? '化疗中' : '化疗后'}</Badge>
              <Badge tone="slate">{current.form}</Badge>
              <Badge tone="slate">{current.version}</Badge>
            </div>
            <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700">{current.body}</div>
            <div>
              <p className="text-[11px] font-semibold text-brand-700">要点回顾</p>
              <div className="mt-1 space-y-1">
                {current.keyPoints.map((k) => (
                  <div key={k} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-brand-500" />{k}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400">审核：{current.approvedBy} · {current.approvedAt}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ---------------- 我的 ----------------
function MinePanel({ pid, elder, setElder }: { pid: string; elder: boolean; setElder: (v: boolean) => void }) {
  const state = useApp()
  const patient = patientById(pid)!
  const [playingDemo, setPlayingDemo] = useState(false)
  const settings = state.settings

  return (
    <div className="space-y-3">
      <section className="card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800">{patient.name.slice(0, 1)}</div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-slate-900">{patient.name}</p>
              <RiskBadge level={patient.risk} />
            </div>
            <p className="text-[11px] text-slate-500">{patient.gender === 'F' ? '女' : '男'} · {patient.age} 岁 · {patient.cycle}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{patient.regimen}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-slate-50 px-2.5 py-2"><span className="text-slate-400">主管医生</span><p className="font-medium text-slate-700">{patient.attending}</p></div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-2"><span className="text-slate-400">责任护士</span><p className="font-medium text-slate-700">{patient.primaryNurse}</p></div>
        </div>
        <a href="tel:01088882046" className="btn-primary mt-3 w-full"><Phone className="h-4 w-4" />一键联系日间化疗中心</a>
      </section>

      {/* 语音设置 */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5"><h2 className="section-title">语音与提醒设置</h2></div>
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium text-slate-700">AI 语音播报</p><p className="text-[10px] text-slate-400">提醒与宣教自动读给您听</p></div>
            <button onClick={() => saveSettings({ voiceEnabled: !settings.voiceEnabled }, patient.name, 'patient')}
              className={cn('relative h-6 w-11 rounded-full transition', settings.voiceEnabled ? 'bg-brand-500' : 'bg-slate-300')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', settings.voiceEnabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-700">语速</p>
            <div className="mt-1 flex gap-1.5">
              {RATE_LABELS.map((r) => (
                <button key={r.value} onClick={() => saveSettings({ rate: r.value }, patient.name, 'patient')}
                  className={cn('flex-1 rounded-lg py-1.5 text-xs', settings.rate === r.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{r.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">免打扰开始</span>
              <input type="time" className="input mt-1" value={settings.quietStart} onChange={(e) => saveSettings({ quietStart: e.target.value }, patient.name, 'patient')} />
            </label>
            <label className="block"><span className="label">免打扰结束</span>
              <input type="time" className="input mt-1" value={settings.quietEnd} onChange={(e) => saveSettings({ quietEnd: e.target.value }, patient.name, 'patient')} />
            </label>
          </div>
          <p className="text-[10px] text-slate-400">免打扰时段（{settings.quietStart} - {settings.quietEnd}）内语音自动静音，仅保留文字推送。</p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <div><p className="text-xs font-medium text-slate-700">大字模式</p><p className="text-[10px] text-slate-400">适合老年患者，字号与按钮加大</p></div>
            <button onClick={() => setElder(!elder)} className={cn('relative h-6 w-11 rounded-full transition', elder ? 'bg-brand-500' : 'bg-slate-300')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', elder ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          <button className="btn-soft w-full" onClick={async () => {
            setPlayingDemo(true)
            await speakOrPlay('您好，我是您的 AI 语音小助手。请按时测量体温，如有发热、胸闷、牙龈出血，请立即联系医护。您也可以点击话筒直接向我提问。', {
              rate: settings.rate,
              offlineSrc: audioUrl(CLIP.welcome),
              useOffline: settings.offlinePack,
              onEnd: () => setPlayingDemo(false),
            })
          }}>
            <Volume2 className="h-4 w-4" /> {playingDemo ? '正在播报…' : '试听语音效果'}
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="section-title mb-2">隐私与安全</h2>
        <p className="text-[11px] leading-relaxed text-slate-500">
          您的健康信息仅用于照护管理，姓名、住院号、手机号均脱敏展示。AI 小助手仅调用专科医护审核的宣教知识库，
          不会生成用药方案或替代医生判断。
        </p>
      </section>
    </div>
  )
}
