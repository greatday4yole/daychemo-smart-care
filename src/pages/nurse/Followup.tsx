import React, { useMemo, useState } from 'react'
import {
  BellRing, CalendarClock, CheckCircle2, ChevronRight, Clock, MessageCircle, Phone, Send,
  Share2, TimerOff, UserX, Volume2,
} from 'lucide-react'
import { useApp, updateFollowUp, remindFollowUp, patientById, setActivePatient } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Modal, RiskBadge, Stat, Tabs, cn } from '../../components/ui'
import { PatientDrawer } from '../../components/PatientDrawer'
import { relFuture, relTime } from '../../lib/date'

export default function Followup({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [tab, setTab] = useState<'all' | 'pending' | 'late' | 'missed' | 'done'>('all')
  const [drawer, setDrawer] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const rows = useMemo(() => {
    const list = state.followups.map((f) => ({ f, p: patientById(f.patientId)! })).filter((x) => x.p)
    const byStatus = tab === 'all' ? list : list.filter((x) => x.f.status === tab)
    return byStatus.sort((a, b) => a.f.dueDate.localeCompare(b.f.dueDate))
  }, [state.followups, state.patients, tab])

  const counts = {
    all: state.followups.length,
    pending: state.followups.filter((f) => f.status === 'pending').length,
    late: state.followups.filter((f) => f.status === 'late').length,
    missed: state.followups.filter((f) => f.status === 'missed').length,
    done: state.followups.filter((f) => f.status === 'done').length,
  }

  const chats = state.chats.filter((c) => c.needsHuman || c.escalated).slice(0, 6)
  const symptoms = state.symptoms.slice(0, 6)

  return (
    <AppShell
      active="followup"
      onNavigate={onNavigate}
      title="随访与居家照护管理"
      subtitle="随访闭环台账 · 漏访二次提醒 · 居家症状与 AI 接诊干预"
      actions={
        <>
          <button className="btn-ghost" onClick={() => { remindFollowUpAll(state.followups.filter((f) => f.status === 'late' || f.status === 'missed').map((f) => f.id), state.userName) }}>
            <Send className="h-4 w-4" /> 批量二次提醒
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="随访任务总数" value={counts.all} unit="项" hint="由风险评估自动生成" tone="brand" icon={<CalendarClock className="h-4 w-4" />} />
          <Stat label="待随访" value={counts.pending} unit="项" hint="含今日到期" icon={<Clock className="h-4 w-4" />} />
          <Stat label="迟访" value={counts.late} unit="项" hint="已超期 1-2 天，系统自动二次提醒" tone="amber" icon={<TimerOff className="h-4 w-4" />} />
          <Stat label="漏访" value={counts.missed} unit="项" hint="超期 ≥2 天，需人工干预" tone="rose" icon={<UserX className="h-4 w-4" />} />
        </div>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">随访闭环台账</h2>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: 'all', label: '全部', count: counts.all },
                { key: 'pending', label: '待随访', count: counts.pending },
                { key: 'late', label: '迟访', count: counts.late },
                { key: 'missed', label: '漏访', count: counts.missed },
                { key: 'done', label: '已完成', count: counts.done },
              ]}
            />
          </div>
          {rows.length === 0 && <div className="p-4"><Empty title="暂无随访任务" hint="完成风险评估后将自动生成随访计划" /></div>}
          <div className="divide-y divide-slate-100">
            {rows.map(({ f, p }) => {
              const overdueDays = Math.max(0, Math.round((Date.now() - new Date(f.dueDate).getTime()) / 86400000))
              return (
                <div key={f.id} className={cn('flex flex-wrap items-start gap-3 px-4 py-3 transition', f.status === 'missed' && 'bg-rose-50/40', f.status === 'late' && 'bg-amber-50/30')}>
                  <button onClick={() => setDrawer(p.id)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                      f.status === 'missed' ? 'bg-rose-100 text-rose-600' : f.status === 'late' ? 'bg-amber-100 text-amber-600' : f.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {p.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-slate-900">{p.name}</span>
                        <RiskBadge level={p.risk} />
                        <Badge tone={f.status === 'done' ? 'emerald' : f.status === 'pending' ? 'slate' : f.status === 'late' ? 'amber' : 'rose'}>
                          {f.status === 'done' ? '已完成' : f.status === 'pending' ? '待随访' : f.status === 'late' ? `迟访 ${overdueDays} 天` : `漏访 ${overdueDays} 天`}
                        </Badge>
                        {f.attempts > 0 && <span className="text-[10px] text-slate-400">已提醒 {f.attempts} 次</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600">{f.type} · 计划 {f.dueDate} · {f.dueDate >= new Date().toISOString().slice(0, 10) ? relFuture(f.dueDate) : `已超期`}</p>
                      {f.note && <p className="mt-0.5 text-[11px] text-slate-400">{f.note}</p>}
                      {f.nurse && <p className="text-[10px] text-slate-400">处理人：{f.nurse} · {f.lastAttemptAt ? relTime(f.lastAttemptAt) : ''}</p>}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {f.status !== 'done' && (
                      <>
                        <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => { remindFollowUp(f.id, state.userName); }}>
                          <BellRing className="h-3 w-3" /> 二次提醒
                        </button>
                        <button className="btn-soft !px-2 !py-1 text-[11px]" onClick={() => { setEditing(f.id); setNote('') }}>
                          <CheckCircle2 className="h-3 w-3" /> 填写随访
                        </button>
                      </>
                    )}
                    <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => setDrawer(p.id)}>
                      档案<ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="section-title flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-amber-500" />AI 转人工接诊队列</h2>
              <Badge tone="amber">{chats.length} 条</Badge>
            </div>
            {chats.length === 0 && <div className="p-4"><Empty title="暂无待接诊问题" /></div>}
            <div className="divide-y divide-slate-50">
              {chats.map((c) => {
                const p = patientById(c.patientId)
                return (
                  <div key={c.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">{p?.name}</span>
                        {p && <RiskBadge level={p.risk} />}
                        {c.escalated && <Badge tone="rose">患者转人工</Badge>}
                      </div>
                      <span className="text-[10px] text-slate-400">{relTime(c.at)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">问：{c.question}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">AI 应答：{c.answer.slice(0, 60)}…</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <button className="btn-soft !px-2 !py-1 text-[11px]" onClick={() => setDrawer(c.patientId)}>查看患者</button>
                      <button className="btn-ghost !px-2 !py-1 text-[11px]">
                        <Phone className="h-3 w-3" /> 电话回访
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="section-title flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5 text-brand-600" />居家症状上报记录</h2>
              <Badge tone="brand">{state.symptoms.length} 条</Badge>
            </div>
            {symptoms.length === 0 && <div className="p-4"><Empty title="暂无居家上报" /></div>}
            <div className="divide-y divide-slate-50">
              {symptoms.map((s) => {
                const p = patientById(s.patientId)
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">{p?.name}</span>
                        <Badge tone={s.grade >= 3 ? 'rose' : s.grade === 2 ? 'amber' : 'emerald'}>{s.grade} 级</Badge>
                        {s.escalated && <Badge tone="rose">高危预警</Badge>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{s.symptoms.join('、')}{s.temp != null ? ` · 体温 ${s.temp}℃` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{relTime(s.createdAt)}</p>
                      {s.adrId && <p className="text-[10px] text-brand-600">已关联 ADR</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* 填写随访记录 */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="填写随访记录"
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setEditing(null)}>取消</button>
            <button className="btn-ghost" onClick={() => { if (editing) { updateFollowUp(editing, 'late', note || '未联系上患者，已发送二次提醒', state.userName, role); setEditing(null) } }}>标记迟访</button>
            <button className="btn-primary" onClick={() => { if (editing) { updateFollowUp(editing, 'done', note || '随访完成，患者情况稳定', state.userName, role); setEditing(null) } }}>保存并完成</button>
          </div>
        }
      >
        <div className="space-y-3">
          {(() => {
            const f = state.followups.find((x) => x.id === editing)
            const p = f ? patientById(f.patientId) : null
            return f ? (
              <>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p><span className="text-slate-400">患者：</span>{p?.name} · {p?.regimen}</p>
                  <p className="mt-0.5"><span className="text-slate-400">任务：</span>{f.type} · 计划 {f.dueDate}</p>
                  {f.note && <p className="mt-0.5"><span className="text-slate-400">备注：</span>{f.note}</p>}
                </div>
                <label className="block">
                  <span className="label">随访记录（已完成 / 迟访 / 漏访原因与处置）</span>
                  <textarea className="input mt-1 min-h-[110px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：电话回访已接通，患者体温 36.7℃，无发热、无出血，已复查血常规 ANC 2.1，嘱第 14 天再次复查。" />
                </label>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                  提示：随访记录将自动进入质控台账，作为“随访完成率”与 HFMEA 追溯依据。
                </div>
              </>
            ) : null
          })()}
        </div>
      </Modal>

      <PatientDrawer patientId={drawer} onClose={() => setDrawer(null)} />
    </AppShell>
  )
}

// 批量二次提醒
function remindFollowUpAll(ids: string[], actor: string) {
  ids.forEach((id) => remindFollowUp(id, actor))
}
