import React, { useMemo, useState } from 'react'
import {
  Activity, ArrowRight, CheckCircle2, CircleDot, Download, Filter, GitBranch, HeartPulse,
  Search, ShieldAlert, Stethoscope, Timer, Users,
} from 'lucide-react'
import { useApp, advanceAdr, reportAdr, patientById, roleText } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, GradeBadge, Modal, RiskBadge, Stat, Tabs, cn } from '../../components/ui'
import { CTCAE_TERMS } from '../../data/ctcae'
import { SOPS, SopById } from '../../data/sop'
import { downloadCsv } from '../../lib/qc'
import { relTime } from '../../lib/date'
import { termSummary } from '../../lib/ctcae'
import type { AdrStatus, Severity } from '../../types'

const STATUS_META: Record<AdrStatus, { label: string; tone: string; step: number }> = {
  reported: { label: '已上报', tone: 'rose', step: 0 },
  triaged: { label: '已分级', tone: 'amber', step: 1 },
  handling: { label: '处置中', tone: 'orange', step: 2 },
  rechecking: { label: '复评中', tone: 'violet', step: 3 },
  closed: { label: '已闭环', tone: 'emerald', step: 4 },
}

const FLOW = ['上报', '分级研判', 'SOP 处置', '复评追踪', '风险解除闭环']

