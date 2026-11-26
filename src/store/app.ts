import { useSyncExternalStore } from 'react'
import type {
  AdrEvent, AdrLog, AuditEntry, ChatTurn, EducationItem, FollowUp, KnowledgeEntry, LabResult,
  Notification, Patient, ReminderDispatch, ReminderSettings, ReminderTemplate, RiskAssessment,
  RiskLevel, Role, Severity, SymptomReport, DeviceVital, AssessmentAnswer,
} from '../types'
import {
  SEED_PATIENTS, SEED_ASSESSMENTS, SEED_ADRS, SEED_LABS, SEED_FOLLOWUPS, SEED_SYMPTOMS,
  SEED_CHATS, SEED_DISPATCHES, SEED_NOTIFICATIONS, SEED_AUDIT, SEED_SETTINGS, SEED_VITALS,
} from '../data/seed'
import { EDUCATION } from '../data/education'
import { TEMPLATES } from '../data/templates'
import { KB } from '../data/kb'
import { CTCAE_TERMS } from '../data/ctcae'
import { RISK_ITEMS, scoreToLevel } from '../data/riskForm'
import { sopForTerm } from '../data/sop'
import { triageBySymptoms } from '../lib/ctcae'
import { fmtDate, fmtDateTime, daysAhead } from '../lib/date'

export interface AppState {
  patients: Patient[]
  assessments: RiskAssessment[]
  adrs: AdrEvent[]
  labs: LabResult[]
  followups: FollowUp[]
  symptoms: SymptomReport[]
  chats: ChatTurn[]
  dispatches: ReminderDispatch[]
  notifications: Notification[]
  audit: AuditEntry[]
  templates: ReminderTemplate[]
  education: EducationItem[]
  kb: KnowledgeEntry[]
  vitals: DeviceVital[]
  settings: ReminderSettings
  role: Role | null
  userName: string
  activePatientId: string
  lastAction: string
  lastActionAt: string
}

const VERSION = 'v3'
const KEY = `daychemo:state:${VERSION}`

const initialState = (): AppState => ({
  patients: [...SEED_PATIENTS],
  assessments: [...SEED_ASSESSMENTS],
  adrs: [...SEED_ADRS],
  labs: [...SEED_LABS],
  followups: [...SEED_FOLLOWUPS],
  symptoms: [...SEED_SYMPTOMS],
  chats: [...SEED_CHATS],
  dispatches: [...SEED_DISPATCHES],
  notifications: [...SEED_NOTIFICATIONS],
  audit: [...SEED_AUDIT],
  templates: [...TEMPLATES],
  education: [...EDUCATION],
  kb: KB.map((k) => ({ ...k })),
  vitals: [...SEED_VITALS],
  settings: { ...SEED_SETTINGS },
  role: null,
  userName: '',
  activePatientId: 'p3',
  lastAction: '',
  lastActionAt: '',
})

const load = (): AppState => {
  if (typeof localStorage === 'undefined') return initialState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...initialState(), ...parsed, lastAction: '', lastActionAt: '' }
  } catch {
    return initialState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

const emit = (msg?: string) => {
  state = { ...state, lastAction: msg ?? state.lastAction, lastActionAt: msg ? new Date().toISOString() : state.lastActionAt }
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, lastAction: '' }))
  } catch {
    /* 内存模式运行（localStorage 不可用 / 超出配额） */
  }
  listeners.forEach((l) => l())
}

export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const getState = () => state
export const useApp = () => useSyncExternalStore(subscribe, getState, getState)

export const resetState = () => {
  state = initialState()
  emit('已恢复演示初始数据')
}

// ---------- 通用工具 ----------
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const now = () => new Date().toISOString()

const audit = (actor: string, role: Role | 'system', action: string, target: string, detail: string): AuditEntry => ({
  id: uid('au'), at: now(), actor, role, action, target, detail,
})

