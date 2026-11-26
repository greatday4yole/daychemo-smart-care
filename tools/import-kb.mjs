// 专科知识库批量导入助手
// 用法：node tools/import-kb.mjs <csv文件> <kb|sop|ctcae|edu|tpl> [--out 输出目录]
// 功能：字段校验 → 枚举校验 → id 唯一性检查 → 生成待人工合并的 TypeScript 片段 + 校验报告
// 说明：不直接改写 src/data/*.ts，避免误覆盖院内既有内容；生成片段后人工合并并重新构建。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const [, , file, kind, ...rest] = process.argv
if (!file || !kind) {
  console.error('用法：node tools/import-kb.mjs <csv文件> <kb|sop|ctcae|edu|tpl> [--out 目录]')
  process.exit(1)
}

const outIdx = rest.indexOf('--out')
const outDir = outIdx >= 0 ? rest[outIdx + 1] : 'import-out'

// ---------- CSV 解析（支持引号内逗号与换行、双引号转义）----------
export const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const body = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') { field += '"'; i++ }
        else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\r') continue
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// ---------- 各类别字段与枚举定义 ----------
const ENUMS = {
  boundary: ['education', 'triage', 'emergency'],
  phase: ['pre', 'during', 'post'],
  category: ['过敏反应', '骨髓抑制', '血管通路', '消化道', '感染', '全身'],
  audience: ['all', 'low', 'mid', 'high'],
  form: ['图文', '语音', '短视频', '图文+语音'],
}

