import React from 'react'
import {
  Activity, BarChart3, Bell, ClipboardList, Database, HeartPulse, LayoutDashboard, LogOut,
  MessageSquareHeart, Phone, Settings2, ShieldCheck, Stethoscope, UserRound,
} from 'lucide-react'
import { useApp, setSession, roleText } from '../store/app'
import type { Role } from '../types'
import { cn, Badge } from '../components/ui'
import { BrandLogo, TopBar, SiteFooter } from '../components/Brand'

export type NavKey =
  | 'workbench' | 'monitor' | 'assess' | 'followup' | 'adr' | 'qc' | 'config' | 'kb' | 'audit' | 'integrations'

const NAV: { key: NavKey; label: string; icon: React.ElementType; roles: Role[]; group: string }[] = [
  { key: 'workbench', label: '工作台 / 风险看板', icon: LayoutDashboard, roles: ['doctor', 'nurse', 'headnurse', 'qc'], group: '临床照护' },
  { key: 'monitor', label: '化疗中实时监控', icon: Activity, roles: ['doctor', 'nurse', 'headnurse'], group: '临床照护' },
  { key: 'assess', label: '化疗前风险评估', icon: ClipboardList, roles: ['nurse', 'headnurse'], group: '临床照护' },
  { key: 'followup', label: '随访与居家照护', icon: Phone, roles: ['doctor', 'nurse', 'headnurse', 'qc'], group: '临床照护' },
  { key: 'adr', label: '不良反应闭环', icon: HeartPulse, roles: ['doctor', 'nurse', 'headnurse', 'qc'], group: '临床照护' },
  { key: 'qc', label: '质控与数据统计', icon: BarChart3, roles: ['doctor', 'headnurse', 'qc', 'admin'], group: '质量管控' },
  { key: 'audit', label: '操作审计追溯', icon: ShieldCheck, roles: ['headnurse', 'qc', 'admin'], group: '质量管控' },
  { key: 'config', label: '提醒与配置中心', icon: Settings2, roles: ['headnurse', 'admin'], group: '系统管理' },
  { key: 'kb', label: '知识库管理', icon: Database, roles: ['headnurse', 'admin', 'doctor', 'qc'], group: '系统管理' },
  { key: 'integrations', label: '接口集成联调', icon: Stethoscope, roles: ['admin', 'headnurse', 'qc'], group: '系统管理' },
]

export const AppShell = ({
  active,
  onNavigate,
  children,
  title,
  subtitle,
  actions,
}: {
  active: NavKey
  onNavigate: (k: NavKey) => void
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) => {
  const state = useApp()
  const role = state.role!
  const nav = NAV.filter((n) => n.roles.includes(role))
  const groups = [...new Set(nav.map((n) => n.group))]
  const unread = state.notifications.filter((n) => !n.read && (n.targetRole === 'all' || n.targetRole.includes(role))).length
  const current = nav.find((n) => n.key === active)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar />

      {/* 主标题区：院徽 + 系统名 + 操作 */}
      <header className="border-b border-[#e6ecf3] bg-white">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <BrandLogo size="md" className="mr-auto" />
          <div className="hidden items-center gap-2 md:flex">{actions}</div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onNavigate('workbench')} className="relative rounded-[2px] p-2 text-slate-500 hover:bg-slate-100" aria-label="通知">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <span className="hidden items-center gap-1.5 border-l border-slate-200 pl-3 text-xs text-slate-600 lg:flex">
              <UserRound className="h-3.5 w-3.5 text-brand-600" />
              {state.userName || roleText(role)}
              <Badge tone="brand">{roleText(role)}</Badge>
            </span>
            <button onClick={() => setSession(null)} className="rounded-[2px] p-2 text-slate-500 hover:bg-slate-100" aria-label="退出登录" title="退出登录">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col lg:flex-row">
        {/* 侧栏 */}
        <aside className="hidden w-[228px] shrink-0 border-r border-[#e6ecf3] bg-[#f7f9fc] lg:block">
          <div className="sticky top-0 flex h-[calc(100vh-32px)] flex-col overflow-y-auto">
            <div className="heading-block">
              <ShieldCheck className="h-3.5 w-3.5" />
              {role === 'qc' ? '质控工作区' : role === 'admin' ? '系统管理' : '临床照护工作区'}
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
              {groups.map((g) => (
                <div key={g} className="mb-3">
                  <p className="px-4 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-400">{g}</p>
                  <div>
                    {nav
                      .filter((n) => n.group === g)
                      .map((n) => {
                        const Icon = n.icon
                        const isActive = active === n.key
                        return (
                          <button
                            key={n.key}
                            onClick={() => onNavigate(n.key)}
                            className={cn(
                              'flex w-full items-center gap-2.5 border-l-[3px] px-4 py-[9px] text-left text-[13px] transition',
                              isActive
                                ? 'border-brand-600 bg-white font-semibold text-brand-700'
                                : 'border-transparent text-slate-600 hover:bg-white/70 hover:text-brand-700',
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400')} />
                            <span className="truncate">{n.label}</span>
                            {n.key === 'adr' && state.adrs.some((a) => a.status !== 'closed') && (
                              <span className="ml-auto rounded-[2px] bg-accent-50 px-1.5 text-[10px] font-semibold text-accent-600">
                                {state.adrs.filter((a) => a.status !== 'closed').length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="space-y-1.5 border-t border-[#e6ecf3] p-3">
              <button
                onClick={() => { window.location.hash = '#/patient' }}
                className="flex w-full items-center gap-2 border border-brand-200 bg-white px-2.5 py-2 text-[12px] font-medium text-brand-700 hover:bg-brand-50"
              >
                <MessageSquareHeart className="h-3.5 w-3.5" />
                查看患者端
              </button>
              <button
                onClick={() => { window.location.hash = '#/bedside' }}
                className="flex w-full items-center gap-2 border border-[#dde5ef] bg-white px-2.5 py-2 text-[12px] text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                <Activity className="h-3.5 w-3.5" />
                查看床头端
              </button>
            </div>
          </div>
        </aside>

        {/* 内容区 */}
        <main className="min-w-0 flex-1 bg-white">
          <div className="border-b border-[#e6ecf3] px-4 pb-3 pt-4 lg:px-6">
            <p className="text-[11px] text-slate-400">
              首页 <span className="mx-1 text-slate-300">·</span> {current?.group ?? '临床照护'}
              <span className="mx-1 text-slate-300">·</span>
              <span className="text-slate-600">{current?.label ?? title}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <h1 className="heading-bar text-[17px] lg:text-[19px]">{title}</h1>
                {subtitle && <p className="mt-1 pl-3.5 text-[11px] text-slate-500 lg:text-xs">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 md:hidden">{actions}</div>
            </div>
          </div>

          {/* 移动端导航 */}
          <div className="flex gap-1 overflow-x-auto border-b border-[#e6ecf3] bg-[#f7f9fc] px-3 py-2 lg:hidden">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => onNavigate(n.key)}
                className={cn(
                  'whitespace-nowrap rounded-[2px] px-2.5 py-1 text-xs font-medium',
                  active === n.key ? 'bg-brand-600 text-white' : 'border border-[#e0e6ee] bg-white text-slate-600',
                )}
              >
                {n.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-4 lg:px-6 lg:py-5">{children}</div>
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}