const pushNotification = (n: Omit<Notification, 'id' | 'at' | 'read'>): Notification => ({
  ...n, id: uid('n'), at: now(), read: false,
})

const roleLabel: Record<Role, string> = {
  doctor: '医生', nurse: '护士', headnurse: '护士长', qc: '质控员', patient: '患者', admin: '系统管理员',
}

export const roleText = (r: Role) => roleLabel[r]

// ---------- 会话 ----------
export const setSession = (role: Role | null, name = '') => {
  state = { ...state, role, userName: name }
  const entry = audit(name || '访客', role ?? 'system', '登录系统', '——', role ? `${roleLabel[role]}登录${name ? `：${name}` : ''}` : '退出登录')
  state = { ...state, audit: [entry, ...state.audit] }
  emit(role ? `已登录：${roleLabel[role]} ${name}` : '已退出')
}

export const setActivePatient = (id: string) => {
  state = { ...state, activePatientId: id }
  emit()
}

// ---------- 评估 ----------
export interface AssessmentResult {
  score: number
  level: RiskLevel
  tags: string[]
}

export const evaluateAssessment = (answers: AssessmentAnswer[]): AssessmentResult => {
  const total = RISK_ITEMS.reduce((s, i) => s + i.weight, 0)
  const raw = RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked)).reduce((s, i) => s + i.weight, 0)
  const { score, level } = scoreToLevel(raw, total)
  const tags = RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked)).map((i) => i.label.replace(/（.*?）/g, '').slice(0, 14))
  return { score, level, tags }
}

export const submitAssessment = (
  patientId: string,
  answers: AssessmentAnswer[],
  nurse: string,
  nurseNote: string,
  consent: boolean,
) => {
  const total = RISK_ITEMS.reduce((s, i) => s + i.weight, 0)
  const raw = RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked)).reduce((s, i) => s + i.weight, 0)
  const { score, level } = scoreToLevel(raw, total)
  const tags = RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked)).map((i) => i.label.replace(/（.*?）/g, '').slice(0, 14))
  const id = uid('a')
  const assessment: RiskAssessment = {
    id, patientId, answers, score, level, tags, nurse, nurseNote,
    ctcaeref: RISK_ITEMS.filter((i) => answers.find((a) => a.itemId === i.id && a.checked) && i.ctcaeref).map((i) => i.ctcaeref!),
    createdAt: now(), archivedAt: now(), syncStatus: 'synced',
  }

  // 依据风险分层自动生成复查计划（骨髓抑制重点监控）
  const schedule: Record<RiskLevel, number[]> = { low: [7], mid: [4, 7, 14], high: [3, 5, 7, 10, 14] }
  const followups: FollowUp[] = schedule[level].map((d, idx) => ({
    id: uid('f'), patientId, dueDate: fmtDate(daysAhead(d)), type: idx === 0 && level === 'high' ? '电话随访' : '血常规复查',
    status: 'pending', attempts: 0,
    note: `${level === 'high' ? '高危' : level === 'mid' ? '中危' : '低危'}：化疗后第 ${d} 天${idx === 0 && level === 'high' ? '电话随访 + 血常规' : '血常规复查'}`,
  }))

  const patient = state.patients.find((p) => p.id === patientId)
  const alerts = [
    ...(level === 'high' ? ['高危患者：加密监测与随访已启用', '每 30 分钟巡视打卡'] : []),
    ...(level === 'mid' ? ['中危患者：加密复查（第 4/7/14 天）'] : []),
    ...(patient?.alerts ?? []).filter((a) => !a.includes('评估')),
  ]

  const entry = audit(nurse, 'nurse', '完成化疗前风险评估', patient?.name ?? patientId, `${level === 'high' ? '高危' : level === 'mid' ? '中危' : '低危'} ${score} 分，自动生成 ${followups.length} 条随访计划`)

  state = {
    ...state,
    assessments: [assessment, ...state.assessments],
    followups: [...followups, ...state.followups],
    patients: state.patients.map((p) =>
      p.id === patientId
        ? { ...p, risk: level, riskScore: score, riskTags: tags, alerts, consent, nextFollowUp: followups[1]?.dueDate ?? followups[0]?.dueDate }
        : p,
    ),
    notifications: [
      pushNotification({
        level: level === 'high' ? 'danger' : level === 'mid' ? 'warn' : 'info',
        title: `风险评估完成：${patient?.name ?? ''} ${score} 分（${level === 'high' ? '高危' : level === 'mid' ? '中危' : '低危'}）`,
        body: `已自动生成 ${followups.length} 条随访计划与个体化宣教清单。`,
        targetRole: ['nurse', 'headnurse', 'qc'], patientId,
      }),
      ...state.notifications,
    ],
    audit: [entry, ...state.audit],
  }
  emit(`评估完成：${score} 分 / ${level}`)
  return { score, level }
}

