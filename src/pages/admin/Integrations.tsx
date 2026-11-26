import React, { useState } from 'react'
import {
  Activity, Cable, CheckCircle2, Database, Download, FileJson, FlaskConical, RefreshCw,
  Server, ShieldCheck, Upload, Wifi, Zap, MessageSquare, PlayCircle,
} from 'lucide-react'
import { useApp, ingestLab, ingestVital, roleText, resetState } from '../../store/app'
import type { NavKey } from '../../components/AppShell'
import { AppShell } from '../../components/AppShell'
import { Badge, Empty, Tabs, cn } from '../../components/ui'
import { downloadJson } from '../../lib/qc'
import { fmtDate } from '../../lib/date'

const IFACES = [
  { id: 'his', name: 'HIS 医院信息系统', proto: 'HL7 v2.5 / FHIR R4', dir: '单向读取', fields: ['患者基本信息', '化疗医嘱', '药物属性（发泡剂/高致敏）', '预处理医嘱'], status: '已连接', latency: 42, token: 'Bearer ********（OAuth2 客户端凭证）' },
  { id: 'lis', name: 'LIS 检验系统', proto: 'HL7 v2.5 ORU^R01', dir: '单向读取 + 回写标记', fields: ['血常规 WBC/ANC/PLT/Hb', '肝肾功能', 'CRP/PCT'], status: '已连接', latency: 38, token: 'Bearer ********' },
  { id: 'msg', name: '院内消息推送平台', proto: 'HTTP REST', dir: '双向', fields: ['站内消息', '短信补发', '企业微信/钉钉'], status: '已连接', latency: 65, token: 'API Key ********' },
  { id: 'monitor', name: '床旁监护 / 输液泵', proto: 'MQTT over TLS', dir: '单向订阅', fields: ['体温', '心率', '血压', '血氧', '泵速/余量'], status: '已连接', latency: 18, token: 'mTLS 证书' },
]

const API_LIST = [
  { m: 'GET', p: '/api/v1/patients', d: '患者列表（脱敏）', auth: 'nurse/doctor' },
  { m: 'GET', p: '/api/v1/patients/{id}/assessments', d: '历史评估调阅', auth: 'nurse/doctor' },
  { m: 'POST', p: '/api/v1/assessments', d: '提交风险评估并生成随访计划', auth: 'nurse/headnurse' },
  { m: 'POST', p: '/api/v1/adr-events', d: 'ADR 上报（自动匹配 SOP）', auth: 'nurse/doctor' },
  { m: 'PATCH', p: '/api/v1/adr-events/{id}', d: '处置 / 复评 / 闭环', auth: 'nurse/doctor/headnurse' },
  { m: 'POST', p: '/api/v1/symptom-reports', d: '居家症状上报（CTCAE 分级 + 预警）', auth: 'patient' },
  { m: 'POST', p: '/api/v1/ai/ask', d: 'AI 语音问答（知识库限定 + 转人工）', auth: 'patient' },
  { m: 'GET', p: '/api/v1/followups', d: '随访台账（状态/迟访/漏访）', auth: 'nurse/headnurse/qc' },
  { m: 'GET', p: '/api/v1/qc/summary', d: '质控指标汇总', auth: 'headnurse/qc' },
  { m: 'GET', p: '/api/v1/qc/hfmea.csv', d: 'HFMEA 报表导出', auth: 'headnurse/qc' },
  { m: 'POST', p: '/api/v1/integrations/lis/results', d: 'LIS 结果推送（自动研判骨髓抑制）', auth: 'service-token' },
  { m: 'POST', p: '/api/v1/integrations/device/vitals', d: '监护数据推送（异常弹窗预警）', auth: 'service-token' },
]

