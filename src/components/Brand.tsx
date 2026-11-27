import React from 'react'
import { cn } from './ui'

const base = (import.meta as any).env?.BASE_URL ?? '/'
const asset = (p: string) => `${base.replace(/\/$/, '')}/${p}`

export const LOGO_FULL = asset('brand/logo-changhai.png')
export const LOGO_EMBLEM = asset('brand/emblem.png')

/**
 * 医院标识。hospitals 主题下使用海军蓝院徽 + 系统名；
 * 通过 variant 控制深浅底色（深底用白色文字，浅底用海军蓝文字）。
 */
export const BrandLogo = ({
  variant = 'light',
  size = 'md',
  showSub = true,
  className,
}: {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showSub?: boolean
  className?: string
}) => {
  const h = { sm: 'h-7', md: 'h-9', lg: 'h-14' }[size]
  const titleCls = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[19px]' }[size]
  const dark = variant === 'dark'
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={LOGO_EMBLEM} alt="上海长海医院院徽" className={cn(h, 'w-auto shrink-0')} />
      <div className="min-w-0 leading-tight">
        <p className={cn('truncate font-semibold tracking-tight', titleCls, dark ? 'text-white' : 'text-brand-800')}>
          日间化疗智慧照护
        </p>
        {showSub && (
          <p className={cn('truncate text-[9.5px] tracking-[.06em]', dark ? 'text-brand-100/75' : 'text-slate-400')}>
            肿瘤内科 · 日间化疗中心
          </p>
        )}
      </div>
    </div>
  )
}

/** 顶部机构信息条（对应参考站"公众版/学术版/无障碍"工具条） */
export const TopBar = () => (
  <div className="hidden border-b border-[#e6ecf3] bg-[#f7f9fc] lg:block">
    <div className="mx-auto flex h-8 max-w-[1560px] items-center justify-between px-6 text-[11px] text-slate-500">
      <p>上海长海医院（海军军医大学第一附属医院）· 肿瘤内科日间化疗中心</p>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          系统运行正常
        </span>
        <span className="text-slate-300">|</span>
        <span>演示环境 · 数据均为虚构</span>
        <span className="text-slate-300">|</span>
        <span>等保三级建设要求</span>
      </div>
    </div>
  </div>
)

/** 页脚（参考站机构式页脚） */
export const SiteFooter = () => (
  <footer className="mt-6 border-t border-[#e6ecf3] bg-[#f7f9fc] px-6 py-5 text-[11px] leading-relaxed text-slate-500">
    <div className="mx-auto flex max-w-[1560px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p>
        肿瘤内科 · 日间化疗中心 ｜ 日间化疗患者智慧照护系统 v1.1
      </p>
      <p className="text-slate-400">
        演示环境，不含真实患者信息 · AI 仅提供宣教指引，不替代执业医师诊疗
      </p>
    </div>
  </footer>
)