// ---------- ADR ----------
export const reportAdr = (input: {
  patientId: string
  termId: string
  term: string
  grade: Severity
  symptoms: string[]
  source: AdrEvent['source']
  vitals?: AdrEvent['vitals']
  actor: string
  role: Role | 'system'
  detail: string
}): AdrEvent => {
  const sop = sopForTerm(input.termId, input.grade)
  const log: AdrLog = { at: now(), author: input.actor, role: input.role, action: input.source === 'lis' ? 'LIS 自动研判' : '上报', detail: input.detail }
  const event: AdrEvent = {
    id: uid('adr'), patientId: input.patientId, termId: input.termId, term: input.term,
    grade: input.grade, symptoms: input.symptoms, source: input.source, vitals: input.vitals,
    status: input.source === 'lis' ? 'triaged' : 'reported', sopId: sop.id,
    timeline: [log], createdAt: now(),
  }
  const patient = state.patients.find((p) => p.id === input.patientId)
  const level = input.grade >= 3 ? 'danger' : 'warn'
  const entry = audit(input.actor, input.role, 'ADR 上报', patient?.name ?? input.patientId, `${input.term} ${input.grade} 级，关联 SOP：${sop.title}`)
  state = {
    ...state,
    adrs: [event, ...state.adrs],
    patients: state.patients.map((p) =>
      p.id === input.patientId && input.grade >= 2
        ? { ...p, alerts: [`${input.term} ${input.grade} 级（${input.source === 'patient' ? '居家上报' : input.source === 'lis' ? 'LIS 自动研判' : '床旁上报'}）`, ...p.alerts] }
        : p,
    ),
    notifications: [
      pushNotification({
        level: level as Notification['level'],
        title: `不良反应上报：${patient?.name ?? ''} ${input.term} ${input.grade} 级`,
        body: `处置 SOP 已自动推送：${sop.title}`,
        targetRole: ['nurse', 'doctor', 'qc'], patientId: input.patientId,
      }),
      ...state.notifications,
    ],
    audit: [entry, ...state.audit],
  }
  emit(`ADR 已创建：${input.term} ${input.grade} 级`)
  return event
}