export default function Integrations({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const state = useApp()
  const [tab, setTab] = useState<'ifaces' | 'test' | 'api'>('ifaces')
  const [selectedPatient, setSelectedPatient] = useState(state.patients[0].id)
  const [anc, setAnc] = useState('0.86')
  const [plt, setPlt] = useState('58')
  const [wbc, setWbc] = useState('1.9')
  const [hb, setHb] = useState('96')
  const [log, setLog] = useState<{ at: string; ok: boolean; msg: string }[]>([])
  const [vital, setVital] = useState({ temp: '38.3', hr: '116', sbp: '88', spo2: '92' })
  const [testing, setTesting] = useState<string | null>(null)

  const pushLab = () => {
    const p = state.patients.find((x) => x.id === selectedPatient)
    const findings = ingestLab({
      patientId: selectedPatient,
      at: new Date().toISOString(),
      wbc: Number(wbc), anc: Number(anc), plt: Number(plt), hb: Number(hb),
      orderId: `LIS-${fmtDate(new Date()).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900 + 100))}`,
      source: 'LIS',
    })
    setLog((l) => [{ at: new Date().toLocaleTimeString('zh-CN'), ok: true, msg: `LIS 推送成功 → ${p?.name}：自动研判 ${findings.length} 项异常${findings.length ? `（${findings.map((f) => `${f.term} ${f.grade} 级`).join('、')}）` : ''}` }, ...l])
  }

  const pushVital = () => {
    const p = state.patients.find((x) => x.id === selectedPatient)
    const abnormal = ingestVital({
      patientId: selectedPatient, at: new Date().toISOString(),
      hr: Number(vital.hr), sbp: Number(vital.sbp), dbp: 58, spo2: Number(vital.spo2), temp: Number(vital.temp),
      pumpRate: 120, remaining: 160,
    })
    setLog((l) => [{ at: new Date().toLocaleTimeString('zh-CN'), ok: true, msg: `监护数据推送 → ${p?.name}：${abnormal ? '超出阈值，已触发床旁弹窗与站内预警' : '生命体征在阈值内，已同步'}` }, ...l])
  }

  const testIface = (id: string) => {
    setTesting(id)
    setTimeout(() => {
      setTesting(null)
      setLog((l) => [{ at: new Date().toLocaleTimeString('zh-CN'), ok: true, msg: `连通性测试成功：${IFACES.find((i) => i.id === id)?.name}（往返 ${20 + Math.floor(Math.random() * 60)}ms）` }, ...l])
    }, 900)
  }

  return (
    <AppShell
      active="integrations"
      onNavigate={onNavigate}
      title="接口集成联调"
      subtitle="HIS / LIS / 消息平台 / 监护设备 · 数据标准与隐私脱敏 · 等保三级合规要求"
      actions={<>
        <button className="btn-ghost" onClick={() => downloadJson('接口配置导出', { interfaces: IFACES, apis: API_LIST })}><Download className="h-4 w-4" />导出接口清单</button>
        <button className="btn-primary" onClick={pushLab}><Zap className="h-4 w-4" />快速注入检验结果</button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: '已连接接口', v: `${IFACES.length}/${IFACES.length}`, t: 'emerald', i: Cable },
            { l: '平均往返时延', v: `${Math.round(IFACES.reduce((s, i) => s + i.latency, 0) / IFACES.length)}ms`, t: 'brand', i: Wifi },
            { l: '今日接收报文', v: state.labs.length + state.vitals.length, t: 'slate', i: Server },
            { l: '自动研判异常', v: state.adrs.filter((a) => a.source === 'lis').length, t: 'amber', i: Activity },
          ].map((s) => {
            const Icon = s.i
            return (
              <div key={s.l} className="card flex items-center gap-3 p-3.5">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg',
                  s.t === 'emerald' ? 'bg-emerald-50 text-emerald-600' : s.t === 'brand' ? 'bg-brand-50 text-brand-700' : s.t === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-500">{s.l}</p>
                  <p className="text-base font-semibold text-slate-800 tnum">{s.v}</p>
                </div>
              </div>
            )
          })}
        </div>

        <Tabs value={tab} onChange={setTab} tabs={[
          { key: 'ifaces', label: '接口清单与连通性' },
          { key: 'test', label: '联调（模拟推送）' },
          { key: 'api', label: 'REST API 规范' },
        ]} />

        {tab === 'ifaces' && (
          <div className="grid gap-3 lg:grid-cols-2">
            {IFACES.map((i) => (
              <section key={i.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">{i.name}</p>
                      <Badge tone="emerald"><CheckCircle2 className="h-3 w-3" />{i.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{i.proto} · {i.dir} · 时延 {i.latency}ms</p>
                  </div>
                  <button className="btn-ghost !px-2 !py-1 text-[11px]" disabled={testing === i.id} onClick={() => testIface(i.id)}>
                    <RefreshCw className={cn('h-3 w-3', testing === i.id && 'animate-spin')} />{testing === i.id ? '测试中…' : '测试连通'}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {i.fields.map((f) => <Badge key={f} tone="slate">{f}</Badge>)}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">认证：{i.token}</p>
              </section>
            ))}
          </div>
        )}

        {tab === 'test' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <h2 className="section-title mb-2 flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-brand-600" />模拟 LIS 血常规推送</h2>
              <label className="block"><span className="label">患者</span>
                <select className="input mt-1" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                  {state.patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.regimen}</option>)}
                </select>
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  { l: 'ANC', v: anc, s: setAnc },
                  { l: 'WBC', v: wbc, s: setWbc },
                  { l: 'PLT', v: plt, s: setPlt },
                  { l: 'Hb', v: hb, s: setHb },
                ].map((x) => (
                  <label key={x.l} className="block">
                    <span className="label">{x.l}（×10⁹/L）</span>
                    <input className="input mt-1 text-center" value={x.v} onChange={(e) => x.s(e.target.value)} inputMode="decimal" />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { l: '3 级骨髓抑制', set: () => { setAnc('0.86'); setPlt('52'); setWbc('1.9'); setHb('96') } },
                  { l: '4 级 ANC', set: () => { setAnc('0.32'); setPlt('28'); setWbc('1.1'); setHb('78') } },
                  { l: '正常', set: () => { setAnc('3.2'); setPlt('186'); setWbc('5.8'); setHb('124') } },
                ].map((q) => (
                  <button key={q.l} className="chip bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={q.set}>{q.l}示例</button>
                ))}
              </div>
              <button className="btn-primary mt-3 w-full" onClick={pushLab}><Upload className="h-4 w-4" />推送并自动研判</button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                推送后系统按 CTCAE 阈值判定：ANC&lt;1.0（3 级）或 PLT&lt;50（3 级）将自动创建 ADR 事件、推送责任护士并进入闭环。
              </p>
            </section>

            <section className="card p-4">
              <h2 className="section-title mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-brand-600" />模拟监护 / 输液泵数据</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: '体温（℃）', k: 'temp' },
                  { l: '心率（bpm）', k: 'hr' },
                  { l: '收缩压（mmHg）', k: 'sbp' },
                  { l: '血氧（%）', k: 'spo2' },
                ].map((x) => (
                  <label key={x.k} className="block">
                    <span className="label">{x.l}</span>
                    <input className="input mt-1" value={(vital as any)[x.k]} onChange={(e) => setVital({ ...vital, [x.k]: e.target.value })} inputMode="decimal" />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button className="chip bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setVital({ temp: '38.3', hr: '116', sbp: '88', spo2: '92' })}>异常示例</button>
                <button className="chip bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setVital({ temp: '36.7', hr: '84', sbp: '118', spo2: '97' })}>正常示例</button>
              </div>
              <button className="btn-primary mt-3 w-full" onClick={pushVital}><Activity className="h-4 w-4" />推送监护数据</button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                阈值：体温 ≥38.0℃ / 心率 &gt;110 / 收缩压 &lt;90 / 血氧 &lt;94% 任一命中即弹窗预警并推送站内消息。
              </p>
            </section>

            <section className="card overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <h2 className="section-title flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-slate-400" />联调日志</h2>
                <button className="text-[11px] text-slate-400 hover:text-brand-600" onClick={() => setLog([])}>清空</button>
              </div>
              {log.length === 0 && <div className="p-3"><Empty title="暂无联调记录" hint="点击上方推送按钮模拟接口调用" /></div>}
              <div className="max-h-60 divide-y divide-slate-50 overflow-y-auto">
                {log.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 px-4 py-2 text-[11px]">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                    <span className="text-slate-400">{l.at}</span>
                    <span className="text-slate-600">{l.msg}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'api' && (
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="section-title flex items-center gap-1.5"><FileJson className="h-3.5 w-3.5 text-brand-600" />REST API 规范（演示接口）</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">演示版为前端本地数据模式；下方同一套接口由随附的 Node 服务（server/index.mjs）完整实现，可切换为服务端持久化。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">方法</th>
                    <th className="px-3 py-2 font-medium">路径</th>
                    <th className="px-3 py-2 font-medium">说明</th>
                    <th className="px-4 py-2 font-medium">权限</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {API_LIST.map((a) => (
                    <tr key={`${a.m}${a.p}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2"><span className={cn('chip font-semibold', a.m === 'GET' ? 'bg-emerald-100 text-emerald-700' : a.m === 'POST' ? 'bg-brand-100 text-brand-800' : 'bg-amber-100 text-amber-700')}>{a.m}</span></td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{a.p}</td>
                      <td className="px-3 py-2 text-slate-600">{a.d}</td>
                      <td className="px-4 py-2 text-slate-500">{a.auth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
              <p><strong>安全要求：</strong>HTTPS（TLS 1.2+）、OAuth2 客户端凭证 + JWT 鉴权、患者标识使用院内脱敏 ID、审计日志留存 ≥6 个月、数据不出院内网（演示环境为公网静态部署，不含真实数据）。</p>
              <p className="mt-1"><strong>数据标准：</strong>符合等保三级（《GB/T 22239 信息安全技术 网络安全等级保护基本要求》）、WS 445 电子病历基本数据集、HL7 FHIR R4 资源映射。</p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
