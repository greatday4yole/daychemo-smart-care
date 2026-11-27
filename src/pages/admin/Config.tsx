import React, { useState } from 'react'
import {
  AlertCircle, BellRing, Check, Clock, Edit3, FileText, Megaphone, MessageSquare, Plus,
  Save, Settings2, ShieldCheck, Volume2, Bell, Phone, RotateCcw, Lock,
} from 'lucide-react'
import { useApp, saveTemplate, toggleTemplate, saveEducation, saveSettings, resetState, roleText } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Modal, Tabs, cn } from '../../components/ui'
import { EDUCATION } from '../../data/education'
import type { EducationItem, ReminderTemplate, RiskLevel } from '../../types'
import { speak } from '../../voice/engine'
import { fmtDate } from '../../lib/date'

const emptyTpl = (): ReminderTemplate => ({
  id: `tpl-custom-${Date.now().toString(36)}`,
  phase: 'post',
  offsetHours: 48,
  title: '',
  body: '',
  voiceText: '',
  riskFilter: 'all',
  channel: ['push', 'voice'],
  enabled: true,
  approvedBy: '待审核',
  editable: true,
})

const emptyEdu = (): EducationItem => ({
  id: `edu-custom-${Date.now().toString(36)}`,
  title: '',
  phase: 'post',
  audience: 'all',
  form: '图文+语音',
  body: '',
  keyPoints: [''],
  approvedBy: '待审核',
  approvedAt: fmtDate(new Date()),
  version: 'v1.0',
  tags: [],
})