export const advanceAdr = (
  adrId: string,
  action: string,
  detail: string,
  actor: string,
  role: Role | 'system',
) => {
  const target = state.adrs.find((a) => a.id === adrId)
  if (!target) return
  const nextStatus: Record<string, AdrEvent['status']> = {
    处置: 'handling', 复评: 'rechecking', 闭环: 'closed', 升级: 'handling',
  }
  const status = action in nextStatus ? nextStatus[action] : target.status
  const log: AdrLog = { at: now(), author: actor, role, action, detail }
  const patient = state.patients.find((p) => p.id === target.patientId)
  const entry = audit(actor, role, `ADR ${action}`, patient?.name ?? target.patientId, detail)
  state = {
    ...state,
    adrs: state.adrs.map((a) =>
      a.id === adrId
        ? { ...a, status, timeline: [...a.timeline, log], closedAt: status === 'closed' ? now() : a.closedAt }
        : a,
    ),
    patients:
      status === 'closed'
        ? state.patients.map((p) =>
            p.id === target.patientId
              ? { ...p, alerts: p.alerts.filter((al) => !al.startsWith(target.term)) }
              : p,
          )
        : state.patients,
    notifications: [
      pushNotification({
        level: status === 'closed' ? 'success' : 'info',
        title: `ADR ${action}：${patient?.name ?? ''} ${target.term}`,
        body: detail,
        targetRole: ['nurse', 'doctor', 'qc'], patientId: target.patientId,
      }),
      ...state.notifications,
    ],
    audit: [entry, ...state.audit],
  }
  emit(`ADR ${action}完成`)
}

// ---------- 症状上报 ----------
export const submitSymptoms = (
  patientId: string,
  symptoms: string[],
  temp: number | undefined,
  actor: string,
  role: Role | 'patient',
) => {
  const triage = triageBySymptoms(symptoms, temp)
  const term = CTCAE_TERMS.find((t) => t.id === triage.termId)
  const report: SymptomReport = {
    id: uid('s'), patientId, symptoms, temp, termId: triage.termId, grade: triage.grade,
    escalated: triage.emergency, createdAt: now(),
  }
  const patient = state.patients.find((p) => p.id === patientId)
  const adr = triage.grade >= 2 || triage.emergency
    ? reportAdr({
        patientId, termId: triage.termId, term: term?.term ?? '症状上报', grade: triage.grade,
        symptoms, source: 'patient', vitals: { temp },
        actor, role, detail: `居家自助上报：${symptoms.join('、')}${temp ? `，体温 ${temp}℃` : ''}，系统按 CTCAE 初步判定 ${triage.grade} 级${triage.emergency ? '，触发红色预警' : ''}`,
      })
    : undefined

  const entry = audit(actor, role, '居家症状上报', patient?.name ?? patientId, `${symptoms.join('、')}${temp ? ` 体温 ${temp}℃` : ''} → ${triage.grade} 级${triage.emergency ? '（高危）' : ''}`)
  state = {
    ...state,
    symptoms: [{ ...report, adrId: adr?.id }, ...state.symptoms],
    audit: [entry, ...state.audit],
    notifications: triage.emergency
      ? [
          pushNotification({
            level: 'danger',
            title: `高危症状预警：${patient?.name ?? ''} ${symptoms.join('、')}`,
            body: `体温 ${temp ?? '未测'}℃，系统判定 ${triage.grade} 级并已强制引导患者就医，请 30 分钟内回访。`,
            targetRole: ['nurse', 'doctor', 'headnurse'], patientId,
          }),
          ...state.notifications,
        ]
      : state.notifications,
  }
  emit(`症状已上报：${triage.grade} 级${triage.emergency ? '（高危）' : ''}`)
  return { ...report, adrId: adr?.id, emergency: triage.emergency, grade: triage.grade }
}

// ---------- AI 语音问答 ----------
export interface AnswerResult {
  answer: string
  intent: string
  needsHuman: boolean
  emergency: boolean
  kbId?: string
  confidence: number
}

const EMERGENCY_KW = ['胸痛', '胸闷', '喘不上气', '呼吸困难', '意识', '昏迷', '抽搐', '出血不止', '血压低', '休克', '39度', '39.5', '40度', '心跳很快', '叫不醒']
const TRIAGE_KW = ['能不能', '可不可以', '要不要', '吃什么药', '开药', '剂量', '停掉', '能治好吗', '活多久', '复发', '多少钱', '报销', '指标', '预后']

