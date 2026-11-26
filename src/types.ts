// 日间化疗患者智慧照护系统 —— 领域模型
export type RiskLevel = 'low' | 'mid' | 'high'
export type Role = 'doctor' | 'nurse' | 'headnurse' | 'qc' | 'patient' | 'admin'
export type CarePhase = 'pre' | 'during' | 'post'

export interface Patient {
  id: string
  name: string
  gender: 'M' | 'F'
  age: number
  mrn: string                 // 住院/门诊号（脱敏展示）
  phone: string               // 脱敏
  bed?: string
  diagnosis: string
  regimen: string             // 化疗方案，如 "TC 方案（紫杉醇+卡铂）"
  cycle: string               // 第 2 周期 第 1 天
  risk: RiskLevel
  riskScore: number
  riskTags: string[]
  attending: string           // 主管医生
  primaryNurse: string        // 责任护士
  chemoDate: string           // 本次日间化疗日期 yyyy-mm-dd
  phase: CarePhase
  infusion?: InfusionInfo
  consent: boolean
  alerts: string[]
  nextFollowUp?: string
  createdAt: string
}

export interface InfusionInfo {
  drug: string
  category: 'vesicant' | 'irritant' | 'non'      // 发泡剂/刺激性/非
  hypersensitivity: 1 | 2 | 3                     // 高致敏等级
  dose: string
  route: string
  startedAt: string
  pumpRate: number                                // ml/h
  remaining: number                               // ml
  hisOrderId: string
  premedication: string
  roundNodes: string[]                            // 巡视节点
}

export interface AssessmentItem {
  id: string
  group: string
  label: string
  hint?: string
  weight: number
  ctcaeref?: string
}

export interface AssessmentAnswer { itemId: string; checked: boolean; note?: string }

export interface RiskAssessment {
  id: string
  patientId: string
  answers: AssessmentAnswer[]
  score: number
  level: RiskLevel
  tags: string[]
  nurse: string
  nurseNote: string
  ctcaeref: string[]
  createdAt: string
  archivedAt?: string
  syncStatus: 'synced' | 'pending'
}

export type Severity = 1 | 2 | 3 | 4 | 5

export interface CtcaeTerm {
  id: string
  term: string
  category: string
  grade1: string
  grade2: string
  grade3: string
  grade4: string
  grade5?: string
  note: string
}

export type AdrStatus = 'reported' | 'triaged' | 'handling' | 'rechecking' | 'closed'

export interface AdrEvent {
  id: string
  patientId: string
  termId: string
  term: string
  grade: Severity
  symptoms: string[]
  source: 'patient' | 'nurse' | 'device' | 'lis'
  vitals?: { temp?: number; sbp?: number; hr?: number; spo2?: number; platelets?: number; anc?: number; wbc?: number }
  status: AdrStatus
  sopId: string
  timeline: AdrLog[]
  createdAt: string
  closedAt?: string
  delayedDetection?: boolean
}

export interface AdrLog {
  at: string
  author: string
  role: Role | 'system'
  action: string
  detail: string
}

export interface SopDoc {
  id: string
  title: string
  category: string
  grade: Severity | 0
  trigger: string
  steps: string[]
  orders: string[]
  recheck: string
  escalate: string
  source: string
}

export interface EducationItem {
  id: string
  title: string
  phase: CarePhase
  audience: RiskLevel[] | 'all'
  form: '图文' | '短视频' | '语音' | '图文+语音'
  body: string
  keyPoints: string[]
  audio?: string
  approvedBy: string
  approvedAt: string
  version: string
  tags: string[]
}

export interface ReminderTemplate {
  id: string
  phase: CarePhase
  offsetHours: number          // 相对化疗开始时间（负值为化疗前）
  title: string
  body: string
  voiceText: string
  riskFilter: RiskLevel[] | 'all'
  channel: ('push' | 'voice' | 'sms')[]
  enabled: boolean
  approvedBy: string
  editable: boolean
}

export interface ReminderDispatch {
  id: string
  patientId: string
  templateId: string
  title: string
  body: string
  dueAt: string
  channel: string[]
  status: 'pending' | 'sent' | 'ack' | 'muted' | 'failed'
  readAt?: string
  voicePlayedAt?: string
}

export interface FollowUp {
  id: string
  patientId: string
  dueDate: string
  type: '血常规复查' | '复诊' | '电话随访' | '居家症状随访'
  status: 'pending' | 'done' | 'late' | 'missed'
  attempts: number
  lastAttemptAt?: string
  note?: string
  nurse?: string
}

export interface SymptomReport {
  id: string
  patientId: string
  symptoms: string[]
  temp?: number
  termId: string
  grade: Severity
  escalated: boolean
  adrId?: string
  createdAt: string
}

export interface ChatTurn {
  id: string
  patientId: string
  question: string
  answer: string
  intent: string
  escalated: boolean
  needsHuman: boolean
  at: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: Role | 'system'
  action: string
  target: string
  detail: string
  ip?: string
}

export interface DeviceVital {
  patientId: string
  at: string
  hr: number
  sbp: number
  dbp: number
  spo2: number
  temp: number
  pumpRate: number
  remaining: number
}

export interface LabResult {
  patientId: string
  at: string
  wbc: number
  anc: number
  plt: number
  hb: number
  orderId: string
  source: 'LIS'
}

export interface KnowledgeEntry {
  id: string
  question: string
  keywords: string[]
  answer: string
  category: string
  boundary: 'education' | 'triage' | 'emergency'
  approvedBy: string
  updatedAt: string
  hits: number
}

export interface ReminderSettings {
  voiceEnabled: boolean
  rate: number              // 0.7 - 1.3
  quietStart: string        // "22:00"
  quietEnd: string          // "07:00"
  offlinePack: boolean
  smsFallback: boolean
}

export interface Notification {
  id: string
  at: string
  level: 'info' | 'warn' | 'danger' | 'success'
  title: string
  body: string
  targetRole: Role[] | 'all'
  patientId?: string
  read: boolean
}
