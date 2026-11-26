import React, { useMemo, useState } from 'react'
import {
  BarChart3, CheckCircle2, Download, FileSpreadsheet, Filter, PieChart, ShieldCheck,
  TrendingUp, Users,
} from 'lucide-react'
import { useApp, patientById } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Progress, RiskBadge, Stat, Tabs, cn } from '../../components/ui'
import { buildHfmeaRows, buildQcSummary, buildQccRows, downloadCsv, riskDistribution } from '../../lib/qc'
import { fmtDate, relTime } from '../../lib/date'

export default function Qc({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const [tab, setTab] = useState<'overview' | 'hfmea' | 'qcc' | 'board'>('overview')

  const summary = useMemo(
    () => buildQcSummary({ ...state }),
    [state.patients, state.assessments, state.adrs, state.followups, state.symptoms, state.chats, state.dispatches, state.labs],
  )
  const hfmea = useMemo(() => buildHfmeaRows(state.adrs, state.patients), [state.adrs, state.patients])
  const qcc = useMemo(() => buildQccRows(state.adrs), [state.adrs])
  const dist = riskDistribution(state.patients)

  const highRisk = state.patients.filter((p) => p.risk === 'high')
  const abnormal = state.patients.filter((p) => {
    const lab = state.labs.find((l) => l.patientId === p.id)
    return lab && (lab.anc < 2.0 || lab.plt < 100)
  })
  const needFollow = state.patients.filter((p) => state.followups.some((f) => f.patientId === p.id && (f.status === 'late' || f.status === 'missed')))

  const kpis = [
    { l: '风险评估完成率', v: summary.assessRate, num: `${summary.assessed}/${summary.total}`, tone: summary.assessRate >= 90 ? 'emerald' : 'amber' },
    { l: '宣教覆盖率', v: summary.eduRate, num: `${summary.educationCovered}/${summary.total}`, tone: summary.eduRate >= 90 ? 'emerald' : 'amber' },
    { l: '随访完成率', v: summary.fuRate, num: `${summary.fuDone}/${summary.fuTotal}`, tone: summary.fuRate >= 80 ? 'emerald' : 'amber' },
    { l: '提醒已读率', v: summary.dispatchAckRate, num: `${state.dispatches.filter((d) => d.readAt).length}/${state.dispatches.length}`, tone: 'brand' },
  ]

  return (
    <AppShell
      active="qc"
      onNavigate={onNavigate}
      title="质控管理与数据统计"
      subtitle="完成率 / 覆盖率 / 漏访 / 骨髓抑制延迟发现 · HFMEA 与品管圈报表"
      actions={
        <>
          <button className="btn-ghost" onClick={() => downloadCsv('HFMEA风险分析', hfmea)}><Download className="h-4 w-4" />导出 HFMEA</button>
          <button className="btn-primary" onClick={() => downloadCsv('品管圈改善数据', qcc)}><FileSpreadsheet className="h-4 w-4" />导出品管圈</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="在管患者" value={state.patients.length} unit="人" tone="brand" hint={`高危 ${dist.high} · 中危 ${dist.mid} · 低危 ${dist.low}`} icon={<Users className="h-4 w-4" />} />
          <Stat label="ADR 累计上报" value={summary.adrCount} unit="例" tone="rose" hint={`3-4 级 ${summary.adrHigh} 例`} icon={<ShieldCheck className="h-4 w-4" />} />
          <Stat label="平均闭环时长" value={summary.avgCloseHours} unit="小时" tone="emerald" hint="从上报到风险解除" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Stat label="骨髓抑制延迟发现" value={summary.delayedAnc} unit="例" tone="amber" hint="质控重点改进指标" icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        <div className="flex items-center justify-between">
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'overview', label: '指标总览' },
            { key: 'board', label: '高危与异常看板' },
            { key: 'hfmea', label: 'HFMEA 分析' },
            { key: 'qcc', label: '品管圈改善' },
          ]} />
          <span className="hidden text-[11px] text-slate-400 sm:block">统计口径：当前演示数据集 · {fmtDate(new Date())}</span>
        </div>

        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <h2 className="section-title mb-3 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-brand-600" />核心质控指标</h2>
              <div className="space-y-3">
                {kpis.map((k) => (
                  <div key={k.l}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-slate-600">{k.l}</span>
                      <span className="text-xs font-semibold text-slate-800 tnum">{k.v}% <span className="font-normal text-slate-400">（{k.num}）</span></span>
                    </div>
                    <Progress value={k.v} tone={k.tone} />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { l: '待随访', v: summary.fuTotal - summary.fuDone, t: 'slate' },
                  { l: '迟访', v: summary.fuLate, t: 'amber' },
                  { l: '漏访', v: summary.fuMissed, t: 'rose' },
                ].map((x) => (
                  <div key={x.l} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                    <p className={cn('text-lg font-semibold tnum', x.t === 'rose' ? 'text-rose-600' : x.t === 'amber' ? 'text-amber-600' : 'text-slate-700')}>{x.v}</p>
                    <p className="text-[10px] text-slate-500">{x.l}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-4">
              <h2 className="section-title mb-3 flex items-center gap-1.5"><PieChart className="h-3.5 w-3.5 text-brand-600" />ADR 分类构成与处置效率</h2>
              <div className="space-y-2">
                {qcc.map((q) => (
                  <div key={q.不良反应类型} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-[11px] text-slate-600">{q.不良反应类型}</span>
                    <div className="flex-1">
                      <Progress value={(q.发生例数 / Math.max(1, summary.adrCount)) * 100} tone={Number(q['3-4 级例数']) > 0 ? 'rose' : 'brand'} />
                    </div>
                    <span className="w-16 text-right text-[11px] text-slate-500 tnum">{q.发生例数} 例（{q['3-4 级占比']}）</span>
                  </div>
                ))}
                {qcc.length === 0 && <Empty title="暂无 ADR 数据" />}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 px-2 py-2">
                  <p className="text-lg font-semibold text-emerald-600 tnum">{summary.avgCloseHours}h</p>
                  <p className="text-[10px] text-emerald-700">平均闭环时长</p>
                </div>
                <div className="rounded-lg bg-brand-50 px-2 py-2">
                  <p className="text-lg font-semibold text-brand-700 tnum">{summary.chatEscalation}</p>
                  <p className="text-[10px] text-brand-700">AI 转人工接诊</p>
                </div>
              </div>
            </section>

            <section className="card overflow-hidden lg:col-span-2">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="section-title">质控明细（可导出）</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">患者</th>
                      <th className="px-3 py-2 font-medium">风险</th>
                      <th className="px-3 py-2 font-medium">评估完成</th>
                      <th className="px-3 py-2 font-medium">宣教推送</th>
                      <th className="px-3 py-2 font-medium">随访完成率</th>
                      <th className="px-3 py-2 font-medium">ADR</th>
                      <th className="px-4 py-2 font-medium">最近动作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {state.patients.map((p) => {
                      const fus = state.followups.filter((f) => f.patientId === p.id)
                      const done = fus.filter((f) => f.status === 'done').length
                      const hasAssess = state.assessments.some((a) => a.patientId === p.id)
                      const hasDispatch = state.dispatches.some((d) => d.patientId === p.id && d.readAt)
                      const adrCount = state.adrs.filter((a) => a.patientId === p.id).length
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                          <td className="px-3 py-2"><RiskBadge level={p.risk} /></td>
                          <td className="px-3 py-2">{hasAssess ? <Badge tone="emerald">已评估</Badge> : <Badge tone="rose">未完成</Badge>}</td>
                          <td className="px-3 py-2">{hasDispatch ? <Badge tone="emerald">已读</Badge> : <Badge tone="amber">未读</Badge>}</td>
                          <td className="px-3 py-2 tnum">{fus.length ? `${done}/${fus.length}` : '—'}</td>
                          <td className="px-3 py-2 tnum">{adrCount || '—'}</td>
                          <td className="px-4 py-2 text-slate-400">{p.nextFollowUp ? `随访 ${p.nextFollowUp}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === 'board' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: '高危患者实时看板', list: highRisk, tone: 'rose', icon: ShieldCheck },
              { title: '指标异常患者', list: abnormal, tone: 'amber', icon: TrendingUp },
              { title: '迟访 / 漏访患者', list: needFollow, tone: 'violet', icon: Filter },
            ].map((col) => {
              const Icon = col.icon
              return (
                <section key={col.title} className="card overflow-hidden">
                  <div className={cn('flex items-center justify-between border-b px-4 py-2.5',
                    col.tone === 'rose' ? 'border-rose-100 bg-rose-50/60' : col.tone === 'amber' ? 'border-amber-100 bg-amber-50/60' : 'border-violet-100 bg-violet-50/60')}>
                    <h2 className="section-title flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{col.title}</h2>
                    <Badge tone={col.tone}>{col.list.length}</Badge>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {col.list.length === 0 && <div className="p-4"><Empty title="暂无" /></div>}
                    {col.list.map((p) => {
                      const lab = state.labs.find((l) => l.patientId === p.id)
                      return (
                        <div key={p.id} className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.age}岁</span>
                            <RiskBadge level={p.risk} />
                            {lab && <span className="text-[10px] text-slate-500 tnum">ANC {lab.anc} / PLT {lab.plt}</span>}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">{p.regimen}</p>
                          {p.alerts[0] && <p className="mt-0.5 text-[10px] text-rose-600">{p.alerts[0]}</p>}
                          <p className="mt-0.5 text-[10px] text-slate-400">下次随访 {p.nextFollowUp ?? '—'}</p>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {tab === 'hfmea' && (
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="section-title">HFMEA 失效模式与影响分析</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">S 严重度 / O 发生率 / D 可探测性 → RPN 风险优先数（按 ADR 事件自动生成）</p>
              </div>
              <button className="btn-ghost" onClick={() => downloadCsv('HFMEA风险分析', hfmea)}><Download className="h-4 w-4" />导出 CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">失效模式</th>
                    <th className="px-3 py-2 font-medium">失效原因</th>
                    <th className="px-3 py-2 font-medium">影响</th>
                    <th className="px-3 py-2 font-medium">当前措施</th>
                    <th className="px-2 py-2 text-center font-medium">S</th>
                    <th className="px-2 py-2 text-center font-medium">O</th>
                    <th className="px-2 py-2 text-center font-medium">D</th>
                    <th className="px-2 py-2 text-center font-medium">RPN</th>
                    <th className="px-3 py-2 font-medium">上报时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {hfmea.map((r) => (
                    <tr key={r.序号} className={cn(r.RPN >= 200 ? 'bg-rose-50/50' : r.RPN >= 100 ? 'bg-amber-50/40' : '')}>
                      <td className="px-3 py-2 text-slate-400 tnum">{r.序号}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{r.失效模式}<div className="text-[10px] font-normal text-slate-400">{r.患者} · {r.风险等级}</div></td>
                      <td className="px-3 py-2 text-slate-600">{r.失效原因}</td>
                      <td className="px-3 py-2 text-slate-600">{r.影响}</td>
                      <td className="px-3 py-2 text-slate-500">{r.当前措施}</td>
                      <td className="px-2 py-2 text-center tnum">{r.S}</td>
                      <td className="px-2 py-2 text-center tnum">{r.O}</td>
                      <td className="px-2 py-2 text-center tnum">{r.D}</td>
                      <td className="px-2 py-2 text-center"><span className={cn('chip font-semibold', r.RPN >= 200 ? 'bg-rose-100 text-rose-700' : r.RPN >= 100 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{r.RPN}</span></td>
                      <td className="px-3 py-2 text-slate-400">{r.上报时间}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
              RPN ≥ 200 为优先改进项（红色），100~199 为关注项（黄色）。改进后需重新评分并与本基线对比，形成 PDCA 闭环。
            </div>
          </section>
        )}

        {tab === 'qcc' && (
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="section-title">品管圈改善数据（按不良反应类型）</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">用于 QCC 选题、现状把握与改善效果对比</p>
              </div>
              <button className="btn-ghost" onClick={() => downloadCsv('品管圈改善数据', qcc)}><Download className="h-4 w-4" />导出 CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">不良反应类型</th>
                    <th className="px-3 py-2 font-medium">发生例数</th>
                    <th className="px-3 py-2 font-medium">3-4 级例数</th>
                    <th className="px-3 py-2 font-medium">3-4 级占比</th>
                    <th className="px-4 py-2 font-medium">改善建议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {qcc.map((r) => (
                    <tr key={r.不良反应类型} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{r.不良反应类型}</td>
                      <td className="px-3 py-2 tnum">{r.发生例数}</td>
                      <td className="px-3 py-2 tnum">{r['3-4 级例数']}</td>
                      <td className="px-3 py-2 tnum">{r['3-4 级占比']}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {r.不良反应类型.includes('中性') ? '强化低谷期语音提醒 + 高危患者第 3 天提前复查' :
                          r.不良反应类型.includes('血小板') ? 'PLT<50 自动短信提醒 + 出血风险宣教' :
                          r.不良反应类型.includes('过敏') ? '输注前 30 分钟加密巡视 + 预处理方案核查' :
                          r.不良反应类型.includes('呕吐') || r.不良反应类型.includes('恶心') ? '止吐方案按风险分层升级 + 居家补液指导' :
                          '按 SOP 加密随访与复评'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
