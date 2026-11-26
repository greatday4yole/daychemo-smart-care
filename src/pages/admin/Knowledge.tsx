import React, { useMemo, useState } from 'react'
import {
  Bot, CheckCircle2, Database, Download, Edit3, Filter, Plus, Save, Search, ShieldCheck,
  ThumbsUp, Trash2, Upload, XCircle,
} from 'lucide-react'
import { useApp, saveKb, deleteKb, roleText } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Modal, Tabs, cn } from '../../components/ui'
import type { KnowledgeEntry } from '../../types'
import { CTCAE_TERMS } from '../../data/ctcae'
import { SOPS } from '../../data/sop'
import { fmtDate } from '../../lib/date'

const emptyKb = (): KnowledgeEntry => ({
  id: `kb-custom-${Date.now().toString(36)}`,
  question: '',
  keywords: [],
  answer: '',
  category: '居家护理',
  boundary: 'education',
  approvedBy: '待审核',
  updatedAt: fmtDate(new Date()),
  hits: 0,
})

export default function Knowledge({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [tab, setTab] = useState<'kb' | 'sop' | 'ctcae'>('kb')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<KnowledgeEntry | null>(null)
  const [kwInput, setKwInput] = useState('')

  const list = useMemo(() => {
    let l = state.kb
    if (q) l = l.filter((k) => `${k.question}${k.keywords.join('')}${k.answer}${k.category}`.includes(q))
    return l
  }, [state.kb, q])

  const boundaryMeta = {
    education: { l: '宣教指引', t: 'emerald' },
    triage: { l: '转人工', t: 'amber' },
    emergency: { l: '急症强制引导', t: 'rose' },
  }

  return (
    <AppShell
      active="kb"
      onNavigate={onNavigate}
      title="知识库管理"
      subtitle="AI 问答知识库 · 处置 SOP 库 · CTCAE 分级库（全部为专科审核内容）"
      actions={tab === 'kb' ? <button className="btn-primary" onClick={() => { setEdit(emptyKb()); setKwInput('') }}><Plus className="h-4 w-4" />新增问答条目</button> : undefined}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'kb', label: 'AI 问答知识库', count: state.kb.length },
            { key: 'sop', label: '处置 SOP 库', count: SOPS.length },
            { key: 'ctcae', label: 'CTCAE 分级库', count: CTCAE_TERMS.length },
          ]} />
          {tab === 'kb' && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input className="input pl-8" placeholder="搜索问题 / 关键词" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
        </div>

        {tab === 'kb' && (
          <>
            <div className="rounded-xl bg-brand-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-900">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              AI 应答严格限定在本知识库范围内：<strong>仅做宣教指引与风险分流</strong>，命中“转人工”或“急症引导”边界时强制转人工或引导急诊，不生成诊疗方案。
            </div>
            <div className="space-y-2">
              {list.map((k) => (
                <section key={k.id} className="card p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-slate-900">{k.question}</p>
                        <Badge tone={boundaryMeta[k.boundary].t as any}>{boundaryMeta[k.boundary].l}</Badge>
                        <Badge tone="slate">{k.category}</Badge>
                        <span className="text-[10px] text-slate-400">命中 {k.hits} 次</span>
                      </div>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">{k.answer}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {k.keywords.map((w) => <span key={w} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{w}</span>)}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">审核：{k.approvedBy} · {k.updatedAt}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => { setEdit(k); setKwInput(k.keywords.join('、')) }}><Edit3 className="h-3 w-3" />编辑</button>
                      <button className="btn-ghost !px-2 !py-1 text-[11px] !text-rose-600" onClick={() => { if (confirm('确认删除该条目？')) deleteKb(k.id, state.userName || roleText(role), role) }}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </section>
              ))}
              {list.length === 0 && <Empty title="没有匹配条目" hint="可新增或调整关键词" />}
            </div>
          </>
        )}

        {tab === 'sop' && (
          <div className="grid gap-3 lg:grid-cols-2">
            {SOPS.map((s) => (
              <section key={s.id} className="card p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-slate-900">{s.title}</p>
                  <Badge tone={s.category === '过敏反应' ? 'rose' : s.category === '骨髓抑制' ? 'amber' : s.category === '感染' ? 'violet' : 'slate'}>{s.category}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">触发：{s.trigger}</p>
                <ol className="mt-1.5 space-y-1">
                  {s.steps.slice(0, 3).map((x, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[9px] font-semibold text-brand-700">{i + 1}</span>{x}
                    </li>
                  ))}
                  {s.steps.length > 3 && <li className="pl-5 text-[10px] text-slate-400">… 共 {s.steps.length} 步</li>}
                </ol>
                <p className="mt-1.5 text-[10px] text-slate-400">依据：{s.source}</p>
              </section>
            ))}
          </div>
        )}

        {tab === 'ctcae' && (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">不良反应</th>
                    <th className="px-3 py-2 font-medium">类别</th>
                    <th className="px-3 py-2 font-medium">1 级</th>
                    <th className="px-3 py-2 font-medium">2 级</th>
                    <th className="px-3 py-2 font-medium">3 级</th>
                    <th className="px-3 py-2 font-medium">4 级</th>
                    <th className="px-3 py-2 font-medium">临床提示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {CTCAE_TERMS.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-medium text-slate-800">{t.term}</td>
                      <td className="px-3 py-2"><Badge tone="violet">{t.category}</Badge></td>
                      <td className="px-3 py-2 text-slate-600">{t.grade1}</td>
                      <td className="px-3 py-2 text-slate-600">{t.grade2}</td>
                      <td className="px-3 py-2 text-slate-600">{t.grade3}</td>
                      <td className="px-3 py-2 text-slate-600">{t.grade4}</td>
                      <td className="px-3 py-2 text-slate-500">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
              依据 CTCAE v5.0（Common Terminology Criteria for Adverse Events）节选，供临床对照与患者宣教使用，实际判读以主治医生意见为准。
            </div>
          </section>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="编辑问答条目" width="max-w-2xl"
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEdit(null)}>取消</button><button className="btn-primary" onClick={() => { if (edit) { saveKb({ ...edit, keywords: kwInput.split(/[、,，]/).map((s) => s.trim()).filter(Boolean) }, state.userName || roleText(role), role); setEdit(null) } }}><Save className="h-4 w-4" />保存</button></div>}>
        {edit && (
          <div className="space-y-3">
            <label className="block"><span className="label">问题（患者口语化表述）</span>
              <input className="input mt-1" value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} />
            </label>
            <label className="block"><span className="label">关键词（用于语音识别模糊匹配，顿号分隔）</span>
              <input className="input mt-1" value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="如：发热、发烧、体温、38" />
            </label>
            <label className="block"><span className="label">应答内容（宣教口径，语言通俗）</span>
              <textarea className="input mt-1 min-h-[140px]" value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">分类</span>
                <input className="input mt-1" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
              </label>
              <label className="block"><span className="label">应答边界</span>
                <select className="input mt-1" value={edit.boundary} onChange={(e) => setEdit({ ...edit, boundary: e.target.value as any })}>
                  <option value="education">宣教指引（可自动应答）</option>
                  <option value="triage">转人工（超出范围，强制转医护）</option>
                  <option value="emergency">急症强制引导（引导 120/急诊）</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              请确保内容符合医院宣教口径；涉及药物剂量、方案调整、预后判断的问题应设为“转人工”。
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
