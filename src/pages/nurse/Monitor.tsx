import React, { useMemo, useState } from 'react'
import {
  Activity, AlarmClock, BellRing, CheckCircle2, Droplets, HeartPulse, Radio, Siren,
  Thermometer, ShieldAlert, Waves, Timer, Zap, Clock, Bed,
} from 'lucide-react'
import { useApp, patientById, ingestVital, reportAdr, roleText, setActivePatient } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, GradeBadge, Modal, RiskBadge, cn } from '../../components/ui'
import { fmtTime, relTime } from '../../lib/date'

const ROUND_NODES: { key: string; label: string; minutes: number }[] = [
  { key: 'r15', label: '输注开始 15 分钟', minutes: 15 },
  { key: 'r30', label: '开始后 30 分钟', minutes: 30 },
  { key: 'r60', label: '开始后 60 分钟', minutes: 60 },
  { key: 'r90', label: '开始后 90 分钟', minutes: 90 },
  { key: 'rend', label: '输注结束 30 分钟', minutes: 999 },
]

const QUICK_SYMPTOMS = [
  { key: 'rash', label: '皮疹/瘙痒', term: '过敏反应 / 输液反应', termId: 'allergy', grade: 1 },
  { key: 'chest', label: '胸闷/气促', term: '过敏反应 / 输液反应', termId: 'allergy', grade: 2 },
  { key: 'heart', label: '心慌', term: '过敏反应 / 输液反应', termId: 'allergy', grade: 1 },
  { key: 'extrav', label: '穿刺点肿胀', term: '化疗药物外渗', termId: 'extrav', grade: 2 },
  { key: 'nausea', label: '恶心呕吐', term: '恶心', termId: 'nausea', grade: 1 },
  { key: 'fever', label: '发热', term: '发热', termId: 'fever', grade: 2 },
]

