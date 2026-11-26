import React, { useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowRight, Bell, CalendarClock, ChevronRight, Clock, Droplets,
  ShieldAlert, Sparkles, TrendingUp, UserCheck, Users,
} from 'lucide-react'
import { useApp, patientById, readAllNotifications, readNotification } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Progress, RiskBadge, Stat, Tabs, cn } from '../../components/ui'
import { PatientDrawer } from '../../components/PatientDrawer'
import { buildTrend, riskDistribution } from '../../lib/qc'
import { fmtDate, relFuture, relTime } from '../../lib/date'
import { gradeByLab } from '../../lib/ctcae'

export default function Workbench({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [drawer, setDrawer] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'abnormal' | 'followup'>('all')

  const trend = useMemo(() => buildTrend({ adrs: state.adrs, symptoms: state.symptoms, followups: state.followups }), [state.adrs, state.symptoms, state.followups])
  const dist = riskDistribution(state.patients)

  const myPatients = useMemo(() => {
    if (role === 'doctor') return state.patients.filter((p) => p.attending === state.userName || state.userName === '王建国')
    if (role === 'nurse') return state.patients.filter((p) => p.primaryNurse === state.userName)
    return state.patients
  }, [state.patients, role, state.userName])

  const abnormalPatients = useMemo(
    () =>
      myPatients.filter((p) => {
        const lab = state.labs.find((l) => l.patientId === p.id)
        if (!lab) return false
        return lab.anc < 2.0 || lab.plt < 100
      }),
    [myPatients, state.labs],
  )

  const followupPatients = useMemo(
    () => myPatients.filter((p) => state.followups.some((f) => f.patientId === p.id && (f.status === 'pending' || f.status === 'late' || f.status === 'missed'))),
    [myPatients, state.followups],
  )

  const filtered = useMemo(() => {
    if (filter === 'high') return myPatients.filter((p) => p.risk === 'high')
    if (filter === 'abnormal') return abnormalPatients
    if (filter === 'followup') return followupPatients
    return myPatients
  }, [filter, myPatients, abnormalPatients, followupPatients])

  const notifications = state.notifications.filter((n) => n.targetRole === 'all' || n.targetRole.includes(role))
  const unread = notifications.filter((n) => !n.read).length
  const pendingAdr = state.adrs.filter((a) => a.status !== 'closed').length
  const openAlerts = myPatients.filter((p) => p.alerts.length > 0).length
  const dueSoon = state.followups.filter((f) => f.status !== 'done').length

  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.adr, t.symptom, t.followup)))

  return (
    <AppShell
      active="workbench"
      onNavigate={onNavigate}
      title="临床工作台 · 风险看板"
      subtitle={`${fmtDate(new Date())} · ${role === 'doctor' ? '医生视角' : role === 'nurse' ? '责任护士视角' : role === 'headnurse' ? '护士长视角' : '质控视角'} · 在管 ${myPatients.length} 人`}
      actions={
        <>
          <button className="btn-ghost" onClick={() => onNavigate('assess')}><UserCheck className="h-4 w-4" />开始评估</button>
          <button className="btn-primary" onClick={() => onNavigate('monitor')}><Activity className="h-4 w-4" />实时监控</button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 关键指标 */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="在管患者" value={myPatients.length} unit="人" hint={`高危 ${myPatients.filter((p) => p.risk === 'high').length} · 中危 ${myPatients.filter((p) => p.risk === 'mid').length}`} icon={<Users className="h-4 w-4" />} tone="brand" />
          <Stat label="PCR 待办随访" value={dueSoon} unit="项" hint="含迟访 / 漏访患者" icon={<CalendarClock className="h-4 w-4" />} tone="amber" />
          <Stat label="未闭环 ADR" value={pendingAdr} unit="例" hint={`其中 3-4 级 ${state.adrs.filter((a) => a.grade >= 3 && a.status !== 'closed').length} 例`} icon={<ShieldAlert className="h-4 w-4" />} tone="rose" />
          <Stat label="待处理预警" value={openAlerts} unit="条" hint="居家 / 检验 / 监护" icon={<AlertTriangle className="h-4 w-4" />} tone="slate" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          {/* 患者风险列表 */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="section-title">患者风险清单</h2>
                <Badge tone="slate">{filtered.length} 人</Badge>
              </div>
              <Tabs
                value={filter}
                onChange={setFilter}
                tabs={[
                  { key: 'all', label: '全部', count: myPatients.length },
                  { key: 'high', label: '高危', count: myPatients.filter((p) => p.risk === 'high').length },
                  { key: 'abnormal', label: '指标异常', count: abnormalPatients.length },
                  { key: 'followup', label: '随访待办', count: followupPatients.length },
                ]}
              />
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 && <div className="p-4"><Empty title="暂无符合条件的患者" hint="切换筛选条件或完成新的风险评估" /></div>}
              {filtered.map((p) => {
                const lab = state.labs.find((l) => l.patientId === p.id)
                const fu = state.followups.filter((f) => f.patientId === p.id && f.status !== 'done').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
                const ancGrade = lab ? gradeByLab('anc', { anc: lab.anc }) : 0
                const pltGrade = lab ? gradeByLab('plt', { plt: lab.plt }) : 0
                return (
                  <button key={p.id} onClick={() => setDrawer(p.id)} className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80">
                    <div className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                      p.risk === 'high' ? 'bg-rose-50 text-rose-600' : p.risk === 'mid' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                    )}>
                      {p.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        <span className="text-[11px] text-slate-400">{p.gender === 'F' ? '女' : '男'}{p.age}</span>
                        <RiskBadge level={p.risk} />
                        <Badge tone={p.phase === 'during' ? 'amber' : p.phase === 'pre' ? 'violet' : 'emerald'}>
                          {p.phase === 'pre' ? '化疗前' : p.phase === 'during' ? '化疗中' : `化疗后 D${Math.max(0, Math.round((Date.now() - new Date(`${p.chemoDate}T08:30:00`).getTime()) / 86400000))}`}
                        </Badge>
                        {p.alerts.length > 0 && <Badge tone="rose"><AlertTriangle className="h-3 w-3" />{p.alerts.length}</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{p.regimen} · {p.cycle}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {lab && (
                          <span className={cn('tnum', ancGrade >= 2 ? 'font-semibold text-rose-600' : ancGrade === 1 ? 'text-amber-600' : 'text-emerald-600')}>
                            ANC {lab.anc}
                          </span>
                        )}
                        {lab && (
                          <span className={cn('tnum', pltGrade >= 2 ? 'font-semibold text-rose-600' : pltGrade === 1 ? 'text-amber-600' : 'text-emerald-600')}>
                            PLT {lab.plt}
                          </span>
                        )}
                        {fu && <span className="text-slate-400">下次随访 {fu.dueDate}（{fu.type}）</span>}
                        {!lab && <span className="text-slate-400">暂无近期检验</span>}
                      </div>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
                  </button>
                )
              })}
            </div>
          </section>

          <div className="space-y-4">
            {/* 预警 / 通知 */}
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="section-title flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-rose-500" />实时预警与通知</h2>
                <button onClick={readAllNotifications} className="text-[11px] text-slate-400 hover:text-brand-600">全部已读</button>
              </div>
              <div className="max-h-[330px] divide-y divide-slate-50 overflow-y-auto">
                {notifications.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { readNotification(n.id); if (n.patientId) setDrawer(n.patientId) }}
                    className={cn('flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-slate-50', !n.read && 'bg-rose-50/40')}
                  >
                    <span className={cn(
                      'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                      n.level === 'danger' ? 'bg-rose-500' : n.level === 'warn' ? 'bg-amber-500' : n.level === 'success' ? 'bg-emerald-500' : 'bg-slate-400',
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs leading-snug', n.read ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{relTime(n.at)}</p>
                    </div>
                  </button>
                ))}
                {notifications.length === 0 && <div className="p-4"><Empty title="暂无通知" /></div>}
              </div>
            </section>

            {/* 风险分层与趋势 */}
            <section className="card p-4">
              <h2 className="section-title mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-brand-600" />近 7 日趋势与风险分布</h2>
              <div className="flex h-24 items-end gap-2">
                {trend.map((t) => (
                  <div key={t.date} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-end justify-center gap-0.5">
                      <div className="w-1/4 rounded-t bg-rose-300" style={{ height: `${(t.adr / maxTrend) * 64 + 4}px` }} title={`ADR ${t.adr}`} />
                      <div className="w-1/4 rounded-t bg-amber-300" style={{ height: `${(t.symptom / maxTrend) * 64 + 4}px` }} title={`症状 ${t.symptom}`} />
                      <div className="w-1/4 rounded-t bg-brand-300" style={{ height: `${(t.followup / maxTrend) * 64 + 4}px` }} title={`随访 ${t.followup}`} />
                    </div>
                    <span className="text-[9px] text-slate-400">{t.date}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-rose-300" />ADR 上报</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-300" />症状上报</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-brand-300" />随访动作</span>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { l: '高危', v: dist.high, tone: 'rose' },
                  { l: '中危', v: dist.mid, tone: 'amber' },
                  { l: '低危', v: dist.low, tone: 'emerald' },
                ].map((d) => (
                  <div key={d.l} className="flex items-center gap-2">
                    <span className="w-8 text-[11px] text-slate-500">{d.l}</span>
                    <div className="flex-1"><Progress value={(d.v / state.patients.length) * 100} tone={d.tone} /></div>
                    <span className="w-6 text-right text-[11px] font-medium text-slate-700 tnum">{d.v}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 快捷路径 */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Activity, t: '化疗中实时监控', d: '输液绑定、巡视打卡、监护预警', k: 'monitor' as NavKey, tone: 'text-brand-600 bg-brand-50' },
            { icon: HeartPulseIcon, t: '不良反应闭环', d: `${pendingAdr} 例待处置 / 复评`, k: 'adr' as NavKey, tone: 'text-rose-600 bg-rose-50' },
            { icon: CalendarClock, t: '随访与居家照护', d: `${dueSoon} 项随访待办`, k: 'followup' as NavKey, tone: 'text-amber-600 bg-amber-50' },
            { icon: Sparkles, t: '质控与报表导出', d: 'HFMEA / 品管圈数据', k: 'qc' as NavKey, tone: 'text-emerald-600 bg-emerald-50' },
          ].map((q) => {
            const Icon = q.icon
            return (
              <button key={q.k} onClick={() => onNavigate(q.k)} className="card group flex items-center gap-3 p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-float">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', q.tone)}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">{q.t}</p>
                  <p className="truncate text-[11px] text-slate-500">{q.d}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
              </button>
            )
          })}
        </section>
      </div>

      <PatientDrawer patientId={drawer} onClose={() => setDrawer(null)} />
    </AppShell>
  )
}

const HeartPulseIcon = (props: any) => <Activity {...props} />
