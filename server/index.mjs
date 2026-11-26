// 日间化疗智慧照护系统 · 演示后端（Node 内置 http + node:sqlite，零依赖）
// 提供与前端同一套 REST 接口，内置 HIS/LIS/监护数据模拟与 CTCAE 自动研判。
// 启动：node --experimental-sqlite server/index.mjs   （Node 22.5+；本机 Node 26 可直接运行）
import http from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = Number(process.env.PORT || 8787)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'daychemo.db')

const db = new DatabaseSync(DB_PATH)
db.exec(`
CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS adr_events (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS followups (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS symptoms (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS labs (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vitals (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_patient ON assessments(patient_id);
`)

const uid = (p) => `${p}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
const nowIso = () => new Date().toISOString()

const json = (res, code, body, headers = {}) => {
  const payload = JSON.stringify(body)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  res.end(payload)
}
const readBody = async (req) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('INVALID_JSON')
  }
}
const INSERT_SQL = {
  patients: 'INSERT INTO patients (id, payload, created_at) VALUES (?, ?, ?)',
  audits: 'INSERT INTO audit (id, payload, created_at) VALUES (?, ?, ?)',
  followups: 'INSERT INTO followups (id, patient_id, payload) VALUES (?, ?, ?)',
}
const insert = (table, id, patientId, payload) => {
  const at = nowIso()
  const key = table === 'audit' ? 'audits' : table === 'followups' ? 'followups' : table === 'patients' ? 'patients' : 'created'
  if (key === 'audits') {
    db.prepare(INSERT_SQL.audits).run(id, JSON.stringify(payload), at)
    return
  }
  if (key === 'followups') {
    db.prepare(INSERT_SQL.followups).run(id, patientId, JSON.stringify(payload))
    return
  }
  if (key === 'patients') {
    db.prepare(INSERT_SQL.patients).run(id, JSON.stringify(payload), at)
    return
  }
  db.prepare(`INSERT INTO ${table} (id, patient_id, payload, created_at) VALUES (?, ?, ?, ?)`).run(id, patientId, JSON.stringify(payload), at)
}
const listAll = (table, patientId = null) => {
  const rows = patientId
    ? db.prepare(`SELECT payload FROM ${table} WHERE patient_id = ? ORDER BY rowid DESC`).all(patientId)
    : db.prepare(`SELECT payload FROM ${table} ORDER BY rowid DESC`).all()
  return rows.map((r) => JSON.parse(r.payload))
}
const auditLog = (actor, role, action, target, detail) =>
  insert('audit', uid('au'), null, { id: uid('au'), at: nowIso(), actor, role, action, target, detail })

// CTCAE 阈值研判（与前端 lib/ctcae.ts 保持一致）
const gradeAnc = (anc) => (anc < 0.5 ? 4 : anc < 1.0 ? 3 : anc < 1.5 ? 2 : anc < 2.0 ? 1 : 0)
const gradePlt = (plt) => (plt < 25 ? 4 : plt < 50 ? 3 : plt < 75 ? 2 : plt < 100 ? 1 : 0)
const gradeWbc = (wbc) => (wbc < 1.0 ? 4 : wbc < 2.0 ? 3 : wbc < 3.0 ? 2 : wbc < 4.0 ? 1 : 0)

const ROUTES = {
  'GET /api/health': () => ({ ok: true, db: path.basename(DB_PATH), node: process.version, at: nowIso() }),

  'GET /api/v1/patients': () => listAll('patients'),

  'GET /api/v1/patients/:id/assessments': (params) => listAll('assessments', params.id),

  'POST /api/v1/assessments': async (params, body) => {
    const id = uid('a')
    const rule = body.score >= 60 ? 'high' : body.score >= 30 ? 'mid' : 'low'
    const schedule = rule === 'high' ? [3, 5, 7, 10, 14] : rule === 'mid' ? [4, 7, 14] : [7]
    const assessment = { id, ...body, level: body.level ?? rule, createdAt: nowIso() }
    insert('assessments', id, body.patientId, assessment)
    for (const d of schedule) {
      const fid = uid('f')
      const due = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
      const fu = { id: fid, patientId: body.patientId, dueDate: due, type: '血常规复查', status: 'pending', attempts: 0, note: `${rule} 自动生成（化疗后第 ${d} 天）` }
      insert('followups', fid, body.patientId, fu)
    }
    auditLog(body.nurse ?? 'system', 'nurse', '完成化疗前风险评估', body.patientId, `${rule} ${body.score} 分，生成 ${schedule.length} 条随访`)
    return { ok: true, assessment, followups: schedule.length }
  },

  'GET /api/v1/adr-events': (params) => listAll('adr_events'),
  'POST /api/v1/adr-events': async (params, body) => {
    const id = uid('adr')
    const event = { id, ...body, status: 'reported', createdAt: nowIso(), timeline: [{ at: nowIso(), author: body.actor ?? 'system', role: body.role ?? 'nurse', action: '上报', detail: body.detail ?? '' }] }
    insert('adr_events', id, body.patientId, event)
    auditLog(body.actor ?? 'system', body.role ?? 'nurse', 'ADR 上报', body.patientId, `${body.term} ${body.grade} 级`)
    return { ok: true, event }
  },
  'PATCH /api/v1/adr-events/:id': async (params, body) => {
    const row = db.prepare('SELECT payload FROM adr_events WHERE id = ?').get(params.id)
    if (!row) return { error: 'NOT_FOUND' }
    const ev = JSON.parse(row.payload)
    const updated = {
      ...ev,
      status: body.status ?? ev.status,
      closedAt: body.status === 'closed' ? nowIso() : ev.closedAt,
      timeline: [...ev.timeline, { at: nowIso(), author: body.actor ?? 'system', role: body.role ?? 'nurse', action: body.action ?? '处置', detail: body.detail ?? '' }],
    }
    db.prepare('UPDATE adr_events SET payload = ? WHERE id = ?').run(JSON.stringify(updated), params.id)
    auditLog(body.actor ?? 'system', body.role ?? 'nurse', `ADR ${body.action ?? '处置'}`, ev.patientId, body.detail ?? '')
    return { ok: true, event: updated }
  },

  'GET /api/v1/followups': () => listAll('followups'),
  'PATCH /api/v1/followups/:id': async (params, body) => {
    const row = db.prepare('SELECT payload FROM followups WHERE id = ?').get(params.id)
    if (!row) return { error: 'NOT_FOUND' }
    const fu = { ...JSON.parse(row.payload), ...body, lastAttemptAt: nowIso() }
    db.prepare('UPDATE followups SET payload = ? WHERE id = ?').run(JSON.stringify(fu), params.id)
    return { ok: true, followup: fu }
  },

  'POST /api/v1/symptom-reports': async (params, body) => {
    const temp = body.temp
    let grade = 1, termId = 'fatigue', emergency = false
    if (temp != null && temp >= 38.0) { termId = 'fever'; grade = temp >= 39.5 ? 3 : temp >= 39 ? 2 : 1; emergency = temp >= 38.3 }
    else if ((body.symptoms ?? []).includes('bleeding')) { termId = 'plt'; grade = 3; emergency = true }
    else if ((body.symptoms ?? []).includes('breath')) { termId = 'allergy'; grade = 3; emergency = true }
    else if ((body.symptoms ?? []).includes('vomit')) { termId = 'vomit'; grade = 2; emergency = true }
    const id = uid('s')
    const report = { id, ...body, termId, grade, escalated: emergency, createdAt: nowIso() }
    insert('symptoms', id, body.patientId, report)
    let adrId = null
    if (grade >= 2 || emergency) {
      adrId = uid('adr')
      const event = { id: adrId, patientId: body.patientId, termId, term: body.term ?? '症状上报', grade, symptoms: body.symptoms ?? [], source: 'patient', status: 'triaged', createdAt: nowIso(), timeline: [{ at: nowIso(), author: body.actor ?? 'patient', role: 'patient', action: '居家自助上报', detail: `CTCAE 初判 ${grade} 级${emergency ? '，触发红色预警' : ''}` }] }
      insert('adr_events', adrId, body.patientId, event)
    }
    return { ok: true, report: { ...report, adrId }, emergency }
  },

  'POST /api/v1/ai/ask': async (params, body) => {
    // 知识库由前端内置，服务端仅做边界判定与留痕（演示）
    const q = String(body.question ?? '')
    const emergencyKw = ['胸痛', '胸闷', '喘不上气', '呼吸困难', '意识', '出血不止', '休克', '39度', '40度']
    const emergency = emergencyKw.some((k) => q.includes(k))
    const id = uid('c')
    const turn = { id, patientId: body.patientId, question: q, answer: body.answer ?? '', intent: emergency ? '急症识别' : '宣教指引', needsHuman: emergency, escalated: false, at: nowIso() }
    insert('chats', id, body.patientId, turn)
    return { ok: true, turn, boundary: emergency ? 'emergency' : 'education' }
  },

  'POST /api/v1/integrations/lis/results': async (params, body) => {
    const id = uid('lab')
    const lab = { id, ...body, source: 'LIS', at: nowIso() }
    insert('labs', id, body.patientId, lab)
    const findings = []
    const ga = gradeAnc(body.anc), gp = gradePlt(body.plt), gw = gradeWbc(body.wbc)
    if (ga >= 1) findings.push({ termId: 'anc', term: '中性粒细胞计数降低', grade: ga })
    if (gp >= 1) findings.push({ termId: 'plt', term: '血小板计数降低', grade: gp })
    if (gw >= 1) findings.push({ termId: 'wbc', term: '白细胞计数降低', grade: gw })
    const created = []
    for (const f of findings.filter((x) => x.grade >= 2)) {
      const adrId = uid('adr')
      const ev = { id: adrId, patientId: body.patientId, termId: f.termId, term: f.term, grade: f.grade, symptoms: ['LIS 自动抓取'], source: 'lis', status: 'triaged', createdAt: nowIso(), timeline: [{ at: nowIso(), author: 'LIS 接口', role: 'system', action: '自动研判', detail: `血常规 ${f.term} ${f.grade} 级` }] }
      insert('adr_events', adrId, body.patientId, ev)
      created.push(ev)
    }
    auditLog('LIS 接口', 'system', '检验结果抓取', body.orderId ?? id, `ANC ${body.anc} / PLT ${body.plt}`)
    return { ok: true, lab, findings, adrs: created.length }
  },

  'POST /api/v1/integrations/device/vitals': async (params, body) => {
    const id = uid('v')
    const abnormal = body.temp >= 38.0 || body.hr > 110 || body.sbp < 90 || body.spo2 < 94
    insert('vitals', id, body.patientId, { id, ...body, at: nowIso() })
    return { ok: true, abnormal, pushed: abnormal }
  },

  'GET /api/v1/qc/summary': () => {
    const adrs = listAll('adr_events')
    const fus = listAll('followups')
    const patients = listAll('patients')
    const done = fus.filter((f) => f.status === 'done').length
    return {
      ok: true,
      patients: patients.length,
      adrCount: adrs.length,
      adrHigh: adrs.filter((a) => a.grade >= 3).length,
      adrClosed: adrs.filter((a) => a.status === 'closed').length,
      fuTotal: fus.length,
      fuDone: done,
      fuLate: fus.filter((f) => f.status === 'late').length,
      fuMissed: fus.filter((f) => f.status === 'missed').length,
      fuRate: fus.length ? Math.round((done / fus.length) * 100) : 0,
      delayedAnc: adrs.filter((a) => (a.termId === 'anc' || a.termId === 'plt') && a.grade >= 3 && !a.timeline?.some((l) => l.role !== 'system' && l.role !== 'patient')).length,
    }
  },

  'GET /api/v1/qc/hfmea.csv': () => {
    const adrs = listAll('adr_events')
    const s = (g) => (g >= 4 ? 9 : g === 3 ? 8 : 5)
    const rows = adrs.map((a, i) => {
      const d = a.delayedDetection ? 9 : a.source === 'lis' ? 4 : a.source === 'nurse' ? 2 : 5
      return [i + 1, `${a.term}（${a.grade} 级）未及时识别`, a.source === 'patient' ? '居家上报滞后' : a.source === 'lis' ? '检验判读依赖人工' : '巡视间隔过长', a.grade >= 3 ? '延误治疗' : '症状加重', 'ADR 闭环 SOP', s(a.grade), 3, d, s(a.grade) * 3 * d, a.createdAt]
    })
    const csv = '\uFEFF序号,失效模式,失效原因,影响,当前措施,S,O,D,RPN,上报时间\n' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    return { raw: csv, contentType: 'text/csv; charset=utf-8', filename: 'HFMEA-analysis.csv' }
  },

  'GET /api/v1/audit': () => listAll('audit'),
}

const matchRoute = (method, pathname) => {
  for (const [key, handler] of Object.entries(ROUTES)) {
    const [m, pattern] = key.split(' ')
    if (m !== method) continue
    const parts = pattern.split('/')
    const segs = pathname.split('/')
    if (parts.length !== segs.length) continue
    const params = {}
    let ok = true
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) params[parts[i].slice(1)] = decodeURIComponent(segs[i])
      else if (parts[i] !== segs[i]) { ok = false; break }
    }
    if (ok) return { handler, params }
  }
  return null
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }

const serveStatic = async (res, pathname) => {
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST, safe)
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream' })
    res.end(data)
    return true
  } catch {
    try {
      const html = await readFile(path.join(DIST, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
      return true
    } catch {
      return false
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('referrer-policy', 'no-referrer')
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type' })
    return res.end()
  }
  if (process.env.CORS === '1') res.setHeader('access-control-allow-origin', '*')

  if (url.pathname === '/api' || url.pathname === '/api/docs') {
    return json(res, 200, {
      service: '日间化疗智慧照护系统 API（演示）',
      endpoints: Object.keys(ROUTES),
      note: '演示后端，数据仅用于功能验证；生产部署须接入院内 HIS/LIS 并满足等保三级要求。',
    })
  }

  const matched = matchRoute(req.method ?? 'GET', url.pathname)
  if (matched) {
    try {
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method ?? '') ? await readBody(req) : {}
      const result = await matched.handler(matched.params, body)
      if (result && result.raw) {
        res.writeHead(200, { 'content-type': result.contentType, 'content-disposition': `attachment; filename="${result.filename}"` })
        return res.end(result.raw)
      }
      if (result && result.error === 'NOT_FOUND') return json(res, 404, { error: 'not_found' })
      return json(res, 200, result)
    } catch (e) {
      return json(res, e.message === 'INVALID_JSON' ? 400 : 500, { error: e.message })
    }
  }

  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found', path: url.pathname })

  if (await serveStatic(res, url.pathname)) return
  json(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => {
  console.log(`[daychemo] API + static server: http://127.0.0.1:${PORT}`)
  console.log(`[daychemo] DB: ${DB_PATH}`)
  console.log(`[daychemo] 提示：先执行 npm run build 生成 dist/，再启动本服务可同时托管前端`)
})

const shutdown = () => {
  try { db.close() } catch {}
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
