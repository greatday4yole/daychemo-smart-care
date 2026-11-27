import React, { useMemo } from 'react'
import { ChevronRight, ShieldCheck, Stethoscope, Users } from 'lucide-react'
import { useApp, setSession } from '../store/app'
import type { Role } from '../types'
import { cn } from '../components/ui'
import { BrandLogo, LOGO_FULL } from '../components/Brand'
import { fmtDate } from '../lib/date'

const ROLE_CARDS: { role: Role; name: string; title: string; desc: string; icon: string; perms: string[] }[] = [
  { role: 'nurse', name: '李晓梅', title: '责任护士', desc: '风险评估、床旁上报、巡视打卡、随访干预', icon: '🩺', perms: ['评估', '监测', '上报', '随访'] },
  { role: 'doctor', name: '王建国', title: '主管医生 · 主任医师', desc: '医嘱处置、ADR 复评、随访计划审核、质控查看', icon: '👨‍⚕️', perms: ['处置', '复评', '审核', '质控'] },
  { role: 'headnurse', name: '张海燕', title: '日间化疗中心护士长', desc: '流程配置、宣教话术维护、看板与报表导出', icon: '👩‍💼', perms: ['配置', '知识库', '报表', '审计'] },
  { role: 'qc', name: '陈静', title: '护理质控员', desc: 'HFMEA、品管圈数据导出与追溯核查', icon: '📊', perms: ['统计', '导出', '追溯'] },
  { role: 'admin', name: '系统管理员', title: '信息科 / 运维', desc: '接口联调、权限分级、数据字典与备份', icon: '⚙️', perms: ['接口', '权限', '备份'] },
  { role: 'patient', name: '周晓芸', title: '患者端（H5 / 微信小程序）', desc: '语音提醒、症状上报、AI 问答、宣教与随访打卡', icon: '🧑‍🦳', perms: ['语音提醒', '上报', 'AI 问答'] },
]

