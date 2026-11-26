import type { AdrEvent, FollowUp, Patient, ReminderDispatch, RiskAssessment, SymptomReport, ChatTurn, LabResult } from '../types'
import { fmtDate, daysAgo } from './date'

export interface QcSummary {
  assessed: number
  total: number
  assessRate: number
  educationCovered: number
  eduRate: number
  fuTotal: number
  fuDone: number
  fuLate: number
  fuMissed: number
  fuRate: number
  adrCount: number
  adrHigh: number
  delayedAnc: number
  highRisk: number
  avgCloseHours: number
  dispatchAckRate: number
  chatEscalation: number
}

export const buildQcSummary = (input: {
  patients: Patient[]
  assessments: RiskAssessment[]
  adrs: AdrEvent[]
  followups: FollowUp[]
  symptoms: SymptomReport[]
  chats: ChatTurn[]
  dispatches: ReminderDispatch[]
  labs: LabResult[]
}): QcSummary => {
  const total = input.patients.length
  const assessed = new Set(input.assessments.map((a) => a.patientId)).size
  const educationCovered = new Set(
    input.dispatches.filter((d) => d.status !== 'muted' && d.channel.includes('push')).map((d) => d.patientId),
  ).size
  const fuDone = input.followups.filter((f) => f.status === 'done').length
  const fuLate = input.followups.filter((f) => f.status === 'late').length
  const fuMissed = input.followups.filter((f) => f.status === 'missed').length
  const adrHigh = input.adrs.filter((a) => a.grade >= 3).length
  const closed = input.adrs.filter((a) => a.status === 'closed' && a.closedAt)
  const avgCloseHours = closed.length
    ? Math.round(closed.reduce((s, a) => s + (new Date(a.closedAt!).getTime() - new Date(a.createdAt).getTime()) / 3_600_000, 0) / closed.length * 10) / 10
    : 0

  // 骨髓抑制延迟发现：ANC 或 PLT 首次异常到首次医护动作 > 24h，或患者上报发热当天才首次查血象
  const delayedAnc = input.adrs.filter((a) => {
    if (a.termId !== 'anc' && a.termId !== 'plt') return false
    if (a.grade < 3) return false
    const firstNurseAction = a.timeline.find((l) => l.role !== 'system' && l.role !== 'patient')
    if (!firstNurseAction) return true
    return (new Date(firstNurseAction.at).getTime() - new Date(a.createdAt).getTime()) / 3_600_000 > 24
  }).length

  const dispatchAck = input.dispatches.filter((d) => d.status === 'ack' || d.readAt).length
  const chatEscalation = input.chats.filter((c) => c.escalated).length

  return {
    assessed, total,
    assessRate: total ? Math.round((assessed / total) * 100) : 0,
    educationCovered,
    eduRate: total ? Math.round((educationCovered / total) * 100) : 0,
    fuTotal: input.followups.length,
    fuDone, fuLate, fuMissed,
    fuRate: input.followups.length ? Math.round((fuDone / input.followups.length) * 100) : 0,
    adrCount: input.adrs.length,
    adrHigh,
    delayedAnc,
    highRisk: input.patients.filter((p) => p.risk === 'high').length,
    avgCloseHours,
    dispatchAckRate: input.dispatches.length ? Math.round((dispatchAck / input.dispatches.length) * 100) : 0,
    chatEscalation,
  }
}

// 近 7 日趋势（用于看板折线）
export const buildTrend = (input: {
  adrs: AdrEvent[]
  symptoms: SymptomReport[]
  followups: FollowUp[]
}) => {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = daysAgo(6 - i)
    const key = fmtDate(d)
    return {
      date: key.slice(5),
      adr: input.adrs.filter((a) => a.createdAt.slice(0, 10) === key).length,
      symptom: input.symptoms.filter((s) => s.createdAt.slice(0, 10) === key).length,
      followup: input.followups.filter((f) => (f.lastAttemptAt ?? '').slice(0, 10) === key).length,
    }
  })
}

// 风险分布
export const riskDistribution = (patients: Patient[]) => ({
  low: patients.filter((p) => p.risk === 'low').length,
  mid: patients.filter((p) => p.risk === 'mid').length,
  high: patients.filter((p) => p.risk === 'high').length,
})

// HFMEA 导出（风险事件 → 失效模式 → 失效原因 → 影响 → 现有措施 → S/O/D → RPN）
export const buildHfmeaRows = (adrs: AdrEvent[], patients: Patient[]) => {
  const max = Math.max(1, adrs.length)
  const severityScore = (g: number) => (g >= 4 ? 9 : g === 3 ? 8 : g === 2 ? 5 : 3)
  return adrs.map((a, idx) => {
    const p = patients.find((x) => x.id === a.patientId)
    const occurrence = Math.max(2, Math.min(10, Math.round((idx / max) * 8 + 2)))
    const detection = a.delayedDetection ? 9 : a.source === 'lis' ? 4 : a.source === 'nurse' ? 2 : a.source === 'device' ? 3 : 5
    return {
      序号: idx + 1,
      失效模式: `${a.term}（${a.grade} 级）未被及时识别`,
      患者: p?.name ?? a.patientId,
      风险等级: p?.risk === 'high' ? '高危' : p?.risk === 'mid' ? '中危' : '低危',
      失效原因: a.source === 'patient' ? '居家症状上报滞后 / 患者认知不足' : a.source === 'lis' ? '检验结果判读依赖人工' : a.source === 'device' ? '监护阈值设置不合理' : '巡视间隔过长',
      影响: a.grade >= 3 ? '延误治疗，可能进展为脓毒症/出血' : '症状加重，需门诊干预',
      当前措施: `ADR 闭环 SOP（${a.sopId}）+ 风险分层随访`,
      S: severityScore(a.grade),
      O: occurrence,
      D: detection,
      RPN: severityScore(a.grade) * occurrence * detection,
      上报时间: a.createdAt.slice(0, 16).replace('T', ' '),
    }
  })
}

// 品管圈改善数据（按类别统计）
export const buildQccRows = (adrs: AdrEvent[]) => {
  const byTerm = new Map<string, { count: number; high: number }>()
  for (const a of adrs) {
    const cur = byTerm.get(a.term) ?? { count: 0, high: 0 }
    cur.count += 1
    if (a.grade >= 3) cur.high += 1
    byTerm.set(a.term, cur)
  }
  return [...byTerm.entries()].map(([term, v]) => ({
    不良反应类型: term,
    发生例数: v.count,
    '3-4 级例数': v.high,
    '3-4 级占比': `${Math.round((v.high / v.count) * 100)}%`,
  }))
}

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return `\uFEFF${headers.join(',')}\n${rows.map((r) => headers.map((h) => esc(r[h])).join(',')).join('\n')}`
}

export const downloadCsv = (name: string, rows: Record<string, unknown>[]) => {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${fmtDate(new Date())}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadJson = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${fmtDate(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
