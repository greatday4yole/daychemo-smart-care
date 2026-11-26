import React, { useMemo } from 'react'
import { useApp, setSession, patientById } from '../store/app'
import type { Role } from '../types'
import { cn, Badge } from '../components/ui'
import { fmtDate } from '../lib/date'

const ROLE_CARDS: { role: Role; name: string; title: string; desc: string; tone: string; icon: string; perms: string[] }[] = [
  { role: 'nurse', name: '李晓梅', title: '责任护士', desc: '风险评估、床旁上报、巡视打卡、随访干预', tone: 'brand', icon: '🩺', perms: ['评估', '监测', '上报', '随访'] },
  { role: 'doctor', name: '王建国', title: '主管医生（主任医师）', desc: '医嘱处置、ADR 复评、随访计划审核、质控查看', tone: 'sky', icon: '👨‍⚕️', perms: ['处置', '复评', '审核', '质控查看'] },
  { role: 'headnurse', name: '张海燕', title: '日间化疗中心护士长', desc: '排班与流程配置、宣教话术维护、看板与报表导出', tone: 'violet', icon: '👩‍💼', perms: ['配置', '知识库', '报表', '审计'] },
  { role: 'qc', name: '陈静', title: '护理质控员', desc: 'HFMEA、品管圈数据导出与追溯核查', tone: 'emerald', icon: '📊', perms: ['统计', '导出', '追溯'] },
  { role: 'admin', name: '系统管理员', title: '信息科 / 运维', desc: '接口联调、权限分级、数据字典与备份', tone: 'navy', icon: '⚙️', perms: ['接口', '权限', '备份'] },
  { role: 'patient', name: '周晓芸', title: '患者端（H5 / 微信小程序）', desc: '语音提醒、症状上报、AI 问答、宣教与随访打卡', tone: 'rose', icon: '🧑‍🦳', perms: ['语音提醒', '上报', 'AI 问答'] },
]

export default function Login() {
  const state = useApp()

  const stats = useMemo(() => {
    const high = state.patients.filter((p) => p.risk === 'high').length
    const adrOpen = state.adrs.filter((a) => a.status !== 'closed').length
    return { high, adrOpen, total: state.patients.length }
  }, [state.patients, state.adrs])

  return (
    <div className="min-h-full bg-gradient-to-br from-brand-950 via-brand-900 to-navy-950">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        {/* 品牌头部 */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-400/20 text-2xl ring-1 ring-brand-300/30">⚕</div>
              <div>
                <p className="text-xs font-medium tracking-wide text-brand-200/80">DAY-CHEMO SMART CARE PLATFORM</p>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">日间化疗患者智慧照护系统</h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-100/80">
              覆盖化疗前风险评估 → 化疗中实时监控 → 化疗后居家随访全周期，融合 AI 语音交互、分层智能提醒、
              骨髓抑制/过敏风险预警与不良反应闭环处置，支撑 HFMEA 品管圈风险管控落地。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['流程闭环', 'AI 语音提醒', 'CTCAE 自动分级', 'ADR 闭环处置', '质控可追溯'].map((t) => (
                <span key={t} className="chip bg-white/10 text-brand-100 ring-1 ring-white/15">{t}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[280px]">
            {[
              { l: '在管患者', v: stats.total },
              { l: '高危患者', v: stats.high },
              { l: '待闭环 ADR', v: stats.adrOpen },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
                <p className="text-xl font-semibold text-white tnum">{s.v}</p>
                <p className="mt-0.5 text-[11px] text-brand-200/70">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 角色入口 */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/90">演示账号一键进入 <span className="ml-1 text-xs font-normal text-brand-200/60">（权限分级演示，无需密码）</span></h2>
            <span className="hidden text-xs text-brand-200/50 sm:block">今天 {fmtDate(new Date())}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_CARDS.map((c) => (
              <button
                key={c.role}
                onClick={() => setSession(c.role, c.name)}
                className="group relative overflow-hidden rounded-2xl bg-white/95 p-4 text-left ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:shadow-float"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">{c.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                      <span className="text-slate-300">·</span>
                      <p className="truncate text-xs text-slate-500">{c.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.desc}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.perms.map((p) => (
                    <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{p}</span>
                  ))}
                </div>
                <span className={cn('absolute right-4 top-4 text-xs font-medium opacity-0 transition group-hover:opacity-100', 'text-brand-600')}>进入 →</span>
              </button>
            ))}
          </div>
        </div>

        {/* 场景说明 */}
        <div className="mt-8 grid gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:grid-cols-3">
          {[
            { t: '护士端演示路径', d: '工作台 → 高危看板 → 化疗前评估 → 巡视打卡 → ADR 上报 → 随访干预' },
            { t: '患者端演示路径', d: '语音提醒 → 症状上报（体温/不适）→ AI 语音问答 → 一键转医护 → 宣教与随访打卡' },
            { t: '质控/管理路径', d: '质控看板（完成率/覆盖率/漏访）→ HFMEA 与品管圈报表导出 → 提醒模板与知识库配置' },
          ].map((s) => (
            <div key={s.t}>
              <p className="text-xs font-semibold text-white/90">{s.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-brand-200/70">{s.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-brand-200/50">
          本项目为需求方案演示环境，使用虚构数据，不含任何真实患者信息。AI 仅提供宣教指引与风险分流，不替代执业医师诊疗。
          <br />© 2024 日间化疗智慧照护系统 · 演示版 v1.0
        </p>
      </div>
    </div>
  )
}
