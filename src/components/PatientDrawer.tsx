import React from 'react'
import { X, Phone, ShieldAlert, AlertTriangle, Droplets, User, CalendarClock } from 'lucide-react'
import { useApp, assessmentsOf, adrsOf, followupsOf, labsOf, patientById, chatsOf } from '../store/app'
import { Badge, GradeBadge, RiskBadge, Tabs } from './ui'
import { fmtDate, maskMrn, maskPhone, relTime } from '../lib/date'
import { gradeByLab } from '../lib/ctcae'

export const PatientDrawer = ({ patientId, onClose }: { patientId: string | null; onClose: () => void }) => {
  const state = useApp()
  const patient = patientId ? patientById(patientId) : null
  const [tab, setTab] = React.useState<'overview' | 'assess' | 'adr' | 'labs' | 'chats'>('overview')
  if (!patient) return null

  const assessments = assessmentsOf(patient.id)
  const adrs = adrsOf(patient.id)
  const followups = followupsOf(patient.id)
  const labs = labsOf(patient.id)
  const chats = chatsOf(patient.id)
  const latestLab = labs[0]

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-float animate-slide-up">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{patient.name}</h2>
                <span className="text-xs text-slate-500">{patient.gender === 'F' ? '女' : '男'} · {patient.age} 岁</span>
                <RiskBadge level={patient.risk} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {maskMrn(patient.mrn)} · {patient.bed ?? '居家'} · 主管：{patient.attending} · 责任护士：{patient.primaryNurse}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="sky">{patient.diagnosis}</Badge>
            <Badge tone="slate">{patient.cycle}</Badge>
            <Badge tone={patient.phase === 'during' ? 'amber' : patient.phase === 'pre' ? 'violet' : 'emerald'}>
              {patient.phase === 'pre' ? '化疗前' : patient.phase === 'during' ? '化疗中' : '化疗后居家'}
            </Badge>
          </div>
        </div>

        {patient.alerts.length > 0 && (
          <div className="border-b border-rose-100 bg-rose-50/70 px-5 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"><ShieldAlert className="h-3.5 w-3.5" />预警提示</div>
            <ul className="mt-1 space-y-0.5">
              {patient.alerts.slice(0, 4).map((a) => (
                <li key={a} className="flex items-start gap-1.5 text-[11px] text-rose-700/90">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-5 pt-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'overview', label: '概览' },
              { key: 'assess', label: '评估', count: assessments.length },
              { key: 'adr', label: '不良反应', count: adrs.length },
              { key: 'labs', label: '检验', count: labs.length },
              { key: 'chats', label: 'AI 问答', count: chats.length },
            ]}
          />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {tab === 'overview' && (
            <>
              <section className="card p-3.5">
                <p className="section-title mb-2">化疗方案</p>
                <p className="text-sm text-slate-700">{patient.regimen}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>本次化疗：{patient.chemoDate}</span>
                  <span>电话：{maskPhone(patient.phone)}</span>
                  <span>知情同意：{patient.consent ? '已签署' : '未签署'}</span>
                  <span>下次随访：{patient.nextFollowUp ?? '—'}</span>
                </div>
              </section>

              {patient.infusion && (
                <section className="card p-3.5">
                  <p className="section-title mb-2 flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-brand-600" />输液绑定信息</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>药物：{patient.infusion.drug}</span>
                    <span>剂量：{patient.infusion.dose}</span>
                    <span>通路：{patient.infusion.route}</span>
                    <span>泵速：{patient.infusion.pumpRate} ml/h</span>
                    <span className="col-span-2">HIS 医嘱号：{patient.infusion.hisOrderId}</span>
                    <span className="col-span-2">预处理：{patient.infusion.premedication}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {patient.infusion.category === 'vesicant' && <Badge tone="rose">发泡剂 · 外渗高危</Badge>}
                    {patient.infusion.category === 'irritant' && <Badge tone="amber">刺激性药物</Badge>}
                    {patient.infusion.hypersensitivity >= 2 && <Badge tone="rose">高致敏 {patient.infusion.hypersensitivity} 级</Badge>}
                  </div>
                </section>
              )}

              <section className="card p-3.5">
                <p className="section-title mb-2 flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-brand-600" />随访计划</p>
                {followups.length === 0 && <p className="text-xs text-slate-400">暂无随访计划</p>}
                <ul className="space-y-1.5">
                  {followups.slice(0, 5).map((f) => (
                    <li key={f.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{f.dueDate} · {f.type}</span>
                      <Badge tone={f.status === 'done' ? 'emerald' : f.status === 'pending' ? 'slate' : f.status === 'late' ? 'amber' : 'rose'}>
                        {f.status === 'done' ? '已完成' : f.status === 'pending' ? '待随访' : f.status === 'late' ? '迟访' : '漏访'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>

              {latestLab && (
                <section className="card p-3.5">
                  <p className="section-title mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />最近血常规（LIS）</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { k: 'ANC', v: latestLab.anc, g: gradeByLab('anc', { anc: latestLab.anc }) },
                      { k: 'WBC', v: latestLab.wbc, g: gradeByLab('wbc', { wbc: latestLab.wbc }) },
                      { k: 'PLT', v: latestLab.plt, g: gradeByLab('plt', { plt: latestLab.plt }) },
                      { k: 'Hb', v: latestLab.hb, g: gradeByLab('hb', { hb: latestLab.hb }) },
                    ].map((x) => (
                      <div key={x.k} className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="text-[10px] text-slate-400">{x.k}</p>
                        <p className="text-sm font-semibold text-slate-800 tnum">{x.v}</p>
                        <GradeBadge grade={x.g} />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">采集时间 {relTime(latestLab.at)} · {latestLab.orderId}</p>
                </section>
              )}
            </>
          )}

          {tab === 'assess' && (
            <>
              {assessments.length === 0 && <p className="text-xs text-slate-400">暂无评估记录</p>}
              {assessments.map((a) => (
                <section key={a.id} className="card p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">风险评分 {a.score} 分</p>
                    <RiskBadge level={a.level} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{a.createdAt.slice(0, 16).replace('T', ' ')} · {a.nurse} · {a.syncStatus === 'synced' ? '已同步护理记录' : '待同步'}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.tags.map((t) => <Badge key={t} tone="slate">{t}</Badge>)}
                    {a.ctcaeref.map((c) => <Badge key={c} tone="violet">CTCAE：{c}</Badge>)}
                  </div>
                  {a.nurseNote && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-600">{a.nurseNote}</p>}
                </section>
              ))}
            </>
          )}

          {tab === 'adr' && (
            <>
              {adrs.length === 0 && <p className="text-xs text-slate-400">暂无不良反应事件</p>}
              {adrs.map((a) => (
                <section key={a.id} className="card p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{a.term}</p>
                    <div className="flex items-center gap-1.5">
                      <GradeBadge grade={a.grade} />
                      <Badge tone={a.status === 'closed' ? 'emerald' : a.status === 'triaged' ? 'amber' : 'rose'}>
                        {a.status === 'closed' ? '已闭环' : a.status === 'triaged' ? '已分级' : a.status === 'handling' ? '处置中' : a.status === 'rechecking' ? '复评中' : '已上报'}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{relTime(a.createdAt)} · 来源 {a.source === 'patient' ? '患者上报' : a.source === 'lis' ? 'LIS 自动研判' : a.source === 'device' ? '设备预警' : '护士上报'}</p>
                  <p className="mt-2 text-xs text-slate-600">症状：{a.symptoms.join('、')}</p>
                  <div className="mt-2 space-y-1 border-l-2 border-slate-100 pl-2.5">
                    {a.timeline.map((l, i) => (
                      <div key={i} className="text-[11px] text-slate-500">
                        <span className="text-slate-400">{l.at.slice(5, 16).replace('T', ' ')}</span> · {l.author} · {l.action}：{l.detail}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {tab === 'labs' && (
            <>
              {labs.length === 0 && <p className="text-xs text-slate-400">暂无检验数据（可在“接口集成联调”注入）</p>}
              {labs.map((l) => (
                <section key={l.orderId} className="card p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{l.orderId}</span>
                    <span className="text-slate-400">{relTime(l.at)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    {[
                      { k: 'ANC', v: l.anc, t: 'anc' },
                      { k: 'WBC', v: l.wbc, t: 'wbc' },
                      { k: 'PLT', v: l.plt, t: 'plt' },
                      { k: 'Hb', v: l.hb, t: 'hb' },
                    ].map((x) => (
                      <div key={x.k} className="rounded bg-slate-50 py-1.5">
                        <p className="text-[10px] text-slate-400">{x.k}</p>
                        <p className="text-xs font-semibold tnum">{x.v}</p>
                        <GradeBadge grade={gradeByLab(x.t, { [x.t]: x.v } as any)} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {tab === 'chats' && (
            <>
              {chats.length === 0 && <p className="text-xs text-slate-400">暂无语音问答记录</p>}
              {chats.map((c) => (
                <section key={c.id} className="card p-3.5">
                  <div className="flex items-center justify-between">
                    <Badge tone={c.needsHuman ? 'amber' : 'brand'}>{c.intent}</Badge>
                    <span className="text-[10px] text-slate-400">{relTime(c.at)}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-700">问：{c.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500">{c.answer.slice(0, 180)}{c.answer.length > 180 ? '…' : ''}</p>
                  {c.escalated && <Badge tone="rose" className="mt-1.5">已转人工接诊</Badge>}
                </section>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <button className="btn-primary w-full" onClick={onClose}>
            <User className="h-4 w-4" /> 关闭档案
          </button>
        </div>
      </aside>
    </div>
  )
}