export default function Monitor({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [roundState, setRoundState] = useState<Record<string, string>>({})
  const [alertModal, setAlertModal] = useState<{ title: string; body: string } | null>(null)
  const [reportModal, setReportModal] = useState<string | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [symptomNote, setSymptomNote] = useState('')
  const [tempInput, setTempInput] = useState('')
  const [gradeInput, setGradeInput] = useState<1 | 2 | 3>(1)

  const inPatients = useMemo(
    () => state.patients.filter((p) => p.phase === 'during' || p.phase === 'pre'),
    [state.patients],
  )

  // 巡视提醒：按输液进度推算应打卡节点
  const roundPlan = (p: NonNullable<ReturnType<typeof patientById>>) => {
    const infusion = p.infusion
    if (!infusion) return []
    const start = new Date(infusion.startedAt)
    const endAt = new Date(start.getTime() + (infusion.remaining / (infusion.pumpRate || 1)) * 3_600_000 * 2)
    return ROUND_NODES.map((n) => {
      const due = n.minutes >= 999 ? new Date(endAt.getTime() + 30 * 60_000) : new Date(start.getTime() + n.minutes * 60_000)
      const overdue = !roundState[`${p.id}:${n.key}`] && Date.now() > due.getTime()
      return { ...n, due, overdue, done: roundState[`${p.id}:${n.key}`] }
    })
  }

  const doRound = (p: NonNullable<ReturnType<typeof patientById>>, node: typeof ROUND_NODES[number]) => {
    setRoundState((s) => ({ ...s, [`${p.id}:${node.key}`]: fmtTime(new Date()) }))
  }

  const simulateVital = (patientId: string) => {
    const p = patientById(patientId)
    if (!p) return
    const abnormal = Math.random() > 0.55
    const v = {
      patientId,
      at: new Date().toISOString(),
      hr: abnormal ? 118 : 84,
      sbp: abnormal ? 88 : 118,
      dbp: 68,
      spo2: abnormal ? 92 : 97,
      temp: abnormal ? 38.4 : 36.7,
      pumpRate: p.infusion?.pumpRate ?? 100,
      remaining: p.infusion?.remaining ?? 200,
    }
    const flagged = ingestVital(v)
    if (flagged) {
      setAlertModal({
        title: '生命体征异常预警（模拟监护数据）',
        body: `患者 ${p.name}：体温 ${v.temp}℃ / 心率 ${v.hr} / 血压 ${v.sbp}/${v.dbp} / SpO₂ ${v.spo2}%，已触发床旁弹窗与站内预警，请立即床旁查看并按 SBAR 报告医生。`,
      })
    }
  }

  const submitNurseReport = () => {
    if (!reportModal) return
    const p = patientById(reportModal)!
    const selected = QUICK_SYMPTOMS.filter((s) => symptoms.includes(s.key))
    const worst = selected.reduce((max, s) => Math.max(max, gradeInput), 1)
    const term = selected[0] ?? QUICK_SYMPTOMS[0]
    const targetTerm = selected.reduce((a, b) => (b.grade > a.grade ? b : a), selected[0] ?? QUICK_SYMPTOMS[0])
    reportAdr({
      patientId: p.id,
      termId: targetTerm.termId,
      term: targetTerm.term,
      grade: Math.max(worst, targetTerm.grade) as 1 | 2 | 3,
      symptoms: [...selected.map((s) => s.label), ...(symptomNote ? [symptomNote] : [])],
      source: 'nurse',
      vitals: tempInput ? { temp: Number(tempInput) } : undefined,
      actor: state.userName || '责任护士',
      role,
      detail: `床旁快速上报：${selected.map((s) => s.label).join('、')}${tempInput ? `，体温 ${tempInput}℃` : ''}${symptomNote ? `；${symptomNote}` : ''}`,
    })
    setReportModal(null)
    setSymptoms([])
    setSymptomNote('')
    setTempInput('')
    setGradeInput(1)
  }

  return (
    <AppShell
      active="monitor"
      onNavigate={onNavigate}
      title="化疗中实时监控 · 床旁工作站"
      subtitle={`在输注 ${inPatients.filter((p) => p.phase === 'during').length} 人 · 巡视打卡与监护预警联动`}
      actions={
        <>
          <button className="btn-ghost" onClick={() => setAlertModal({ title: '呼叫帮助', body: '已通知值班护士与医生，预计 1 分钟内到达床旁。' })}>
            <Siren className="h-4 w-4" /> 演示呼叫
          </button>
          <button className="btn-primary" onClick={() => onNavigate('adr')}><HeartPulse className="h-4 w-4" />ADR 闭环</button>
        </>
      }
    >
      {inPatients.length === 0 && <Empty title="当前没有在输注的患者" hint="患者进入化疗中阶段后将出现在此处" />}

      <div className="grid gap-4 xl:grid-cols-2">
        {inPatients.map((p) => {
          const vitals = state.vitals.filter((v) => v.patientId === p.id).slice(0, 1)[0]
          const plan = roundPlan(p)
          const adrs = state.adrs.filter((a) => a.patientId === p.id && a.status !== 'closed')
          const infusion = p.infusion
          const progress = infusion ? Math.max(0, Math.min(100, 100 - (infusion.remaining / (infusion.remaining + 360)) * 100)) : 0
          return (
            <section key={p.id} className="card overflow-hidden">
              <div className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b', p.risk === 'high' ? 'border-rose-100 bg-rose-50/50' : 'border-slate-100 bg-slate-50/50')}>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    {p.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      <RiskBadge level={p.risk} />
                      <Badge tone={p.phase === 'during' ? 'amber' : 'violet'}>{p.phase === 'during' ? '输注中' : '待输注'}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">{p.bed} · {p.cycle} · 责任护士 {p.primaryNurse}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {infusion && (
                    <>
                      {infusion.category === 'vesicant' && <Badge tone="rose"><Droplets className="h-3 w-3" />发泡剂 · 外渗高危</Badge>}
                      {infusion.hypersensitivity >= 2 && <Badge tone="rose"><ShieldAlert className="h-3 w-3" />高致敏</Badge>}
                    </>
                  )}
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => { setActivePatient(p.id) }}>查看档案</button>
                </div>
              </div>

              {/* 输液信息 */}
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1.2fr_1fr]">
                <div>
                  <p className="text-[11px] font-medium text-slate-400">HIS 输液绑定</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{infusion?.drug ?? '—'}</p>
                  <p className="text-[11px] text-slate-500">{infusion?.dose} · {infusion?.route}</p>
                  <p className="mt-1 text-[10px] text-slate-400">医嘱号 {infusion?.hisOrderId} · 预处理 {infusion?.premedication}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>输注进度（模拟泵）</span>
                      <span className="tnum">{infusion?.pumpRate} ml/h · 余 {infusion?.remaining} ml</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                {/* 实时监护 / 生命体征 */}
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Radio className="h-3 w-3 text-emerald-500" />床旁监护 / 输液泵</p>
                    <button className="text-[10px] font-medium text-brand-600 hover:underline" onClick={() => simulateVital(p.id)}>模拟采集</button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
                    {[
                      { k: 'T', v: vitals?.temp ?? '—', u: '℃', warn: (vitals?.temp ?? 0) >= 38 },
                      { k: 'HR', v: vitals?.hr ?? '—', u: 'bpm', warn: (vitals?.hr ?? 0) > 110 },
                      { k: 'BP', v: vitals ? `${vitals.sbp}/${vitals.dbp}` : '—', u: 'mmHg', warn: (vitals?.sbp ?? 999) < 90 },
                      { k: 'SpO₂', v: vitals?.spo2 ?? '—', u: '%', warn: (vitals?.spo2 ?? 100) < 94 },
                    ].map((x) => (
                      <div key={x.k} className={cn('rounded bg-white py-1.5 ring-1', x.warn ? 'ring-rose-200' : 'ring-slate-100')}>
                        <p className="text-[9px] text-slate-400">{x.k}</p>
                        <p className={cn('text-sm font-semibold tnum', x.warn ? 'text-rose-600' : 'text-slate-800')}>{x.v}</p>
                        <p className="text-[9px] text-slate-400">{x.u}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[9px] text-slate-400">最近采集 {vitals ? relTime(vitals.at) : '暂无数据'}</p>
                </div>
              </div>

              {/* 巡视打卡 */}
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><AlarmClock className="h-3 w-3 text-brand-600" />标准化巡视节点（{p.risk === 'high' ? '高危加密：每 30 分钟' : '常规'}）</p>
                  {plan.some((n) => n.overdue) && <Badge tone="rose"><BellRing className="h-3 w-3" />{plan.filter((n) => n.overdue).length} 个节点超时</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => doRound(p, n)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-left text-[11px] transition',
                        n.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : n.overdue ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {n.done ? <CheckCircle2 className="h-3 w-3" /> : n.overdue ? <BellRing className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
                        {n.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] opacity-70">{n.done ?? (n.overdue ? `超时 ${Math.max(1, Math.round((Date.now() - n.due.getTime()) / 60000))} 分钟` : `计划 ${fmtTime(n.due)}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 快速上报 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {adrs.length > 0
                    ? adrs.map((a) => <Badge key={a.id} tone="rose">{a.term} {a.grade} 级 · {a.status === 'closed' ? '已闭环' : '处置中'}</Badge>)
                    : <span className="text-[11px] text-slate-400">本次输注无未闭环不良反应</span>}
                </div>
                <button className="btn-danger !py-1.5 text-xs" onClick={() => setReportModal(p.id)}>
                  <Zap className="h-3.5 w-3.5" /> 床旁快速上报
                </button>
              </div>

              {/* AI 语音播报（床头端） */}
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Waves className="h-3 w-3 text-brand-600" />床头端 AI 语音播报（演示）</p>
                <div className="mt-1.5 rounded-lg bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-brand-900">
                  “现在开始输注，请注意穿刺部位有没有疼痛、肿胀或者发红……出现任何不舒服，请立即按床头呼叫铃。”
                </div>
                <p className="mt-1 text-[10px] text-slate-400">播报内容来自提醒模板库（医护审核），患者端“AI 语音小助手”可提问并获得宣教级应答。</p>
              </div>
            </section>
          )
        })}
      </div>

      {/* 床旁上报弹窗 */}
      <Modal
        open={!!reportModal}
        onClose={() => setReportModal(null)}
        title="床旁快速上报不良反应"
        footer={
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">上报后自动带出对应处置 SOP，并进入追踪闭环</p>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setReportModal(null)}>取消</button>
              <button className="btn-danger" disabled={symptoms.length === 0} onClick={submitNurseReport}>提交上报</button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="label mb-1.5">观察到的症状（可多选）</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_SYMPTOMS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSymptoms((prev) => (prev.includes(s.key) ? prev.filter((x) => x !== s.key) : [...prev, s.key]))}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition',
                    symptoms.includes(s.key) ? 'border-rose-300 bg-rose-50 font-medium text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">体温（℃）</span>
              <input className="input mt-1" value={tempInput} onChange={(e) => setTempInput(e.target.value)} placeholder="如 37.6" inputMode="decimal" />
            </label>
            <label className="block">
              <span className="label">初步分级（CTCAE）</span>
              <select className="input mt-1" value={gradeInput} onChange={(e) => setGradeInput(Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>1 级（轻度，可观察）</option>
                <option value={2}>2 级（需干预，暂缓输注）</option>
                <option value={3}>3 级（严重，立即处置）</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">补充描述</span>
            <textarea className="input mt-1 min-h-[70px]" value={symptomNote} onChange={(e) => setSymptomNote(e.target.value)} placeholder="如：输注 20 分钟出现颜面潮红、胸闷，心率 102，血氧 96%" />
          </label>
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            提交后将自动匹配 SOP：过敏 1/2 级 → 抗过敏处置；3 级及以上 → 休克应急流程。同时推送站内预警并进入 ADR 追踪闭环。
          </div>
        </div>
      </Modal>

      {/* 监护弹窗预警 */}
      <Modal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title ?? ''}
        width="max-w-lg"
        footer={<button className="btn-primary w-full" onClick={() => setAlertModal(null)}>已知悉并床旁查看</button>}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><ShieldAlert className="h-5 w-5" /></div>
          <p className="text-sm leading-relaxed text-slate-700">{alertModal?.body}</p>
        </div>
      </Modal>
    </AppShell>
  )
}
