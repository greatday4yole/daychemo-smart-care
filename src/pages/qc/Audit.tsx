import React, { useMemo, useState } from 'react'
import { Download, Filter, Search, ShieldCheck } from 'lucide-react'
import { useApp } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Tabs } from '../../components/ui'
import { downloadCsv } from '../../lib/qc'
import { relTime } from '../../lib/date'

export default function Audit({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'patient' | 'system'>('all')

  const rows = useMemo(() => {
    let list = state.audit
    if (tab === 'patient') list = list.filter((a) => a.role === 'patient')
    if (tab === 'system') list = list.filter((a) => a.role === 'system')
    if (q) list = list.filter((a) => `${a.actor}${a.action}${a.target}${a.detail}`.includes(q))
    return list
  }, [state.audit, tab, q])

  return (
    <AppShell
      active="audit"
      onNavigate={onNavigate}
      title="操作审计与数据追溯"
      subtitle="全量操作留痕 · 符合等保与医疗数据审计要求（演示环境）"
      actions={<button className="btn-ghost" onClick={() => downloadCsv('操作审计日志', rows.map((r) => ({ 时间: r.at.slice(0, 19).replace('T', ' '), 操作人: r.actor, 角色: r.role, 动作: r.action, 对象: r.target, 详情: r.detail })))}><Download className="h-4 w-4" />导出审计日志</button>}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={tab} onChange={setTab} tabs={[{ key: 'all', label: '全部', count: state.audit.length }, { key: 'patient', label: '患者操作' }, { key: 'system', label: '系统接口' }]} />
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input className="input pl-8" placeholder="搜索操作人 / 动作 / 对象" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <h2 className="section-title">审计日志（{rows.length} 条）</h2>
            <Badge tone="slate">不可篡改 · 仅追加</Badge>
          </div>
          {rows.length === 0 && <div className="p-4"><Empty title="没有匹配的审计记录" /></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">操作人</th>
                  <th className="px-3 py-2 font-medium">角色</th>
                  <th className="px-3 py-2 font-medium">动作</th>
                  <th className="px-3 py-2 font-medium">对象</th>
                  <th className="px-4 py-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-400">{r.at.slice(0, 16).replace('T', ' ')}<span className="ml-1 text-[10px]">({relTime(r.at)})</span></td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.actor}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.role === 'system' ? 'violet' : r.role === 'patient' ? 'rose' : 'slate'}>
                        {r.role === 'system' ? '系统' : r.role === 'patient' ? '患者' : r.role === 'doctor' ? '医生' : r.role === 'nurse' ? '护士' : r.role === 'headnurse' ? '护士长' : r.role === 'qc' ? '质控' : '管理员'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.action}</td>
                    <td className="px-3 py-2 text-slate-600">{r.target}</td>
                    <td className="px-4 py-2 text-slate-500">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="section-title mb-2">数据留存与合规说明</h2>
          <div className="grid gap-2 text-[11px] leading-relaxed text-slate-600 sm:grid-cols-2">
            {[
              '所有评估、宣教、监测、随访、ADR 处置动作均自动留痕，审计日志仅追加不可修改。',
              '患者隐私字段（姓名、住院号、手机号）在列表与导出中默认脱敏，完整信息需相应权限。',
              'AI 语音问答仅限专科知识库内宣教内容，超出范围强制转人工，不生成诊疗方案。',
              '演示环境数据存储于浏览器本地（localStorage），不对外传输任何真实患者信息。',
            ].map((t) => (
              <div key={t} className="rounded-[2px] bg-slate-50 px-3 py-2">{t}</div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
