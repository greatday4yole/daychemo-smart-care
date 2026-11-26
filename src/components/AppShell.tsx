import React from 'react'
import {
  Activity, AlarmClock, BadgeCheck, BarChart3, Bell, ClipboardList, Database, FileText,
  HeartPulse, LayoutDashboard, LogOut, MessageSquareHeart, Phone, Settings2, ShieldCheck, Stethoscope, Users,
} from 'lucide-react'
import { useApp, setSession, roleText } from '../store/app'
import type { Role } from '../types'
import { cn, Badge } from '../components/ui'

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 侧栏 */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">⚕</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">日间化疗智慧照护</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Smart Care Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
              <div className="space-y-0.5">
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
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                          isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400')} />
                        <span className="truncate">{n.label}</span>
                        {n.key === 'adr' && state.adrs.some((a) => a.status !== 'closed') && (
                          <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-600">
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

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => { window.location.hash = '#/patient' }}
            className="mb-2 flex w-full items-center gap-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[13px] font-medium text-rose-700 hover:bg-rose-100"
            title="需切换至患者端"
          >
            <MessageSquareHeart className="h-4 w-4" />
            查看患者端
          </button>
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {state.userName.slice(0, 1) || roleText(role).slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-800">{state.userName || roleText(role)}</p>
              <p className="text-[10px] text-slate-400">{roleText(role)}</p>
            </div>
            <button onClick={() => setSession(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="退出登录">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 内容区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-slate-900 lg:text-base">{title}</h1>
              {subtitle && <p className="truncate text-[11px] text-slate-500 lg:text-xs">{subtitle}</p>}
            </div>
            <div className="hidden items-center gap-2 md:flex">{actions}</div>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => onNavigate('workbench')}
                  className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="通知"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              </div>
              <Badge tone="brand" className="hidden lg:inline-flex">
                <ShieldCheck className="h-3 w-3" /> {roleText(role)}权限
              </Badge>
              <button onClick={() => setSession(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="退出">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* 移动端导航 */}
          <div className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => onNavigate(n.key)}
                className={cn(
                  'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium',
                  active === n.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </header>
        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-5">{children}</main>
      </div>
    </div>
  )
}
