import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Bell, BedDouble, Clock, Droplets, HeartPulse, Mic, MicOff, Phone, Sparkles,
  Volume2, ShieldCheck, CheckCircle2, Waves, AlertTriangle,
} from 'lucide-react'
import { useApp, patientById, dispatchesOf, markVoicePlayed } from '../../store/app'
import { speak, listen, stopListen, stopSpeak, voiceSupport } from '../../voice/engine'
import { askAi } from '../../store/app'
import { Badge, GradeBadge, RiskBadge, cn } from '../../components/ui'
import { fmtTime, relTime } from '../../lib/date'
import { gradeByLab } from '../../lib/ctcae'

// 床头端：大字号、极简交互、语音播报 + 语音提问（病房平板/床头屏场景）
export default function Bedside({ onExit }: { onExit: () => void }) {
  const state = useApp()
  const pid = 'p1'
  const patient = patientById(pid)!
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [now, setNow] = useState(new Date())
  const [spoken, setSpoken] = useState(false)
  const support = useMemo(() => voiceSupport(), [])

  const dispatches = dispatchesOf(pid)
  const upcoming = dispatches
    .filter((d) => d.channel.includes('voice'))
    .sort((a, b) => Math.abs(new Date(a.dueAt).getTime() - Date.now()) - Math.abs(new Date(b.dueAt).getTime() - Date.now()))
    .slice(0, 3)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (dispatches.some((d) => d.channel.includes('voice') && !d.voicePlayedAt)) {
      const timer = setTimeout(() => {
        setSpoken(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [dispatches])

  const vitals = state.vitals.filter((v) => v.patientId === pid)[0]

  const ask = (text: string) => {
    if (!text.trim()) return
    const res = askAi(pid, text, patient.name)
    setAnswer(res.answer)
    setQ('')
    speak(res.answer.replace(/\n/g, '。'), { rate: 0.9 })
  }

  const voiceAsk = () => {
    if (listening) { stopListen(); setListening(false); return }
    stopSpeak()
    setListening(true)
    listen({
      onFinal: (t) => { setListening(false); ask(t) },
      onError: (m) => { setListening(false); setAnswer(m) },
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto max-w-3xl px-5 py-5">
        {/* 顶部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300"><BedDouble className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold">床头端 · 日间化疗照护</p>
              <p className="text-[10px] text-slate-400">{patient.bed} · 责任护士 {patient.primaryNurse}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tnum">{fmtTime(now)}</p>
            <button onClick={onExit} className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">退出</button>
          </div>
        </div>

        {/* 患者信息 + 输液 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold">{patient.name}</p>
              <span className="text-xs text-slate-400">{patient.gender === 'F' ? '女' : '男'} · {patient.age} 岁</span>
              <RiskBadge level={patient.risk} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{patient.regimen}</p>
            <div className="mt-3 rounded-xl bg-brand-500/10 p-3 ring-1 ring-brand-400/20">
              <p className="flex items-center gap-1.5 text-[11px] text-brand-300"><Droplets className="h-3.5 w-3.5" />正在输注</p>
              <p className="mt-0.5 text-sm font-semibold">{patient.infusion?.drug}</p>
              <p className="text-[11px] text-slate-400">{patient.infusion?.dose} · {patient.infusion?.route}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[
                  { l: '泵速', v: `${patient.infusion?.pumpRate}`, u: 'ml/h' },
                  { l: '剩余', v: `${patient.infusion?.remaining}`, u: 'ml' },
                  { l: '预计', v: `${Math.round((patient.infusion?.remaining ?? 0) / (patient.infusion?.pumpRate ?? 1) * 60)}`, u: '分钟' },
                ].map((x) => (
                  <div key={x.l}>
                    <p className="text-[10px] text-slate-400">{x.l}</p>
                    <p className="text-lg font-semibold tnum">{x.v}</p>
                    <p className="text-[10px] text-slate-500">{x.u}</p>
                  </div>
                ))}
              </div>
            </div>
            {patient.alerts.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-500/15 px-2.5 py-1.5 ring-1 ring-rose-400/20">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                <p className="text-[11px] text-rose-200">{patient.alerts[0]}</p>
              </div>
            )}
          </div>

          {/* 生命体征 */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-300"><Activity className="h-3.5 w-3.5" />实时监护</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { l: '体温', v: vitals?.temp, u: '℃', warn: (vitals?.temp ?? 0) >= 38 },
                { l: '心率', v: vitals?.hr, u: 'bpm', warn: (vitals?.hr ?? 0) > 110 },
                { l: '血压', v: vitals ? `${vitals.sbp}/${vitals.dbp}` : undefined, u: 'mmHg', warn: (vitals?.sbp ?? 999) < 90 },
                { l: '血氧', v: vitals?.spo2, u: '%', warn: (vitals?.spo2 ?? 100) < 94 },
              ].map((x) => (
                <div key={x.l} className={cn('rounded-xl bg-black/20 px-3 py-2', x.warn && 'ring-1 ring-rose-400/40')}>
                  <p className="text-[10px] text-slate-400">{x.l}</p>
                  <p className={cn('text-2xl font-semibold tnum', x.warn ? 'text-rose-300' : 'text-white')}>{x.v ?? '—'}</p>
                  <p className="text-[10px] text-slate-500">{x.u}</p>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">最近同步 {vitals ? relTime(vitals.at) : '—'} · 异常时自动弹窗并向护士站推送</p>
          </div>
        </div>

        {/* 语音播报卡 */}
        <div className="mt-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-brand-100"><Sparkles className="h-3.5 w-3.5" />输注期间语音播报</p>
            {spoken && <Badge tone="emerald">已自动播报</Badge>}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white">
            {upcoming[0]?.body ?? '输注期间请注意穿刺部位有无疼痛、肿胀、发红，出现胸闷、气促、皮肤瘙痒请立即按呼叫铃。'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-brand-800"
              onClick={() => {
                const text = upcoming[0]?.body ?? '输注期间请注意穿刺部位有无疼痛、肿胀、发红。出现胸闷、气促、皮肤瘙痒，请立即按呼叫铃。'
                speak(text, { rate: 0.9 })
                if (upcoming[0]) markVoicePlayed(upcoming[0].id)
              }}>
              <Volume2 className="h-4 w-4" /> 播放语音
            </button>
            <button className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[13px] ring-1 ring-white/20"
              onClick={() => setAnswer('已呼叫护士，护士会在 1 分钟内到达床旁。如情况紧急，请直接按床头红色呼叫铃。')}>
              <Bell className="h-4 w-4" /> 呼叫护士
            </button>
          </div>
        </div>

        {/* 语音提问 */}
        <div className="mt-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-[11px] text-slate-400">有疑问？对着屏幕说话，AI 语音助手即时解答基础问题</p>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={voiceAsk} className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition',
              listening ? 'bg-rose-500/30 ring-4 ring-rose-400/30 animate-pulse' : 'bg-brand-500 hover:bg-brand-400')}>
              {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(q)}
              placeholder="也可以打字，或点击话筒说出问题…" className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-3 text-sm text-white placeholder:text-slate-500 outline-none ring-1 ring-white/10 focus:ring-white/25" />
            <button onClick={() => ask(q)} className="rounded-xl bg-white px-3 py-3 text-slate-800"><Phone className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['输注时可以上厕所吗？', '手肿了怎么办？', '有点心慌要紧吗？'].map((k) => (
              <button key={k} onClick={() => ask(k)} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/20">{k}</button>
            ))}
          </div>
          {answer && (
            <div className="mt-3 rounded-xl bg-white/10 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] text-brand-200"><Waves className="h-3 w-3" />AI 应答</p>
                <button onClick={() => speak(answer.replace(/\n/g, '。'), { rate: 0.9 })} className="text-[10px] text-slate-300 hover:text-white">再读一遍</button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-100">{answer}</p>
            </div>
          )}
          {!support.stt && <p className="mt-1.5 text-[10px] text-amber-300">当前浏览器不支持语音识别，请使用打字提问（建议 Chrome / Edge）</p>}
        </div>

        {/* 注意事项 */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { t: '穿刺部位', d: '疼痛、肿胀、发红 → 立即按铃' },
            { t: '呼吸系统', d: '胸闷、气促、喉头发紧 → 立即按铃' },
            { t: '皮肤反应', d: '瘙痒、皮疹、颜面潮红 → 立即按铃' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold text-brand-300">{x.t}</p>
              <p className="mt-0.5 text-[11px] text-slate-300">{x.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="h-3 w-3" />AI 仅提供宣教指引，急症请按呼叫铃或联系医护
        </p>
      </div>
    </div>
  )
}