export default function Config({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const role = state.role!
  const [tab, setTab] = useState<'templates' | 'education' | 'settings' | 'perms'>('templates')
  const [editTpl, setEditTpl] = useState<ReminderTemplate | null>(null)
  const [editEdu, setEditEdu] = useState<EducationItem | null>(null)
  const [testText, setTestText] = useState('您好，提醒您今天需要复查血常规，请空腹前往门诊，结果拍照上传到系统。')

  return (
    <AppShell
      active="config"
      onNavigate={onNavigate}
      title="提醒与配置中心"
      subtitle="提醒模板 · 宣教话术 · 免打扰与语音参数 · 权限分级（可视化配置，无需开发）"
      actions={<>
        <button className="btn-ghost" onClick={() => setTab('settings')}><Settings2 className="h-4 w-4" />全局设置</button>
        {tab === 'templates' && <button className="btn-primary" onClick={() => setEditTpl(emptyTpl())}><Plus className="h-4 w-4" />新增模板</button>}
        {tab === 'education' && <button className="btn-primary" onClick={() => setEditEdu(emptyEdu())}><Plus className="h-4 w-4" />新增宣教</button>}
      </>}
    >
      <div className="space-y-4">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'templates', label: '提醒模板（时序）', count: state.templates.length },
          { key: 'education', label: '宣教素材库', count: state.education.length },
          { key: 'settings', label: '语音与免打扰' },
          { key: 'perms', label: '权限分级矩阵' },
        ]} />

        {tab === 'templates' && (
          <div className="space-y-3">
            <div className="rounded-[2px] bg-brand-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-900">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              按化疗时间轴自动触发：负值为化疗前（小时），正值为化疗开始后。所有内容须经肿瘤科专科医护审核入库后生效，AI 不自动生成诊疗内容。
            </div>
            {(['pre', 'during', 'post'] as const).map((phase) => {
              const list = state.templates.filter((t) => t.phase === phase).sort((a, b) => a.offsetHours - b.offsetHours)
              if (!list.length) return null
              return (
                <section key={phase} className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <h2 className="section-title flex items-center gap-1.5">
                      {phase === 'pre' ? <Clock className="h-3.5 w-3.5 text-violet-500" /> : phase === 'during' ? <Clock className="h-3.5 w-3.5 text-amber-500" /> : <Clock className="h-3.5 w-3.5 text-emerald-500" />}
                      {phase === 'pre' ? '化疗前提醒' : phase === 'during' ? '化疗中提醒（床头端）' : '化疗后居家提醒'}
                    </h2>
                    <Badge tone="slate">{list.length} 条</Badge>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {list.map((t) => (
                      <div key={t.id} className={cn('flex flex-wrap items-start gap-3 px-4 py-3', !t.enabled && 'opacity-60')}>
                        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-[2px] bg-slate-50 py-1.5">
                          <span className="text-xs font-semibold text-slate-700 tnum">{t.offsetHours >= 0 ? '+' : ''}{t.offsetHours}h</span>
                          <span className="text-[9px] text-slate-400">{t.offsetHours < 0 ? '化疗前' : t.offsetHours < 24 ? '当日' : `第 ${Math.round(t.offsetHours / 24)} 天`}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-slate-900">{t.title}</p>
                            {t.riskFilter !== 'all' && <Badge tone={t.riskFilter.includes('high') ? 'rose' : 'amber'}>{t.riskFilter.map((r) => r === 'high' ? '高危' : r === 'mid' ? '中危' : '低危').join('/')}</Badge>}
                            {t.channel.map((c) => <Badge key={c} tone={c === 'voice' ? 'brand' : c === 'sms' ? 'violet' : 'slate'}>{c === 'push' ? '小程序推送' : c === 'voice' ? 'AI 语音' : '短信'}</Badge>)}
                            {!t.enabled && <Badge tone="slate">已停用</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{t.body}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">审核：{t.approvedBy}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => speak(t.voiceText || t.body, { rate: 1 })}><Volume2 className="h-3 w-3" />试听</button>
                          {(role === 'headnurse' || role === 'admin') && (
                            <>
                              <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => setEditTpl(t)}><Edit3 className="h-3 w-3" />编辑</button>
                              <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => toggleTemplate(t.id, state.userName || roleText(role), role)}>
                                {t.enabled ? '停用' : '启用'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {tab === 'education' && (
          <div className="space-y-3">
            <div className="rounded-[2px] bg-brand-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-900">
              宣教素材按化疗阶段、风险等级、形式（图文 / 短视频 / 语音）组织，患者端按风险精准推送。替代单一口头宣教，内容变更留版本记录。
            </div>
            {(['pre', 'during', 'post'] as const).map((phase) => {
              const list = state.education.filter((e) => e.phase === phase)
              if (!list.length) return null
              return (
                <section key={phase} className="card overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <h2 className="section-title">{phase === 'pre' ? '化疗前宣教' : phase === 'during' ? '化疗中宣教' : '化疗后居家宣教'}（{list.length}）</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {list.map((e) => (
                      <div key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-slate-900">{e.title}</p>
                            <Badge tone="slate">{e.form}</Badge>
                            <Badge tone="brand">{e.version}</Badge>
                            {e.audience !== 'all' && <Badge tone="amber">{(e.audience as RiskLevel[]).map((r) => r === 'high' ? '高危' : r === 'mid' ? '中危' : '低危').join('/')}</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{e.body.slice(0, 110)}…</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">审核：{e.approvedBy} · {e.approvedAt}</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => speak(e.body, { rate: 1 })}><Volume2 className="h-3 w-3" />试听</button>
                          <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={() => setEditEdu(e)}><Edit3 className="h-3 w-3" />编辑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <h2 className="section-title mb-3 flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5 text-brand-600" />AI 语音引擎参数（全局默认）</h2>
              <div className="space-y-3">
                <div>
                  <p className="label">默认语速</p>
                  <div className="mt-1 flex items-center gap-3">
                    <input type="range" min={0.7} max={1.3} step={0.1} value={state.settings.rate}
                      onChange={(e) => saveSettings({ rate: Number(e.target.value) }, state.userName || roleText(role), role)}
                      className="flex-1 accent-brand-600" />
                    <span className="w-10 text-right text-xs font-medium tnum">{state.settings.rate}x</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="label">免打扰开始</span>
                    <input type="time" className="input mt-1" value={state.settings.quietStart} onChange={(e) => saveSettings({ quietStart: e.target.value }, state.userName || roleText(role), role)} />
                  </label>
                  <label className="block"><span className="label">免打扰结束</span>
                    <input type="time" className="input mt-1" value={state.settings.quietEnd} onChange={(e) => saveSettings({ quietEnd: e.target.value }, state.userName || roleText(role), role)} />
                  </label>
                </div>
                {[
                  { k: 'voiceEnabled' as const, l: '语音播报默认开启', d: '患者可自主关闭' },
                  { k: 'offlinePack' as const, l: '启用离线语音包', d: '预生成播报音频，弱网/离线可用' },
                  { k: 'smsFallback' as const, l: '短信补充通道', d: '高危提醒未读 2 小时自动补发短信' },
                ].map((s) => (
                  <div key={s.k} className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <div><p className="text-xs font-medium text-slate-700">{s.l}</p><p className="text-[10px] text-slate-400">{s.d}</p></div>
                    <button onClick={() => saveSettings({ [s.k]: !state.settings[s.k] }, state.userName || roleText(role), role)}
                      className={cn('relative h-6 w-11 rounded-full transition', state.settings[s.k] ? 'bg-brand-500' : 'bg-slate-300')}>
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', state.settings[s.k] ? 'left-[22px]' : 'left-0.5')} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-4">
              <h2 className="section-title mb-2 flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5 text-brand-600" />语音效果试听</h2>
              <textarea className="input min-h-[90px]" value={testText} onChange={(e) => setTestText(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.8, 1.0, 1.2].map((r) => (
                  <button key={r} className="btn-soft" onClick={() => speak(testText, { rate: r })}><Volume2 className="h-3.5 w-3.5" />{r}x 试听</button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                引擎说明：优先使用系统普通话合成（Web Speech API）；离线包模式下播放预生成 MP3（构建期由 macOS say + ffmpeg 生成，见 public/audio）。浏览器不支持时自动降级为文字推送。
              </p>
            </section>

            <section className="card p-4 lg:col-span-2">
              <h2 className="section-title mb-2 flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5 text-slate-400" />演示数据管理</h2>
              <p className="text-[11px] leading-relaxed text-slate-500">
                演示环境的数据保存在浏览器本地存储中，刷新不会丢失，适合反复演练。如需恢复到初始演示数据（患者、评估、ADR、随访台账等），点击下方按钮。
              </p>
              <button className="btn-ghost mt-2" onClick={() => { if (confirm('确认恢复全部演示初始数据？当前操作记录将清空。')) resetState() }}>
                <RotateCcw className="h-4 w-4" /> 恢复演示初始数据
              </button>
            </section>
          </div>
        )}

        {tab === 'perms' && (
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="section-title flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-brand-600" />角色权限矩阵（RBAC）</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">医生 / 护士 / 护士长 / 质控员 / 患者五类角色，按最小必要原则分配</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">功能模块</th>
                    {['医生', '护士', '护士长', '质控员', '患者', '管理员'].map((r) => <th key={r} className="px-3 py-2 text-center font-medium">{r}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { m: '风险评估（填写）', v: ['阅读', '填写', '填写', '阅读', '—', '—'] },
                    { m: '化疗中监控与巡视', v: ['阅读/处置', '打卡/上报', '打卡/上报', '阅读', '床头端播报', '—'] },
                    { m: 'ADR 上报与处置', v: ['处置/闭环', '上报/处置', '上报/闭环', '阅读', '上报症状', '—'] },
                    { m: '随访台账', v: ['填写', '填写', '填写', '阅读', '打卡', '—'] },
                    { m: '质控指标与报表', v: ['阅读', '—', '导出', '导出', '—', '导出'] },
                    { m: '提醒模板配置', v: ['—', '—', '配置', '—', '开关语音', '配置'] },
                    { m: '知识库维护', v: ['审核', '阅读', '配置', '阅读', '使用', '配置'] },
                    { m: '接口联调', v: ['—', '—', '—', '—', '—', '配置'] },
                    { m: '审计日志', v: ['阅读', '—', '阅读', '阅读', '—', '阅读'] },
                  ].map((row) => (
                    <tr key={row.m} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{row.m}</td>
                      {row.v.map((c, i) => (
                        <td key={i} className="px-3 py-2 text-center">
                          {c === '—' ? <span className="text-slate-300">—</span> : <span className={cn('chip', c.includes('配置') || c.includes('闭环') || c.includes('导出') ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>{c}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 模板编辑 */}
      <Modal open={!!editTpl} onClose={() => setEditTpl(null)} title={editTpl && state.templates.some((t) => t.id === editTpl.id) ? '编辑提醒模板' : '新增提醒模板'} width="max-w-2xl"
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEditTpl(null)}>取消</button><button className="btn-primary" onClick={() => { if (editTpl) { saveTemplate(editTpl, state.userName || roleText(role), role); setEditTpl(null) } }}><Save className="h-4 w-4" />保存（待审核）</button></div>}>
        {editTpl && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">阶段</span>
                <select className="input mt-1" value={editTpl.phase} onChange={(e) => setEditTpl({ ...editTpl, phase: e.target.value as any })}>
                  <option value="pre">化疗前</option><option value="during">化疗中</option><option value="post">化疗后居家</option>
                </select>
              </label>
              <label className="block"><span className="label">触发时间（相对化疗开始，小时）</span>
                <input className="input mt-1" type="number" value={editTpl.offsetHours} onChange={(e) => setEditTpl({ ...editTpl, offsetHours: Number(e.target.value) })} />
              </label>
            </div>
            <label className="block"><span className="label">标题</span>
              <input className="input mt-1" value={editTpl.title} onChange={(e) => setEditTpl({ ...editTpl, title: e.target.value })} />
            </label>
            <label className="block"><span className="label">推送文字内容</span>
              <textarea className="input mt-1 min-h-[80px]" value={editTpl.body} onChange={(e) => setEditTpl({ ...editTpl, body: e.target.value })} />
            </label>
            <label className="block"><span className="label">语音播报文案（口语化，可留空则用文字内容）</span>
              <textarea className="input mt-1 min-h-[70px]" value={editTpl.voiceText} onChange={(e) => setEditTpl({ ...editTpl, voiceText: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">适用风险等级</span>
                <select className="input mt-1" value={editTpl.riskFilter === 'all' ? 'all' : editTpl.riskFilter[0]}
                  onChange={(e) => setEditTpl({ ...editTpl, riskFilter: e.target.value === 'all' ? 'all' : [e.target.value as RiskLevel] })}>
                  <option value="all">全部患者</option><option value="low">低危</option><option value="mid">中危</option><option value="high">高危</option>
                </select>
              </label>
              <div>
                <span className="label">推送渠道</span>
                <div className="mt-1 flex gap-1.5">
                  {[['push', '小程序推送'], ['voice', 'AI 语音'], ['sms', '短信']].map(([k, l]) => (
                    <button key={k} onClick={() => setEditTpl({ ...editTpl, channel: editTpl.channel.includes(k as any) ? editTpl.channel.filter((c) => c !== k) : [...editTpl.channel, k as any] })}
                      className={cn('rounded-[2px] border px-2 py-1.5 text-[11px]', editTpl.channel.includes(k as any) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500')}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[2px] bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              保存后状态为“待审核”，需肿瘤科专科医护（护士长/医生）审核通过后才会实际推送给患者。
            </div>
          </div>
        )}
      </Modal>

      {/* 宣教编辑 */}
      <Modal open={!!editEdu} onClose={() => setEditEdu(null)} title="编辑宣教素材" width="max-w-2xl"
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEditEdu(null)}>取消</button><button className="btn-primary" onClick={() => { if (editEdu) { saveEducation({ ...editEdu, keyPoints: editEdu.keyPoints.filter(Boolean), tags: editEdu.tags }, state.userName || roleText(role), role); setEditEdu(null) } }}><Save className="h-4 w-4" />保存</button></div>}>
        {editEdu && (
          <div className="space-y-3">
            <label className="block"><span className="label">标题</span>
              <input className="input mt-1" value={editEdu.title} onChange={(e) => setEditEdu({ ...editEdu, title: e.target.value })} />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block"><span className="label">阶段</span>
                <select className="input mt-1" value={editEdu.phase} onChange={(e) => setEditEdu({ ...editEdu, phase: e.target.value as any })}>
                  <option value="pre">化疗前</option><option value="during">化疗中</option><option value="post">化疗后</option>
                </select>
              </label>
              <label className="block"><span className="label">形式</span>
                <select className="input mt-1" value={editEdu.form} onChange={(e) => setEditEdu({ ...editEdu, form: e.target.value as any })}>
                  <option>图文</option><option>语音</option><option>短视频</option><option>图文+语音</option>
                </select>
              </label>
              <label className="block"><span className="label">版本</span>
                <input className="input mt-1" value={editEdu.version} onChange={(e) => setEditEdu({ ...editEdu, version: e.target.value })} />
              </label>
            </div>
            <label className="block"><span className="label">正文内容</span>
              <textarea className="input mt-1 min-h-[120px]" value={editEdu.body} onChange={(e) => setEditEdu({ ...editEdu, body: e.target.value })} />
            </label>
            <label className="block"><span className="label">要点（每行一条）</span>
              <textarea className="input mt-1 min-h-[60px]" value={editEdu.keyPoints.join('\n')} onChange={(e) => setEditEdu({ ...editEdu, keyPoints: e.target.value.split('\n') })} />
            </label>
            <label className="block"><span className="label">标签（逗号分隔）</span>
              <input className="input mt-1" value={editEdu.tags.join('、')} onChange={(e) => setEditEdu({ ...editEdu, tags: e.target.value.split(/[、,]/).map((s) => s.trim()).filter(Boolean) })} />
            </label>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