export const askAi = (patientId: string, question: string, actor: string): AnswerResult => {
  const q = question.trim()
  const emergencyHit = EMERGENCY_KW.some((k) => q.includes(k))
  const answerKb = state.kb
    .map((k) => ({ k, score: k.keywords.reduce((s, kw) => (q.includes(kw) ? s + kw.length : s), 0) }))
    .sort((a, b) => b.score - a.score)
    .find((x) => x.score > 0)

  let answer = ''
  let intent = '未识别'
  let needsHuman = false
  let emergency = emergencyHit
  let kbId: string | undefined
  let confidence = 0

  if (emergencyHit) {
    intent = '急症识别'
    answer =
      '您描述的情况可能属于需要立即处理的急症，我不能仅通过对话判断。请现在这样做：\n① 立即联系您的责任护士或拨打日间化疗中心电话 010-8888 2046；\n② 情况紧急请拨打 120 或前往最近医院急诊；\n③ 携带化疗记录单与近期化验单。\n\n我已同时生成一条医护预警，请保持电话畅通。'
    needsHuman = true
    confidence = 0.95
  } else if (answerKb && answerKb.score >= 2) {
    const entry = answerKb.k
    kbId = entry.id
    intent = entry.category
    answer = entry.answer
    needsHuman = entry.boundary === 'triage' || entry.boundary === 'emergency'
    emergency = entry.boundary === 'emergency'
    confidence = Math.min(0.96, 0.62 + answerKb.score / 12)
  } else {
    const triageHit = TRIAGE_KW.some((k) => q.includes(k))
    if (triageHit) {
      intent = '需人工接诊'
      answer =
        '这个问题涉及个体化的诊疗判断或政策口径，超出我的宣教范围，我不能替医生做决定。\n\n建议您通过页面下方“一键转医护”，您的责任护士会在工作时间内回复；如情况紧急请直接拨打日间化疗中心电话 010-8888 2046。'
      needsHuman = true
      confidence = 0.5
    } else {
      intent = '宣教指引'
      answer =
        '我暂时没有找到完全匹配的专科知识条目。我可以帮您做的是宣教指引：\n• 查看“我的宣教”中与您化疗阶段相关的图文与语音内容；\n• 完成今日症状上报，系统会自动分级并通知医护；\n• 需要具体判断时，请“一键转医护”人工接诊，护士会在工作时间内回复。\n\n请注意：我不能替代执业医师做出诊疗方案。'
      needsHuman = true
      confidence = 0.35
    }
  }

  const turn: ChatTurn = { id: uid('c'), patientId, question: q, answer, intent, escalated: false, needsHuman, at: now() }
  const patient = state.patients.find((p) => p.id === patientId)
  const entry = audit(actor, 'patient', 'AI 语音问答', patient?.name ?? patientId, `${q.slice(0, 20)} → ${intent}${needsHuman ? '（转人工）' : ''}`)
  state = {
    ...state,
    chats: [turn, ...state.chats],
    kb: kbId ? state.kb.map((k) => (k.id === kbId ? { ...k, hits: k.hits + 1 } : k)) : state.kb,
    audit: [entry, ...state.audit],
    notifications: emergency
      ? [
          pushNotification({
            level: 'danger',
            title: `AI 语音问答触发急症预警：${patient?.name ?? ''}`,
            body: `患者提问：“${q.slice(0, 40)}”，已强制引导就医，请立即回访。`,
            targetRole: ['nurse', 'doctor', 'headnurse'], patientId,
          }),
          ...state.notifications,
        ]
      : state.notifications,
  }
  emit(`AI 应答：${intent}`)
  return { answer, intent, needsHuman, emergency, kbId, confidence }
}

