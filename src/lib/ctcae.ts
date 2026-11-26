import type { CtcaeTerm, Severity } from '../types'

export interface VitalInput {
  temp?: number
  anc?: number
  plt?: number
  wbc?: number
  hb?: number
}

// 依据 CTCAE v5.0 阈值自动分级（实验室类指标）
export const gradeByLab = (termId: string, v: VitalInput): Severity | 0 => {
  if (termId === 'anc' && v.anc != null) {
    if (v.anc < 0.5) return 4
    if (v.anc < 1.0) return 3
    if (v.anc < 1.5) return 2
    if (v.anc < 2.0) return 1
    return 0
  }
  if (termId === 'wbc' && v.wbc != null) {
    if (v.wbc < 1.0) return 4
    if (v.wbc < 2.0) return 3
    if (v.wbc < 3.0) return 2
    if (v.wbc < 4.0) return 1
    return 0
  }
  if (termId === 'plt' && v.plt != null) {
    if (v.plt < 25) return 4
    if (v.plt < 50) return 3
    if (v.plt < 75) return 2
    if (v.plt < 100) return 1
    return 0
  }
  if (termId === 'hb' && v.hb != null) {
    if (v.hb < 60) return 4
    if (v.hb < 80) return 3
    if (v.hb < 100) return 2
    if (v.hb < 110) return 1
    return 0
  }
  if (termId === 'fever' && v.temp != null) {
    if (v.temp >= 40) return 3
    if (v.temp >= 39) return 2
    if (v.temp >= 38) return 1
    return 0
  }
  return 0
}

// 症状选择 → 初步分级（患者自报，用于分流与预警，非诊断）
export const gradeBySymptoms = (termId: string, temp?: number): Severity | 0 => {
  if (termId === 'fever' && temp != null) {
    if (temp >= 40) return 3
    if (temp >= 39) return 2
    if (temp >= 38) return 1
    return 0
  }
  if (termId === 'fn' && temp != null && temp >= 38.3) return 3
  if (termId === 'allergy') return 2
  if (termId === 'plt') return 3
  if (termId === 'anc') return 2
  if (termId === 'nausea') return 2
  if (termId === 'vomit') return 2
  if (termId === 'diarrhea') return 2
  if (termId === 'fatigue') return 2
  return 1
}

// 高危症状清单 —— 触发“立即联系医护/急诊”强制引导
export const EMERGENCY_SIGNS = [
  { key: 'fever383', label: '发热 ≥38.3℃，或发热伴寒战/乏力加重', term: 'fever' },
  { key: 'bleeding', label: '牙龈出血不止、鼻出血、黑便、血尿或皮下大片瘀斑', term: 'plt' },
  { key: 'breath', label: '胸闷、气促、喉头发紧、声音嘶哑', term: 'allergy' },
  { key: 'shock', label: '头晕眼花、面色苍白、冷汗、意识模糊', term: 'allergy' },
  { key: 'vomit', label: '呕吐不止（24 小时 ≥6 次）无法进水', term: 'vomit' },
  { key: 'rash', label: '皮疹迅速扩散伴水疱、口腔/眼周糜烂', term: 'rash' },
  { key: 'extrav', label: '输液部位肿胀疼痛、皮肤发白或发红', term: 'extrav' },
]

export const triageBySymptoms = (symptoms: string[], temp?: number): { grade: Severity; termId: string; emergency: boolean } => {
  if (temp != null && temp >= 38.0) return { grade: temp >= 39.5 ? 3 : temp >= 39 ? 2 : 1, termId: 'fever', emergency: temp >= 38.3 }
  if (symptoms.includes('bleeding')) return { grade: 3, termId: 'plt', emergency: true }
  if (symptoms.includes('breath') || symptoms.includes('shock')) return { grade: 3, termId: 'allergy', emergency: true }
  if (symptoms.includes('vomit')) return { grade: 2, termId: 'vomit', emergency: true }
  if (symptoms.includes('rash')) return { grade: 2, termId: 'rash', emergency: false }
  if (symptoms.includes('extrav')) return { grade: 2, termId: 'extrav', emergency: true }
  if (symptoms.includes('fatigue')) return { grade: 2, termId: 'fatigue', emergency: false }
  if (symptoms.includes('nausea')) return { grade: 1, termId: 'nausea', emergency: false }
  if (symptoms.includes('diarrhea')) return { grade: 2, termId: 'diarrhea', emergency: false }
  if (symptoms.includes('mucositis')) return { grade: 2, termId: 'mucositis', emergency: false }
  if (symptoms.includes('neuropathy')) return { grade: 2, termId: 'neuropathy', emergency: false }
  return { grade: 1, termId: 'fatigue', emergency: false }
}

export const gradeBadge = (g: Severity | 0) => {
  if (g === 0) return { text: '正常', cls: 'bg-slate-100 text-slate-600' }
  if (g === 1) return { text: '1 级', cls: 'bg-emerald-100 text-emerald-700' }
  if (g === 2) return { text: '2 级', cls: 'bg-amber-100 text-amber-700' }
  if (g === 3) return { text: '3 级', cls: 'bg-orange-100 text-orange-700' }
  if (g === 4) return { text: '4 级', cls: 'bg-rose-100 text-rose-700' }
  return { text: '5 级', cls: 'bg-rose-200 text-rose-800' }
}

export const termSummary = (t: CtcaeTerm, g: Severity): string => {
  if (g === 1) return t.grade1
  if (g === 2) return t.grade2
  if (g === 3) return t.grade3
  if (g === 4) return t.grade4
  return t.grade5 ?? t.grade4
}