export default function Adr({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [tab, setTab] = useState<'open' | 'closed' | 'all'>('open')
  const [detail, setDetail] = useState<string | null>(null)
  const [sopOpen, setSopOpen] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [selTerm, setSelTerm] = useState('anc')
  const [selGrade, setSelGrade] = useState<Severity>(2)
  const [selPatient, setSelPatient] = useState(state.patients[0].id)

  const adrs = useMemo(() => {
    if (tab === 'open') return state.adrs.filter((a) => a.status !== 'closed')
    if (tab === 'closed') return state.adrs.filter((a) => a.status === 'closed')
    return state.adrs
  }, [state.adrs, tab])

  const current = state.adrs.find((a) => a.id === detail)
  const currentSop = current ? SopById(current.sopId) : null
  const term = current ? CTCAE_TERMS.find((t) => t.id === current.termId) : null

  const stats = {
    open: state.adrs.filter((a) => a.status !== 'closed').length,
    high: state.adrs.filter((a) => a.grade >= 3 && a.status !== 'closed').length,
    closed: state.adrs.filter((a) => a.status === 'closed').length,
    delayed: state.adrs.filter((a) => a.delayedDetection).length,
  }

  const createAdr = () => {
    const t = CTCAE_TERMS.find((x) => x.id === selTerm)!
    const p = patientById(selPatient)!
    reportAdr({
      patientId: selPatient,
      termId: selTerm,
      term: t.term,
      grade: selGrade,
      symptoms: ['手工上报'],
      source: 'nurse',
      actor: state.userName || roleText(role),
      role,
      detail: `手工创建 ADR：${t.term} ${selGrade} 级，${termSummary(t, selGrade)}`,
    })
    setNewOpen(false)
  }

  return (
    <AppShell
      active="adr"
      onNavigate={onNavigate}
      title="不良反应闭环处置"
      subtitle="SOP 库 · 分级预警 · 处置引导 · 追踪闭环 · HFMEA 可追溯"
      actions={
        <>
          <button className="btn-ghost" onClick={() => downloadCsv('ADR不良反应追踪', state.adrs.map((a) => ({
            患者: patientById(a.patientId)?.name ?? a.patientId,
            不良反应: a.term,
            分级: a.grade,
            来源: a.source === 'patient' ? '患者上报' : a.source === 'lis' ? 'LIS 自动研判' : a.source === 'device' ? '设备预警' : '护士上报',
            状态: STATUS_META[a.status].label,
            处置SOP: a.sopId,
            上报时间: a.createdAt.slice(0, 16).replace('T', ' '),
            闭环时间: a.closedAt ? a.closedAt.slice(0, 16).replace('T', ' ') : '—',
            延迟发现: a.delayedDetection ? '是' : '否',
          })))}><Download className="h-4 w-4" />导出追踪台账</button>
          {(role === 'nurse' || role === 'headnurse') && <button className="btn-primary" onClick={() => setNewOpen(true)}><HeartPulse className="h-4 w-4" />新建 ADR</button>}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="未闭环 ADR" value={stats.open} unit="例" tone="rose" hint="需持续追踪至风险解除" icon={<ShieldAlert className="h-4 w-4" />} />
          <Stat label="3-4 级高危" value={stats.high} unit="例" tone="rose" hint="重点监控与升级处置" icon={<Activity className="h-4 w-4" />} />
          <Stat label="已闭环" value={stats.closed} unit="例" tone="emerald" hint="形成完整追溯链" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Stat label="延迟发现" value={stats.delayed} unit="例" tone="amber" hint="HFMEA 重点改进项" icon={<Timer className="h-4 w-4" />} />
        </div>

        {/* 流程示意 */}
        <section className="card p-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {FLOW.map((f, i) => (
              <React.Fragment key={f}>
                <div className="flex shrink-0 items-center gap-1.5 rounded-[2px] bg-slate-50 px-2.5 py-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">{i + 1}</span>
                  <span className="text-[11px] font-medium text-slate-700">{f}</span>
                </div>
                {i < FLOW.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />}
              </React.Fragment>
            ))}
            <span className="ml-auto hidden shrink-0 text-[10px] text-slate-400 sm:block">全流程自动留痕 · 可导出 HFMEA / 品管圈</span>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">ADR 事件列表</h2>
            <Tabs value={tab} onChange={setTab} tabs={[
              { key: 'open', label: '未闭环', count: stats.open },
              { key: 'closed', label: '已闭环', count: stats.closed },
              { key: 'all', label: '全部', count: state.adrs.length },
            ]} />
          </div>
          {adrs.length === 0 && <div className="p-4"><Empty title="暂无 ADR 事件" hint="可手工创建或等待 LIS 自动研判推送" /></div>}
          <div className="divide-y divide-slate-100">
            {adrs.map((a) => {
              const p = patientById(a.patientId)
              const meta = STATUS_META[a.status]
              return (
                <button key={a.id} onClick={() => setDetail(a.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px]',
                    a.grade >= 3 ? 'bg-rose-100 text-rose-600' : a.grade === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-slate-900">{a.term}</span>
                      <GradeBadge grade={a.grade} />
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {a.delayedDetection && <Badge tone="amber">延迟发现</Badge>}
                      <span className="text-[11px] text-slate-400">{p?.name}</span>
                      {p && <RiskBadge level={p.risk} />}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {a.symptoms.join('、')} · 来源 {a.source === 'patient' ? '患者上报' : a.source === 'lis' ? 'LIS 自动' : a.source === 'device' ? '设备预警' : '护士上报'} · {relTime(a.createdAt)}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {FLOW.map((f, i) => (
                        <React.Fragment key={f}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', i <= meta.step ? 'bg-brand-500' : 'bg-slate-200')} />
                          {i < FLOW.length - 1 && <span className={cn('h-px w-4', i < meta.step ? 'bg-brand-300' : 'bg-slate-200')} />}
                        </React.Fragment>
                      ))}
                      <span className="ml-1 text-[10px] text-slate-400">{a.timeline.length} 条处置记录</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{a.sopId}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* SOP 库 */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="section-title flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-brand-600" />标准化处置 SOP 库（内置 {SOPS.length} 条）</h2>
            <Badge tone="slate">肿瘤科专科审核版</Badge>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOPS.map((s) => (
              <button key={s.id} onClick={() => setSopOpen(s.id)} className="rounded-[2px] border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <Badge tone={s.category === '过敏反应' ? 'rose' : s.category === '骨髓抑制' ? 'amber' : s.category === '感染' ? 'violet' : 'slate'}>{s.category}</Badge>
                  {s.grade > 0 && <Badge tone="slate">{s.grade} 级</Badge>}
                </div>
                <p className="mt-1 text-xs font-medium leading-snug text-slate-800">{s.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{s.trigger}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ADR 详情 */}
      <Modal open={!!current} onClose={() => setDetail(null)} title="ADR 处置追踪" width="max-w-3xl">
        {current && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-[2px] bg-slate-50 px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-900">{current.term}</span>
              <GradeBadge grade={current.grade} />
              <Badge tone={STATUS_META[current.status].tone}>{STATUS_META[current.status].label}</Badge>
              <span className="text-[11px] text-slate-500">{patientById(current.patientId)?.name} · {patientById(current.patientId)?.regimen}</span>
              <span className="ml-auto text-[10px] text-slate-400">{relTime(current.createdAt)}</span>
            </div>

            {term && (
              <div className="rounded-[2px] border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-violet-800">CTCAE 分级对照</p>
                <p className="mt-0.5 text-xs text-violet-900">{current.grade} 级：{termSummary(term, current.grade)}</p>
                <p className="mt-1 text-[10px] text-violet-700">{term.note}</p>
              </div>
            )}

            {currentSop && (
              <div>
                <p className="section-title mb-1.5 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-brand-600" />自动推送处置 SOP：{currentSop.title}</p>
                <div className="space-y-2 rounded-[2px] border border-slate-200 p-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">处置步骤</p>
                    <ol className="mt-1 space-y-1">
                      {currentSop.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">{i + 1}</span>{s}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">医嘱参考</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {currentSop.orders.map((o) => <Badge key={o} tone="sky">{o}</Badge>)}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded bg-slate-50 p-2">
                      <p className="text-[10px] font-semibold text-slate-500">复查要求</p>
                      <p className="text-[11px] text-slate-600">{currentSop.recheck}</p>
                    </div>
                    <div className="rounded bg-rose-50 p-2">
                      <p className="text-[10px] font-semibold text-rose-600">升级条件</p>
                      <p className="text-[11px] text-rose-700">{currentSop.escalate}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">依据：{currentSop.source}</p>
                </div>
              </div>
            )}

            <div>
              <p className="section-title mb-1.5 flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-slate-400" />处置追踪时间线（完整追溯链）</p>
              <div className="relative space-y-3 border-l-2 border-slate-100 pl-4">
                {current.timeline.map((l, i) => (
                  <div key={i} className="relative">
                    <span className={cn('absolute -left-[21px] top-1 h-2 w-2 rounded-full', i === current.timeline.length - 1 ? 'bg-brand-500' : 'bg-slate-300')} />
                    <p className="text-[11px] text-slate-400">{l.at.slice(0, 16).replace('T', ' ')} · {l.author}（{l.role === 'system' ? '系统' : l.role === 'patient' ? '患者' : roleText(l.role)}）· {l.action}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{l.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {current.status !== 'closed' && (
              <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-100 bg-white pt-3">
                {(role === 'nurse' || role === 'doctor' || role === 'headnurse') && (
                  <>
                    {current.status === 'reported' && (
                      <button className="btn-soft flex-1" onClick={() => advanceAdr(current.id, '处置', `按 SOP「${currentSop?.title}」执行处置，医嘱已核对`, state.userName || roleText(role), role)}>
                        确认分级并开始处置
                      </button>
                    )}
                    {current.status !== 'reported' && current.status !== 'rechecking' && (
                      <button className="btn-soft flex-1" onClick={() => advanceAdr(current.id, '复评', '处置后复评：症状缓解，生命体征平稳，进入复评观察期', state.userName || roleText(role), role)}>
                        处置完成，提交复评
                      </button>
                    )}
                    {(current.status === 'rechecking' || current.status === 'handling' || current.status === 'triaged') && (
                      <button className="btn-primary flex-1" onClick={() => advanceAdr(current.id, '闭环', '复评结果达标，风险解除，ADR 事件闭环归档', state.userName || roleText(role), role)}>
                        风险解除 · 闭环
                      </button>
                    )}
                  </>
                )}
               {role === 'qc' && <p className="text-[11px] text-slate-400">质控员仅可查看与导出，无处置权限</p>}
              </div>
            )}
            {current.status === 'closed' && (
              <div className="rounded-[2px] bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />该事件已于 {current.closedAt?.slice(0, 16).replace('T', ' ')} 闭环，共 {current.timeline.length} 条处置记录，已进入 HFMEA 分析数据集。
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* SOP 详情 */}
      <Modal open={!!sopOpen} onClose={() => setSopOpen(null)} title={SopById(sopOpen ?? '')?.title ?? ''} width="max-w-2xl">
        {(() => {
          const s = SopById(sopOpen ?? '')
          if (!s) return null
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="brand">{s.category}</Badge>
                {s.grade > 0 && <Badge tone="slate">适用 {s.grade} 级</Badge>}
                <Badge tone="slate">{s.id}</Badge>
              </div>
              <div className="rounded-[2px] bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500">触发条件</p>
                <p className="text-xs text-slate-700">{s.trigger}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">处置步骤</p>
                <ol className="mt-1.5 space-y-1.5">
                  {s.steps.map((x, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">{i + 1}</span>{x}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[2px] bg-sky-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-sky-700">医嘱参考</p>
                  <ul className="mt-1 space-y-0.5">{s.orders.map((o) => <li key={o} className="text-[11px] text-sky-800">· {o}</li>)}</ul>
                </div>
                <div className="rounded-[2px] bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-emerald-700">复查要求</p>
                  <p className="text-[11px] text-emerald-800">{s.recheck}</p>
                </div>
                <div className="rounded-[2px] bg-rose-50 px-3 py-2 sm:col-span-2">
                  <p className="text-[11px] font-semibold text-rose-700">升级条件</p>
                  <p className="text-[11px] text-rose-800">{s.escalate}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">依据：{s.source}</p>
            </div>
          )
        })()}
      </Modal>

      {/* 新建 ADR */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="手工创建 ADR 事件" width="max-w-xl"
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setNewOpen(false)}>取消</button><button className="btn-primary" onClick={createAdr}>创建并推送 SOP</button></div>}>
        <div className="space-y-3">
          <label className="block">
            <span className="label">患者</span>
            <select className="input mt-1" value={selPatient} onChange={(e) => setSelPatient(e.target.value)}>
              {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.regimen}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">不良反应类型（CTCAE）</span>
            <select className="input mt-1" value={selTerm} onChange={(e) => setSelTerm(e.target.value)}>
              {CTCAE_TERMS.map((t) => <option key={t.id} value={t.id}>{t.term}（{t.category}）</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">分级</span>
            <select className="input mt-1" value={selGrade} onChange={(e) => setSelGrade(Number(e.target.value) as Severity)}>
              <option value={1}>1 级（轻度）</option>
              <option value={2}>2 级（中度，需干预）</option>
              <option value={3}>3 级（严重）</option>
              <option value={4}>4 级（危及生命）</option>
            </select>
          </label>
          {(() => {
            const t = CTCAE_TERMS.find((x) => x.id === selTerm)
            return t ? <div className="rounded-[2px] bg-violet-50 px-3 py-2 text-[11px] text-violet-800">{selGrade} 级标准：{termSummary(t, selGrade)}</div> : null
          })()}
        </div>
      </Modal>
    </AppShell>
  )
}