export const escalateChat = (chatId: string, actor: string) => {
  const target = state.chats.find((c) => c.id === chatId)
  if (!target) return
  const patient = state.patients.find((p) => p.id === target.patientId)
  const entry = audit(actor, 'patient', '一键转医护', patient?.name ?? target.patientId, `转人工接诊：${target.question.slice(0, 24)}`)
  state = {
    ...state,
    chats: state.chats.map((c) => (c.id === chatId ? { ...c, escalated: true, needsHuman: true } : c)),
    notifications: [
      pushNotification({
        level: 'warn',
        title: `转人工接诊：${patient?.name ?? ''}`,
        body: `患者提问：“${target.question.slice(0, 60)}”，请在工作时间内接诊。`,
        targetRole: ['nurse', 'doctor'], patientId: target.patientId,
      }),
      ...state.notifications,
    ],
    audit: [entry, ...state.audit],
  }
  emit('已转医护人工接诊')
}

// ---------- 随访 ----------
export const updateFollowUp = (id: string, status: FollowUp['status'], note: string, actor: string, role: Role) => {
  const target = state.followups.find((f) => f.id === id)
  if (!target) return
  const patient = state.patients.find((p) => p.id === target.patientId)
  const entry = audit(actor, role, '随访台账更新', patient?.name ?? target.patientId, `${target.type} → ${status === 'done' ? '已完成' : status === 'late' ? '迟访' : status === 'missed' ? '漏访' : '待随访'}：${note || '—'}`)
  state = {
    ...state,
    followups: state.followups.map((f) =>
      f.id === id ? { ...f, status, note: note || f.note, nurse: actor, lastAttemptAt: now(), attempts: f.attempts + 1 } : f,
    ),
    audit: [entry, ...state.audit],
  }
  emit(`随访已更新：${status}`)
}

export const remindFollowUp = (id: string, actor: string) => {
  const target = state.followups.find((f) => f.id === id)
  if (!target) return
  const patient = state.patients.find((p) => p.id === target.patientId)
  const tpl = state.templates.find((t) => t.phase === 'post' && t.enabled)
  const dispatch: ReminderDispatch = {
    id: uid('rd'), patientId: target.patientId, templateId: tpl?.id ?? 'manual',
    title: `随访提醒：${target.type}`, body: `${target.type}原定 ${target.dueDate}，请尽快完成。${target.note ?? ''}`,
    dueAt: now(), channel: ['push', 'voice', 'sms'], status: 'sent', readAt: undefined,
  }
  const entry = audit(actor, 'nurse', '二次提醒', patient?.name ?? target.patientId, `${target.type}：已发送小程序推送 + AI 语音 + 短信`)
  state = {
    ...state,
    dispatches: [dispatch, ...state.dispatches],
    followups: state.followups.map((f) =>
      f.id === id ? { ...f, attempts: f.attempts + 1, lastAttemptAt: now(), status: f.status === 'pending' ? 'late' : f.status } : f,
    ),
    audit: [entry, ...state.audit],
  }
  emit('已发送二次提醒')
}

// ---------- 提醒 / 模板 ----------
export const toggleTemplate = (id: string, actor: string, role: Role) => {
  const target = state.templates.find((t) => t.id === id)
  if (!target) return
  const entry = audit(actor, role, '提醒模板开关', target.title, `${target.enabled ? '停用' : '启用'}`)
  state = {
    ...state,
    templates: state.templates.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    audit: [entry, ...state.audit],
  }
  emit(`模板${target.enabled ? '已停用' : '已启用'}`)
}

export const saveTemplate = (tpl: ReminderTemplate, actor: string, role: Role) => {
  const exists = state.templates.some((t) => t.id === tpl.id)
  const entry = audit(actor, role, '编辑提醒模板', tpl.title, `${exists ? '更新' : '新增'}：偏移 ${tpl.offsetHours}h，渠道 ${tpl.channel.join('/')}，须专科审核后生效`)
  state = {
    ...state,
    templates: exists
      ? state.templates.map((t) => (t.id === tpl.id ? { ...tpl, approvedBy: `${actor}（${roleText(role)}）· 待审核` } : t))
      : [...state.templates, { ...tpl, approvedBy: `${actor}（${roleText(role)}）· 待审核` }],
    audit: [entry, ...state.audit],
  }
  emit('模板已保存（待专科审核生效）')
}

