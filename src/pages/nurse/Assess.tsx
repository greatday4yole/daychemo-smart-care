import React, { useMemo, useState } from 'react'
import {
  AlertCircle, BookOpen, CheckCircle2, ClipboardCheck, FileText, Info, Lock, Sparkles,
  Stethoscope, UserCheck,
} from 'lucide-react'
import { useApp, submitAssessment, evaluateAssessment, assessmentsOf, roleText } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, GradeBadge, Modal, RiskBadge, cn } from '../../components/ui'
import { RISK_GROUPS, RISK_ITEMS, RISK_RULES, LEVEL_TEXT } from '../../data/riskForm'
import { CTCAE_TERMS, CtcaeById } from '../../data/ctcae'
import { EDUCATION } from '../../data/education'
import type { AssessmentAnswer, RiskLevel } from '../../types'
import { relTime } from '../../lib/date'

export default function Assess({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const candidates = useMemo(
    () => state.patients.filter((p) => p.phase === 'pre' || assessmentsOf(p.id).length === 0),
    [state.patients, state.assessments],
  )
  const [selected, setSelected] = useState<string>(candidates[0]?.id ?? state.patients[0].id)
  const patient = state.patients.find((p) => p.id === selected) ?? state.patients[0]
  const existing = assessmentsOf(patient.id)

  const [answers, setAnswers] = useState<AssessmentAnswer[]>(() =>
    (existing[0]?.answers ?? RISK_ITEMS.map((i) => ({ itemId: i.id, checked: false, note: '' }))),
  )
  const [note, setNote] = useState(existing[0]?.nurseNote ?? '')
  const [consent, setConsent] = useState(patient.consent)
  const [ctcaeOpen, setCtcaeOpen] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [submitted, setSubmitted] = useState<{ score: number; level: RiskLevel } | null>(null)
  const [eduOpen, setEduOpen] = useState(false)

  // 自动勾选：根据 HIS 药物属性
  const autoItems = useMemo(() => {
    const ids: string[] = []
    if (patient.infusion?.hypersensitivity === 3) ids.push('r03')
    if (patient.infusion?.category === 'vesicant' || patient.infusion?.category === 'irritant') ids.push('r11')
    if (patient.age >= 70) ids.push('r07')
    return ids
  }, [patient])

  const result = useMemo(() => evaluateAssessment(answers), [answers])
  const rule = RISK_RULES.find((r) => r.level === result.level)!
  const ctcaerefs = useMemo(
    () => [...new Set(RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked) && i.ctcaeref).map((i) => i.ctcaeref!))],
    [answers],
  )

  // 个体化宣教清单（按风险等级 + 勾选条目生成）
  const eduList = useMemo(() => {
    const tags = new Set<string>()
    if (answers.find((a) => a.itemId === 'r02' && a.checked)) tags.add('过敏')
    if (answers.find((a) => (a.itemId === 'r04' || a.itemId === 'r05') && a.checked)) tags.add('骨髓抑制')
    if (answers.find((a) => a.itemId === 'r10' && a.checked)) tags.add('PICC')
    if (answers.find((a) => a.itemId === 'r12' && a.checked)) tags.add('饮食')
    return EDUCATION.filter((e) => e.audience === 'all' || e.audience.includes(result.level)).filter(
      (e) => e.phase === 'pre' || e.phase === 'post' || tags.size === 0 || e.tags.some((t) => tags.has(t)),
    )
  }, [answers, result.level])

  const toggle = (id: string) => {
    setAnswers((prev) => prev.map((a) => (a.itemId === id ? { ...a, checked: !a.checked } : a)))
  }

  const handleSubmit = () => {
    if (!consent) return
    const res = submitAssessment(patient.id, answers, state.userName || roleText(role), note, consent)
    setSubmitted(res)
    setPreviewOpen(true)
  }

  return (
    <AppShell
      active="assess"
      onNavigate={onNavigate}
      title="化疗前风险评估"
      subtitle="标准化评估表单 · 自动风险分级 · 分层随访联动 · CTCAE 对照"
      actions={
        <>
          <button className="btn-ghost" onClick={() => setCtcaeOpen('__index')}><BookOpen className="h-4 w-4" />CTCAE 知识库</button>
          <button className="btn-primary" disabled={!consent} onClick={handleSubmit}><ClipboardCheck className="h-4 w-4" />提交并归档</button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* 患者选择 */}
          <section className="card p-3.5">
            <p className="section-title mb-2 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-brand-600" />选择待评估患者</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {state.patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p.id)
                    const exist = assessmentsOf(p.id)[0]
                    setAnswers(exist?.answers ?? RISK_ITEMS.map((i) => ({ itemId: i.id, checked: false, note: '' })))
                    setNote(exist?.nurseNote ?? '')
                    setConsent(p.consent)
                    setSubmitted(null)
                  }}
                  className={cn(
                    'shrink-0 rounded-[2px] border px-3 py-2 text-left transition',
                    selected === p.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                    <RiskBadge level={p.risk} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">{p.cycle}</p>
                  {assessmentsOf(p.id).length > 0 && <p className="text-[10px] text-emerald-600">已评估</p>}
                </button>
              ))}
            </div>
          </section>

          {/* 患者摘要 + 自动带入 */}
          <section className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-slate-900">{patient.name} <span className="text-xs font-normal text-slate-500">{patient.gender === 'F' ? '女' : '男'} · {patient.age} 岁</span></p>
                <p className="mt-0.5 text-xs text-slate-500">{patient.diagnosis} · {patient.regimen} · {patient.cycle}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">本次化疗日期</p>
                <p className="text-sm font-semibold text-slate-800">{patient.chemoDate}</p>
              </div>
            </div>
            {autoItems.length > 0 && (
              <div className="mt-2.5 rounded-[2px] bg-brand-50/70 px-3 py-2 text-[11px] leading-relaxed text-brand-900">
                <span className="font-semibold">HIS 自动带入：</span>
                {patient.infusion?.hypersensitivity === 3 && '本次方案含 3 级高致敏药物 → 自动勾选“高致敏方案”；'}
                {patient.infusion && (patient.infusion.category === 'vesicant' || patient.infusion.category === 'irritant') && `本次方案含${patient.infusion.category === 'vesicant' ? '发泡剂' : '刺激性药物'}（${patient.infusion.drug}）→ 自动勾选“发泡剂/刺激性药物”；`}
                {patient.age >= 70 && '年龄 ≥ 70 岁 → 自动勾选“高龄”；'}
                <button className="ml-1 font-medium underline" onClick={() => setAnswers((prev) => prev.map((a) => (autoItems.includes(a.itemId) ? { ...a, checked: true } : a)))}>
                  应用自动勾选
                </button>
              </div>
            )}
          </section>

          {/* 评估表单 */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="section-title">标准化风险评估表单（{RISK_ITEMS.length} 项）</h2>
              <Badge tone="slate">一键勾选 · 自动计分</Badge>
            </div>
            <div className="divide-y divide-slate-50">
              {RISK_GROUPS.map((g) => {
                const items = RISK_ITEMS.filter((i) => i.group === g)
                return (
                  <div key={g} className="px-4 py-3">
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-400">{g}</p>
                    <div className="space-y-1">
                      {items.map((i) => {
                        const checked = !!answers.find((a) => a.itemId === i.id && a.checked)
                        const isAuto = autoItems.includes(i.id)
                        return (
                          <div key={i.id} className={cn('flex items-start gap-2 rounded-[2px] px-2 py-1.5 transition', checked ? 'bg-brand-50/60' : 'hover:bg-slate-50')}>
                            <button
                              onClick={() => toggle(i.id)}
                              className={cn(
                                'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition',
                                checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white',
                              )}
                              aria-pressed={checked}
                            >
                              {checked && <CheckCircle2 className="h-3 w-3" />}
                            </button>
                            <button onClick={() => toggle(i.id)} className="min-w-0 flex-1 text-left">
                              <span className="text-[13px] leading-relaxed text-slate-700">{i.label}</span>
                              {i.hint && <span className="ml-1 text-[11px] text-slate-400">（{i.hint}）</span>}
                            </button>
                            {isAuto && <Badge tone="brand">HIS 带入</Badge>}
                            {i.ctcaeref && (
                              <button className="chip bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => setCtcaeOpen(i.ctcaeref!)} title="查阅 CTCAE 分级标准">
                                CTCAE
                              </button>
                            )}
                            <span className="w-8 shrink-0 text-right text-[11px] text-slate-400 tnum">+{i.weight}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <label className="block">
                <span className="label">评估结论 / 护理记录（同步至护理记录单）</span>
                <textarea className="input mt-1 min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录既往过敏史的具体表现、处理经过、本次预处理方案等" />
              </label>
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span className="text-[11px] leading-relaxed text-slate-600">
                  已向患者告知本次化疗方案风险、可能的过敏与骨髓抑制反应及随访要求，患者已签署知情同意（演示：勾选即视为签署）。
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* 侧栏：风险分级联动 */}
        <div className="space-y-4">
          <section className="card sticky top-20 overflow-hidden">
            <div className={cn('px-4 py-4', result.level === 'high' ? 'bg-rose-50' : result.level === 'mid' ? 'bg-amber-50' : 'bg-emerald-50')}>
              <p className="text-[11px] font-medium text-slate-500">自动评分（{RISK_ITEMS.filter((i) => i.weight).length} 项加权归一）</p>
              <div className="mt-1 flex items-end gap-2">
                <span className={cn('text-4xl font-bold tnum', result.level === 'high' ? 'text-rose-600' : result.level === 'mid' ? 'text-amber-600' : 'text-emerald-600')}>{result.score}</span>
                <span className="mb-1 text-xs text-slate-500">分</span>
                <div className="mb-1.5 ml-auto"><RiskBadge level={result.level} /></div>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                {result.level === 'high' ? '高危：红色标记 + 加密监测 + 加密随访' : result.level === 'mid' ? '中危：加密复查（第 4/7/14 天）+ 每日症状上报' : '低危：常规宣教 + 化疗后第 7 天复查'}
              </p>
            </div>
            <div className="space-y-2 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-400">风险分级联动动作</p>
              {rule.actions.map((a) => (
                <div key={a} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-brand-500" />{a}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-400">已识别风险条目</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {result.tags.length === 0 && <span className="text-[11px] text-slate-400">尚未勾选任何风险条目</span>}
                {result.tags.map((t) => <Badge key={t} tone="slate">{t}</Badge>)}
              </div>
              {ctcaerefs.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-semibold text-slate-400">需对照 CTCAE 标准</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ctcaerefs.map((c) => (
                      <button key={c} className="chip bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => setCtcaeOpen(c)}>
                        <BookOpen className="h-3 w-3" />{CtcaeById(c)?.term ?? c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2 border-t border-slate-100 px-4 py-3">
              <button className="btn-primary w-full" disabled={!consent} onClick={handleSubmit}>
                <ClipboardCheck className="h-4 w-4" /> 提交评估并生成随访计划
              </button>
              <button className="btn-ghost w-full" onClick={() => setEduOpen(true)}>
                <FileText className="h-4 w-4" /> 预览个体化宣教清单（{eduList.length}）
              </button>
              {!consent && <p className="text-center text-[10px] text-amber-600">请先完成知情同意勾选</p>}
            </div>
          </section>

          {/* 历史评估 */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <h2 className="section-title flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-slate-400" />历史评估（自动存档）</h2>
            </div>
            {existing.length === 0 && <div className="p-3"><Empty title="暂无历史评估" hint="提交后自动归档，可随时调阅" /></div>}
            <div className="divide-y divide-slate-50">
              {existing.map((a) => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{a.score} 分</span>
                    <RiskBadge level={a.level} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">{relTime(a.createdAt)} · {a.nurse} · {a.syncStatus === 'synced' ? '已同步护理记录' : '待同步'}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.tags.slice(0, 4).map((t) => <Badge key={t} tone="slate">{t}</Badge>)}
                    {a.ctcaeref.slice(0, 3).map((c) => <Badge key={c} tone="violet">CTCAE {c}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <p className="text-[11px] leading-relaxed text-slate-500">
              <Info className="mr-1 inline h-3 w-3 text-brand-500" />
              评估表单权重依据 HFMEA 失效模式与 ASCO/NCCN 骨髓抑制风险因素设定；分值为归一化百分制。高危判定（≥60 分）将自动触发加密监测、随访计划与高危看板置顶。
            </p>
          </section>
        </div>
      </div>

      {/* CTCAE 弹窗 */}
      <Modal open={!!ctcaeOpen} onClose={() => setCtcaeOpen(null)} title={ctcaeOpen === '__index' ? 'CTCAE v5.0 不良反应分级知识库' : 'CTCAE 分级对照'} width="max-w-3xl">
        {ctcaeOpen === '__index' ? (
          <div className="space-y-2">
            {CTCAE_TERMS.map((t) => (
              <button key={t.id} onClick={() => setCtcaeOpen(t.id)} className="flex w-full items-center justify-between rounded-[2px] border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.term}</p>
                  <p className="text-[11px] text-slate-500">{t.note}</p>
                </div>
                <Badge tone="violet">{t.category}</Badge>
              </button>
            ))}
          </div>
        ) : ctcaeOpen ? (
          (() => {
            const t = CtcaeById(ctcaeOpen)
            if (!t) return <Empty title="未找到该分级条目" />
            return (
              <div className="space-y-3">
                <div className="rounded-[2px] bg-violet-50 px-3 py-2">
                  <p className="text-sm font-semibold text-violet-900">{t.term}</p>
                  <p className="mt-0.5 text-[11px] text-violet-700">{t.category} · CTCAE v5.0</p>
                </div>
                {[1, 2, 3, 4, 5].map((g) => {
                  const text = [t.grade1, t.grade2, t.grade3, t.grade4, t.grade5][g - 1]
                  if (!text || text === '—') return null
                  return (
                    <div key={g} className="flex items-start gap-2">
                      <GradeBadge grade={g} />
                      <p className="flex-1 text-xs leading-relaxed text-slate-600">{text}</p>
                    </div>
                  )
                })}
                <div className="rounded-[2px] bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                  <span className="font-semibold">临床提示：</span>{t.note}
                </div>
                <button className="btn-ghost w-full" onClick={() => setCtcaeOpen('__index')}>返回全部条目</button>
              </div>
            )
          })()
        ) : null}
      </Modal>

      {/* 宣教清单预览 */}
      <Modal open={eduOpen} onClose={() => setEduOpen(false)} title="个体化宣教清单（将推送至患者端）" width="max-w-2xl"
        footer={<button className="btn-primary w-full" onClick={() => setEduOpen(false)}>确认推送</button>}>
        <div className="space-y-2">
          {eduList.map((e) => (
            <div key={e.id} className="rounded-[2px] border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-800">{e.title}</p>
                <Badge tone={e.phase === 'pre' ? 'violet' : e.phase === 'during' ? 'amber' : 'emerald'}>{e.phase === 'pre' ? '化疗前' : e.phase === 'during' ? '化疗中' : '化疗后'}</Badge>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">{e.form} · {e.version} · 审核：{e.approvedBy}</p>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-slate-400">推送规则：按风险等级（{LEVEL_TEXT[result.level]}）与勾选风险条目（{result.tags.join('、') || '无'}）自动筛选。</p>
        </div>
      </Modal>

      {/* 提交成功 */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="评估完成" width="max-w-lg"
        footer={<button className="btn-primary w-full" onClick={() => setPreviewOpen(false)}>知道了</button>}>
        {submitted && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <p className="text-sm text-slate-700">
              已完成 <span className="font-semibold">{patient.name}</span> 的风险评估，得分 <span className="font-semibold tnum">{submitted.score}</span> 分，
              判定为 <span className="font-semibold">{LEVEL_TEXT[submitted.level]}</span>。
            </p>
            <div className="rounded-[2px] bg-slate-50 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-600">
              · 评估结果已归档并同步护理记录<br />
              · 已按风险分层自动生成随访计划（{submitted.level === 'high' ? '第 3/5/7/10/14 天复查 + 24h 电话随访' : submitted.level === 'mid' ? '第 4/7/14 天复查' : '第 7 天复查'}）<br />
              · 个体化宣教清单已推送至患者端
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button className="btn-ghost" onClick={() => { setPreviewOpen(false); onNavigate('followup') }}>查看随访计划</button>
              <button className="btn-soft" onClick={() => { setPreviewOpen(false); setEduOpen(true) }}>查看宣教清单</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
