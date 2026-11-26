// 日期与格式化工具
export const pad = (n: number) => String(n).padStart(2, '0')

export const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fmtDateTime = (d: Date) =>
  `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const today = () => new Date()
export const daysAgo = (n: number, base = new Date()) => {
  const d = new Date(base)
  d.setDate(d.getDate() - n)
  return d
}
export const daysAhead = (n: number, base = new Date()) => daysAgo(-n, base)
export const hoursAgo = (n: number, base = new Date()) => {
  const d = new Date(base)
  d.setHours(d.getHours() - n)
  return d
}
export const addHours = (d: Date, h: number) => {
  const v = new Date(d)
  v.setHours(v.getHours() + h)
  return v
}

export const relTime = (iso: string) => {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (Number.isNaN(t)) return iso
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return fmtDate(new Date(iso))
}

export const relFuture = (iso: string) => {
  const t = new Date(iso).getTime()
  const diff = t - Date.now()
  if (Number.isNaN(t)) return iso
  if (diff < 0) return '已到期'
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟后`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时后`
  return `${Math.floor(diff / 86_400_000)} 天后`
}

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

export const isInQuietHours = (start: string, end: string, now = new Date()) => {
  const cur = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  const e = eh * 60 + em
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e
}

export const ageText = (age: number) => `${age} 岁`

export const maskPhone = (p: string) => p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
export const maskName = (n: string) => (n.length <= 1 ? n : n[0] + '*'.repeat(n.length - 1))
export const maskMrn = (m: string) => m.replace(/(\d{4})\d{3}(\d{2,4})/, '$1***$2')