export const saveEducation = (item: EducationItem, actor: string, role: Role) => {
  const exists = state.education.some((e) => e.id === item.id)
  const entry = audit(actor, role, '编辑宣教素材', item.title, `${exists ? '更新' : '新增'}：${item.form}，版本 ${item.version}`)
  state = {
    ...state,
    education: exists
      ? state.education.map((e) => (e.id === item.id ? { ...item, approvedBy: `${actor}（${roleText(role)}）· 待审核`, approvedAt: fmtDate(new Date()) } : e))
      : [...state.education, { ...item, approvedBy: `${actor}（${roleText(role)}）· 待审核`, approvedAt: fmtDate(new Date()) }],
    audit: [entry, ...state.audit],
  }
  emit('宣教素材已保存')
}

export const saveKb = (entry: KnowledgeEntry, actor: string, role: Role) => {
  const exists = state.kb.some((k) => k.id === entry.id)
  const log = audit(actor, role, '编辑知识库', entry.question, `${exists ? '更新' : '新增'}：${entry.category}，边界 ${entry.boundary}`)
  state = {
    ...state,
    kb: exists
      ? state.kb.map((k) => (k.id === entry.id ? { ...entry, approvedBy: `${actor}（${roleText(role)}）· 待审核`, updatedAt: fmtDate(new Date()) } : k))
      : [...state.kb, { ...entry, approvedBy: `${actor}（${roleText(role)}）· 待审核`, updatedAt: fmtDate(new Date()) }],
    audit: [log, ...state.audit],
  }
  emit('知识库已保存')
}

export const deleteKb = (id: string, actor: string, role: Role) => {
  const target = state.kb.find((k) => k.id === id)
  if (!target) return
  const log = audit(actor, role, '删除知识库条目', target.question, `条目 ${id}`)
  state = { ...state, kb: state.kb.filter((k) => k.id !== id), audit: [log, ...state.audit] }
  emit('知识库条目已删除')
}

// ---------- 提醒分发 ----------
export const ackDispatch = (id: string, actor: string) => {
  const target = state.dispatches.find((d) => d.id === id)
  if (!target) return
  const patient = state.patients.find((p) => p.id === target.patientId)
  const log = audit(actor, 'patient', '确认已读', patient?.name ?? target.patientId, `提醒：${target.title}`)
  state = {
    ...state,
    dispatches: state.dispatches.map((d) => (d.id === id ? { ...d, status: 'ack', readAt: now() } : d)),
    audit: [log, ...state.audit],
  }
  emit('提醒已确认')
}

export const markVoicePlayed = (id: string) => {
  state = {
    ...state,
    dispatches: state.dispatches.map((d) => (d.id === id ? { ...d, voicePlayedAt: now() } : d)),
  }
  emit()
}

export const saveSettings = (s: Partial<ReminderSettings>, actor: string, role: Role) => {
  const merged = { ...state.settings, ...s }
  const log = audit(actor, role, '更新提醒设置', '患者端', `语音 ${merged.voiceEnabled ? '开' : '关'} / 语速 ${merged.rate}x / 免打扰 ${merged.quietStart}-${merged.quietEnd}`)
  state = { ...state, settings: merged, audit: [log, ...state.audit] }
  emit('设置已保存')
}