const SPEC = {
  kb: {
    name: 'AI 问答知识库',
    target: 'src/data/kb.ts',
    required: ['id', 'question', 'keywords', 'answer', 'category', 'boundary', 'approvedBy', 'updatedAt'],
    arrays: { keywords: /[、,，;；|]/ },
    validate: (r) => {
      const errs = []
      if (!ENUMS.boundary.includes(r.boundary)) errs.push(`boundary 非法（应为 ${ENUMS.boundary.join('/')}）`)
      if (r.answer.length < 10) errs.push('answer 少于 10 字')
      if (r.answer.length > 600) errs.push('answer 超过 600 字（建议拆分）')
      // 红线判定：问题本身涉及个体化用药/方案/预后，或答案给出化疗药具体剂量
      const riskyQ = /(停药|减量|减药|调整.*药|换方案|用.*药.*多少|打不打|要不要打)/.test(r.question) ||
        /(预后|生存期|还能活|能活多久|治愈率|复发率)/.test(r.question)
      const chemoDose = /(紫杉醇|多西他赛|卡铂|顺铂|奥沙利铂|多柔比星|表柔比星|环磷酰胺|氟尿嘧啶|伊立替康|吉西他滨)\s*\d+\s*(mg|mg\/m)/.test(r.answer)
      if ((riskyQ || chemoDose) && r.boundary !== 'triage') {
        errs.push('涉及停药/减量/方案/预后或化疗药剂量，边界必须为 triage')
      }
      const emer = /(发热|发烧|出血|胸闷|气促|休克|意识)/.test(r.question)
      if (emer && r.boundary === 'education' && /≥\s*38\.3|38\.3/.test(r.answer)) {
        // 含急症阈值的条目建议 emergency
        errs.push('提示：含急症阈值（38.3℃）建议 boundary=emergency')
      }
      return errs
    },
    toTs: (r) => `
  {
    id: ${q(r.id)},
    question: ${q(r.question)},
    keywords: [${r.keywords.split(/[、,，;；|]/).map((s) => q(s.trim())).filter(Boolean).join(', ')}],
    answer: ${q(r.answer)},
    category: ${q(r.category)},
    boundary: ${q(r.boundary)},
    approvedBy: ${q(r.approvedBy)},
    updatedAt: ${q(r.updatedAt)},
    hits: 0,
  },`,
  },
  sop: {
    name: '处置 SOP 库',
    target: 'src/data/sop.ts',
    required: ['id', 'title', 'category', 'grade', 'trigger', 'steps', 'orders', 'recheck', 'escalate', 'source'],
    arrays: { steps: /\|/, orders: /\|/ },
    validate: (r) => {
      const errs = []
      if (!ENUMS.category.includes(r.category)) errs.push(`category 非法（应为 ${ENUMS.category.join('/')}）`)
      if (!/^[0-4]$/.test(String(r.grade))) errs.push('grade 应为 0–4 整数')
      if (r.steps.split('|').length < 3) errs.push('steps 少于 3 步')
      if (!/按医嘱/.test(r.orders)) errs.push('orders 须出现「按医嘱」以声明不替代医嘱')
      const quantified = /[<>≥≤]|\d/.test(r.escalate)
      const urgentAction = /(急诊|抢救|ICU|立即|呼叫|转科)/.test(r.escalate)
      if (!quantified && !urgentAction) errs.push('escalate 需含可量化阈值或明确升级动作（急诊/抢救/ICU/立即）')
      if (!r.source.trim()) errs.push('source 为空')
      return errs
    },
    toTs: (r) => `
  {
    id: ${q(r.id)},
    title: ${q(r.title)},
    category: ${q(r.category)},
    grade: ${Number(r.grade)},
    trigger: ${q(r.trigger)},
    steps: [${r.steps.split('|').map((s) => q(s.trim())).filter(Boolean).join(', ')}],
    orders: [${r.orders.split('|').map((s) => q(s.trim())).filter(Boolean).join(', ')}],
    recheck: ${q(r.recheck)},
    escalate: ${q(r.escalate)},
    source: ${q(r.source)},
  },`,
  },
  ctcae: {
    name: 'CTCAE 分级库',
    target: 'src/data/ctcae.ts',
    required: ['id', 'term', 'category', 'grade1', 'grade2', 'grade3', 'grade4', 'note'],
    validate: (r) => {
      const errs = []
      if (!['骨髓抑制', '过敏', '皮肤', '血管通路', '消化道', '全身', '神经'].includes(r.category)) {
        errs.push(`category 非建议枚举（${r.category}）`)
      }
      if (!r.grade1 || !r.grade2 || !r.grade3 || !r.grade4) errs.push('四个等级标准不能为空（无该级用 —）')
      return errs
    },
    toTs: (r) => `
  {
    id: ${q(r.id)},
    term: ${q(r.term)},
    category: ${q(r.category)},
    grade1: ${q(r.grade1)},
    grade2: ${q(r.grade2)},
    grade3: ${q(r.grade3)},
    grade4: ${q(r.grade4)},
    ${r.grade5 ? `grade5: ${q(r.grade5)},` : ''}
    note: ${q(r.note)},
  },`,
  },
  edu: {
    name: '宣教素材库',
    target: 'src/data/education.ts',
    required: ['id', 'title', 'phase', 'audience', 'form', 'body', 'keyPoints', 'approvedBy', 'approvedAt', 'version', 'tags'],
    arrays: { keyPoints: /\|/, tags: /[、,，|]/ },
    validate: (r) => {
      const errs = []
      if (!ENUMS.phase.includes(r.phase)) errs.push(`phase 非法（${r.phase}）`)
      if (!ENUMS.form.includes(r.form)) errs.push(`form 非法（${r.form}）`)
      const auds = r.audience.split(/[、,，|]/).map((s) => s.trim())
      if (!auds.every((a) => ENUMS.audience.includes(a))) errs.push('audience 含非法值')
      if (r.keyPoints.split('|').length < 3) errs.push('keyPoints 少于 3 条')
      if (r.body.length > 800) errs.push('body 超过 800 字')
      if (!/^v\d+\.\d+/.test(r.version)) errs.push('version 应形如 v1.0')
      return errs
    },
    toTs: (r) => {
      const auds = r.audience.split(/[、,，|]/).map((s) => s.trim())
      const audVal = auds.length === 1 && auds[0] === 'all' ? "'all'" : `[${auds.map((a) => q(a)).join(', ')}]`
      return `
  {
    id: ${q(r.id)},
    title: ${q(r.title)},
    phase: ${q(r.phase)},
    audience: ${audVal},
    form: ${q(r.form)},
    body: ${q(r.body)},
    keyPoints: [${r.keyPoints.split('|').map((s) => q(s.trim())).filter(Boolean).join(', ')}],
    ${r.audio ? `audio: ${q(r.audio)},` : ''}
    approvedBy: ${q(r.approvedBy)},
    approvedAt: ${q(r.approvedAt)},
    version: ${q(r.version)},
    tags: [${r.tags.split(/[、,，|]/).map((s) => q(s.trim())).filter(Boolean).join(', ')}],
  },`
    },
  },
  tpl: {
    name: '提醒模板库',
    target: 'src/data/templates.ts',
    required: ['id', 'phase', 'offsetHours', 'title', 'body', 'voiceText', 'riskFilter', 'channel', 'approvedBy'],
    arrays: { channel: /\|/, riskFilter: /[、,，|]/ },
    validate: (r) => {
      const errs = []
      if (!ENUMS.phase.includes(r.phase)) errs.push(`phase 非法（${r.phase}）`)
      if (!/^-?\d+(\.\d+)?$/.test(String(r.offsetHours))) errs.push('offsetHours 应为数字（可为负）')
      const ch = r.channel.split('|').map((s) => s.trim())
      if (!ch.every((c) => ['push', 'voice', 'sms'].includes(c))) errs.push('channel 只能是 push|voice|sms')
      if (r.body.length > 160) errs.push('body 超过 160 字（推送体感差）')
      // 语音文案检查：不得出现特殊符号
      const bad = r.voiceText.match(/[①-⑳≥≤×⁹²³℃%/,;:\[\]]/)
      if (bad) errs.push(`voiceText 含不宜朗读符号「${bad[0]}」，请改写为口语（如 38℃→三十八度）`)
      if (/^\d+(\.\d+)?\s*(ml|mg)/i.test(r.voiceText)) errs.push('voiceText 数字单位建议口语化')
      return errs
    },
    toTs: (r) => {
      const risk = r.riskFilter.split(/[、,，|]/).map((s) => s.trim())
      const riskVal = risk.length === 1 && risk[0] === 'all' ? "'all'" : `[${risk.map((a) => q(a)).join(', ')}]`
      return `
  {
    id: ${q(r.id)},
    phase: ${q(r.phase)},
    offsetHours: ${Number(r.offsetHours)},
    title: ${q(r.title)},
    body: ${q(r.body)},
    voiceText: ${q(r.voiceText)},
    riskFilter: ${riskVal},
    channel: [${r.channel.split('|').map((s) => q(s.trim())).join(', ')}],
    enabled: true,
    approvedBy: ${q(r.approvedBy)},
    editable: true,
  },`
    },
  },
}