export default function Login() {
  const state = useApp()
  const stats = useMemo(() => {
    const high = state.patients.filter((p) => p.risk === 'high').length
    const adrOpen = state.adrs.filter((a) => a.status !== 'closed').length
    return { high, adrOpen, total: state.patients.length }
  }, [state.patients, state.adrs])

  return (
    <div className="min-h-full bg-white">
      {/* 顶部工具条 */}
      <div className="border-b border-[#e6ecf3] bg-[#f7f9fc]">
        <div className="mx-auto flex h-9 max-w-[1360px] items-center justify-between px-5 text-[11px] text-slate-500">
          <p className="hidden sm:block">上海长海医院（海军军医大学第一附属医院）· 肿瘤内科日间化疗中心</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />系统运行正常</span>
            <span className="text-slate-300">|</span>
            <span>演示环境 · 数据均为虚构</span>
          </div>
        </div>
      </div>

      {/* 品牌区 */}
      <div className="border-b border-[#e6ecf3] bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <img src={LOGO_FULL} alt="上海长海医院 CHANGHAI HOSPITAL" className="h-12 w-auto sm:h-14" />
          <div className="text-right">
            <p className="text-[15px] font-semibold text-brand-800">日间化疗患者智慧照护系统</p>
            <p className="mt-0.5 text-[11px] tracking-wide text-slate-400">DAY-CHEMO SMART CARE PLATFORM · v1.1</p>
          </div>
        </div>
      </div>

      {/* 主导航示意（机构风格） */}
      <nav className="bg-brand-600">
        <div className="mx-auto flex max-w-[1360px] items-center gap-1 overflow-x-auto px-5">
          {['首页', '走进科室', '健康科普', '就医指南', '日间化疗', '智慧照护', '质控管理'].map((t, i) => (
            <span
              key={t}
              className={cn(
                'shrink-0 px-3.5 py-2.5 text-[13px]',
                i === 4 ? 'bg-brand-700 font-semibold text-white' : 'text-brand-100/85',
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </nav>

      {/* 横幅：深蓝渐变 + 宣示语 */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }} />
        <div className="relative mx-auto flex max-w-[1360px] flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[.22em] text-brand-200">PATIENT-CENTERED CONTINUOUS CARE</p>
            <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
              化疗前评估 · 化疗中监控 · 化疗后随访
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-brand-100/85">
              覆盖日间化疗全流程的一体化照护平台。融合 AI 语音交互、分层智能提醒、骨髓抑制与过敏风险预警、
              不良反应闭环处置，落实 HFMEA 品管圈风险管控，保障患者化疗安全。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['流程闭环', 'AI 语音交互', 'CTCAE 自动分级', 'ADR 闭环', '质控可追溯'].map((t) => (
                <span key={t} className="border border-white/25 px-2.5 py-1 text-[11px] text-white/90">{t}</span>
              ))}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-px bg-white/20 sm:w-[300px]">
            {[
              { l: '在管患者', v: stats.total },
              { l: '高危患者', v: stats.high },
              { l: '待闭环 ADR', v: stats.adrOpen },
            ].map((s) => (
              <div key={s.l} className="bg-brand-700/80 px-3 py-3 text-center">
                <p className="text-xl font-semibold text-white tnum">{s.v}</p>
                <p className="mt-0.5 text-[10px] text-brand-200">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 主体：左侧说明 + 右侧角色入口 */}
      <div className="mx-auto grid max-w-[1360px] gap-6 px-5 py-7 lg:grid-cols-[1fr_360px]">
        {/* 角色入口 */}
        <div>
          <div className="flex items-end justify-between border-b-2 border-brand-600 pb-2">
            <h2 className="heading-bar border-l-0 pl-0 text-[16px]">演示账号 · 角色入口</h2>
            <span className="text-[11px] text-slate-400">权限分级演示，无需密码 · {fmtDate(new Date())}</span>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {ROLE_CARDS.map((c) => (
              <button
                key={c.role}
                onClick={() => setSession(c.role, c.name)}
                className="group flex flex-col justify-between border border-[#e0e6ee] bg-white p-3.5 text-left transition hover:border-brand-400 hover:shadow-card"
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e0e6ee] bg-[#f7f9fc] text-lg">{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{c.name}</p>
                      <p className="truncate text-[10.5px] text-slate-500">{c.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{c.desc}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {c.perms.map((p) => (
                      <span key={p} className="bg-[#f2f5f9] px-1.5 py-0.5 text-[10px] text-slate-500">{p}</span>
                    ))}
                  </div>
                  <span className="flex items-center gap-0.5 text-[11px] font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                    进入 <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* 演示路径 */}
          <div className="mt-6 border border-[#e0e6ee]">
            <div className="heading-block">推荐演示路径</div>
            <div className="grid divide-y divide-[#eef2f7] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { t: '护士端', d: '工作台 → 高危看板 → 化疗前评估 → 巡视打卡 → ADR 上报 → 随访干预' },
                { t: '患者端', d: '语音提醒 → 症状上报（体温/不适）→ AI 语音问答 → 一键转医护 → 宣教与随访' },
                { t: '质控 / 管理', d: '质控看板（完成率/覆盖率/漏访）→ HFMEA 与品管圈导出 → 提醒模板与知识库配置' },
              ].map((s) => (
                <div key={s.t} className="p-3.5">
                  <p className="text-[12px] font-semibold text-brand-800">{s.t}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧栏 */}
        <aside className="space-y-4">
          <div className="border border-[#e0e6ee]">
            <div className="heading-block">系统能力</div>
            <div className="divide-y divide-[#eef2f7]">
              {[
                { i: ShieldCheck, t: '风险前置管控', d: '14 项评估自动分级，高危自动加密监测与随访' },
                { i: Stethoscope, t: '不良反应闭环', d: '13 条 SOP，LIS 自动研判，五态闭环留痕' },
                { i: Users, t: '随访闭环台账', d: '迟访/漏访自动二次提醒，医护可干预' },
              ].map((x) => {
                const Icon = x.i
                return (
                  <div key={x.t} className="flex items-start gap-2.5 p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{x.t}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{x.d}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border border-[#e0e6ee]">
            <div className="heading-block">患者端直达</div>
            <div className="space-y-2 p-3">
              <p className="text-[11px] leading-relaxed text-slate-500">手机扫码或点击链接，免登录进入患者端体验语音提醒与症状上报。</p>
              <button
                onClick={() => { window.location.hash = '#/patient' }}
                className="btn-primary w-full"
              >
                进入患者端 H5
              </button>
              <button
                onClick={() => { window.location.hash = '#/bedside' }}
                className="btn-ghost w-full"
              >
                进入床头端
              </button>
            </div>
          </div>

          <div className="border border-[#e0e6ee] p-3">
            <p className="text-[11px] leading-relaxed text-slate-500">
              本项目为需求方案演示环境，使用虚构数据，不含任何真实患者信息。AI 仅提供宣教指引与风险分流，不替代执业医师诊疗。
            </p>
          </div>
        </aside>
      </div>

      {/* 页脚 */}
      <footer className="border-t border-[#e6ecf3] bg-[#f7f9fc] px-5 py-5">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-1.5 text-[11px] leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>上海长海医院 · 肿瘤内科日间化疗中心 ｜ 日间化疗患者智慧照护系统</p>
          <p className="text-slate-400">© 2026 演示版 v1.1 · 等保三级建设要求 · 数据不出院内网</p>
        </div>
      </footer>
    </div>
  )
}