// ---------- 通知 ----------
export const readNotification = (id: string) => {
  state = { ...state, notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }
  emit()
}
export const readAllNotifications = () => {
  state = { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
  emit()
}

// ---------- LIS 数据注入（接口联调） ----------
export const ingestLab = (lab: LabResult, actor = 'LIS 接口') => {
  const findings: { termId: string; term: string; grade: Severity }[] = []
  if (lab.anc < 2.0) findings.push({ termId: 'anc', term: '中性粒细胞计数降低', grade: lab.anc < 0.5 ? 4 : lab.anc < 1.0 ? 3 : lab.anc < 1.5 ? 2 : 1 })
  if (lab.plt < 100) findings.push({ termId: 'plt', term: '血小板计数降低', grade: lab.plt < 25 ? 4 : lab.plt < 50 ? 3 : lab.plt < 75 ? 2 : 1 })

  const patient = state.patients.find((p) => p.id === lab.patientId)
  const newAdrs: AdrEvent[] = findings
    .filter((f) => f.grade >= 2)
    .map((f) => {
      const sop = sopForTerm(f.termId, f.grade)
      return {
        id: uid('adr'), patientId: lab.patientId, termId: f.termId, term: f.term, grade: f.grade,
        symptoms: ['LIS 自动抓取', '无症状上报'], source: 'lis' as const,
        vitals: { anc: lab.anc, platelets: lab.plt, wbc: lab.wbc },
        status: 'triaged' as const, sopId: sop.id,
        timeline: [{
          at: now(), author: 'LIS 接口', role: 'system' as const, action: '自动研判',
          detail: `血常规 ${f.term} ${f.grade} 级（${f.termId === 'anc' ? `ANC ${lab.anc}` : `PLT ${lab.plt}`}×10⁹/L），自动推送处置 SOP：${sop.title}`,
        }],
        createdAt: now(),
      }
    })

  state = {
    ...state,
    labs: [lab, ...state.labs],
    adrs: [...newAdrs, ...state.adrs],
    notifications: findings.length
      ? [
          pushNotification({
            level: findings.some((f) => f.grade >= 3) ? 'danger' : 'warn',
            title: `LIS 结果判读：${patient?.name ?? ''}`,
            body: `ANC ${lab.anc}×10⁹/L，PLT ${lab.plt}×10⁹/L → ${findings.map((f) => `${f.term} ${f.grade} 级`).join('；')}`,
            targetRole: ['nurse', 'doctor', 'qc'], patientId: lab.patientId,
          }),
          ...state.notifications,
        ]
      : state.notifications,
    audit: [audit('LIS 接口', 'system', '检验结果抓取', lab.orderId, `ANC ${lab.anc} / PLT ${lab.plt} / WBC ${lab.wbc}`), ...state.audit],
  }
  emit('LIS 数据已注入')
  return findings
}

export const ingestVital = (v: DeviceVital) => {
  const abnormal = v.temp >= 38.0 || v.hr > 110 || v.sbp < 90 || v.spo2 < 94
  state = {
    ...state,
    vitals: [v, ...state.vitals],
    notifications: abnormal
      ? [
          pushNotification({
            level: 'danger',
            title: `监护预警：${state.patients.find((p) => p.id === v.patientId)?.name ?? v.patientId}`,
            body: `T ${v.temp}℃ / HR ${v.hr} / BP ${v.sbp}/${v.dbp} / SpO₂ ${v.spo2}% —— 超出阈值，请床旁查看`,
            targetRole: ['nurse', 'doctor'], patientId: v.patientId,
          }),
          ...state.notifications,
        ]
      : state.notifications,
  }
  emit(abnormal ? '监护数据异常，已弹窗预警' : '监护数据已同步')
  return abnormal
}

// ---------- 工具 ----------
export const patientById = (id: string) => state.patients.find((p) => p.id === id)
export const assessmentsOf = (id: string) => state.assessments.filter((a) => a.patientId === id)
export const adrsOf = (id: string) => state.adrs.filter((a) => a.patientId === id)
export const followupsOf = (id: string) => state.followups.filter((f) => f.patientId === id)
export const dispatchesOf = (id: string) => state.dispatches.filter((d) => d.patientId === id)
export const labsOf = (id: string) => state.labs.filter((l) => l.patientId === id)
export const chatsOf = (id: string) => state.chats.filter((c) => c.patientId === id)
export const symptomsOf = (id: string) => state.symptoms.filter((s) => s.patientId === id)