const q = (v) => JSON.stringify(String(v ?? '').trim())

const spec = SPEC[kind]
if (!spec) {
  console.error(`未知类别「${kind}」，可选：${Object.keys(SPEC).join(' / ')}`)
  process.exit(1)
}

// ---------- 执行 ----------
const raw = readFileSync(file, 'utf8')
const table = parseCsv(raw)
if (table.length < 2) {
  console.error('CSV 至少需要表头 + 1 行数据')
  process.exit(1)
}

const header = table[0].map((h) => h.trim())
const missingCols = spec.required.filter((c) => !header.includes(c))
if (missingCols.length) {
  console.error(`缺少必需列：${missingCols.join(', ')}`)
  console.error(`当前表头：${header.join(', ')}`)
  process.exit(1)
}

const rows = table.slice(1).map((cells) => {
  const obj = {}
  header.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
  return obj
})

const report = []
const good = []
const seenIds = new Set()

for (let i = 0; i < rows.length; i++) {
  const r = rows[i]
  const lineNo = i + 2
  const errs = []

  for (const c of spec.required) if (!r[c]) errs.push(`字段 ${c} 为空`)
  if (r.id) {
    if (seenIds.has(r.id)) errs.push(`id 重复：${r.id}`)
    seenIds.add(r.id)
  }
  if (r.phase && !ENUMS.phase.includes(r.phase)) errs.push(`phase 非法：${r.phase}`)

  try {
    if (errs.length === 0) errs.push(...spec.validate(r))
  } catch (e) {
    errs.push(`校验异常：${e.message}`)
  }

  if (errs.length) {
    report.push(`第 ${lineNo} 行 [${r.id || '无id'}] ❌\n  - ${errs.join('\n  - ')}`)
  } else {
    good.push(r)
    report.push(`第 ${lineNo} 行 [${r.id}] ✅ ${r.title ?? r.question ?? r.term ?? r.id}`)
  }
}

mkdirSync(outDir, { recursive: true })
const tsBody = good.map(spec.toTs).join('\n')
const tsFile = path.join(outDir, `${kind}-import.generated.ts`)
writeFileSync(tsFile, `// 由 tools/import-kb.mjs 生成（请人工合并到 ${spec.target}）\n// 来源文件：${path.basename(file)}\n// 生成时间：${new Date().toISOString()}\n// 通过校验：${good.length} / ${rows.length}\n\nexport const IMPORTED = [${tsBody}\n]\n`)

const reportFile = path.join(outDir, `${kind}-import-report.txt`)
writeFileSync(
  reportFile,
  [
    `类别：${spec.name}（${kind}）`,
    `目标文件：${spec.target}`,
    `来源：${path.basename(file)}`,
    `总计 ${rows.length} 行，通过 ${good.length}，失败 ${rows.length - good.length}`,
    '',
    ...report,
    '',
    good.length === 0 ? '没有可导入条目，请修正后重试。' : `已生成片段：${tsFile}`,
  ].join('\n'),
)

console.log(`\n类别：${spec.name}　目标：${spec.target}`)
console.log(`总计 ${rows.length} 行，通过 ${good.length}，失败 ${rows.length - good.length}\n`)
report.forEach((l) => console.log(l))
console.log(`\n生成片段：${tsFile}`)
console.log(`校验报告：${reportFile}`)
console.log('\n下一步：人工合并到目标文件 → npm run verify → npm run build')

if (rows.length - good.length > 0) process.exitCode = 1
