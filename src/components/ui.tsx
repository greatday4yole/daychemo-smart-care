import React from 'react'

export const cn = (...args: (string | false | null | undefined)[]) => args.filter(Boolean).join(' ')

export const Badge = ({ children, tone = 'slate', className }: { children: React.ReactNode; tone?: string; className?: string }) => {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    navy: 'bg-navy-100 text-navy-800',
  }
  return <span className={cn('chip', map[tone] ?? map.slate, className)}>{children}</span>
}

export const RiskBadge = ({ level }: { level: 'low' | 'mid' | 'high' }) => {
  const map = {
    low: { t: 'emerald', l: '低危' },
    mid: { t: 'amber', l: '中危' },
    high: { t: 'rose', l: '高危' },
  } as const
  const c = map[level]
  return (
    <Badge tone={c.t} className="font-semibold">
      <span className={cn('h-1.5 w-1.5 rounded-full', level === 'high' ? 'bg-rose-500' : level === 'mid' ? 'bg-amber-500' : 'bg-emerald-500')} />
      {c.l}
    </Badge>
  )
}

export const GradeBadge = ({ grade }: { grade: number }) => {
  const tones = ['bg-slate-100 text-slate-600', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-rose-100 text-rose-700', 'bg-rose-200 text-rose-800']
  return <span className={cn('chip font-semibold', tones[Math.min(5, Math.max(0, grade))])}>{grade === 0 ? '正常' : `${grade} 级`}</span>
}

export const Field = ({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) => (
  <label className="block space-y-1">
    <span className="label flex items-center gap-1">
      {label}
      {required && <span className="text-rose-500">*</span>}
      {hint && <span className="font-normal text-slate-400">（{hint}）</span>}
    </span>
    {children}
  </label>
)

export const Stat = ({ label, value, unit, hint, tone = 'slate', icon }: { label: string; value: React.ReactNode; unit?: string; hint?: string; tone?: string; icon?: React.ReactNode }) => {
  const toneMap: Record<string, string> = {
    slate: 'text-slate-900', brand: 'text-brand-700', rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-emerald-600',
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn('text-2xl font-semibold tnum', toneMap[tone])}>{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
    <p className="text-sm font-medium text-slate-600">{title}</p>
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
    {action}
  </div>
)

export const Progress = ({ value, tone = 'brand' }: { value: number; tone?: string }) => {
  const map: Record<string, string> = { brand: 'bg-brand-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full transition-all', map[tone] ?? map.brand)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export const Tabs = <T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) => (
  <div className="flex gap-1 overflow-x-auto rounded-[2px] bg-slate-100 p-1">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={cn(
          'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
          value === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {t.label}
        {t.count != null && <span className={cn('ml-1 text-xs', value === t.key ? 'text-brand-600' : 'text-slate-400')}>{t.count}</span>}
      </button>
    ))}
  </div>
)

export const Modal = ({ open, onClose, title, children, footer, width = 'max-w-2xl' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: string }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[3px] bg-white shadow-float sm:rounded-[3px] animate-slide-up', width)}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="关闭">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export const Toast = ({ message, stamp }: { message?: string; stamp?: string }) => {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2400)
    return () => clearTimeout(t)
  }, [message, stamp])
  if (!visible || !message) return null
  return (
    <div className="pointer-events-none fixed bottom-[100px] left-1/2 z-[60] -translate-x-1/2 animate-slide-up lg:bottom-6">
      <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-float">{message}</div>
    </div>
  )
}
