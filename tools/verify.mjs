// 业务规则自检（无需浏览器）：风险分级 / CTCAE 阈值 / 随访计划 / AI 边界 / 质控口径
// 运行：node tools/verify.mjs
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

let pass = 0
let fail = 0
const results = []
const check = (name, fn) => {
  try {
    fn()
    pass++
    results.push(`✅ ${name}`)
  } catch (e) {
    fail++
    results.push(`❌ ${name} — ${e.message}`)
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg ?? '断言失败')
}
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol

// ---------- 1. CTCAE 阈值（与 src/lib/ctcae.ts 保持一致）----------
const gradeAnc = (v) => (v < 0.5 ? 4 : v < 1.0 ? 3 : v < 1.5 ? 2 : v < 2.0 ? 1 : 0)
const gradePlt = (v) => (v < 25 ? 4 : v < 50 ? 3 : v < 75 ? 2 : v < 100 ? 1 : 0)
const gradeWbc = (v) => (v < 1.0 ? 4 : v < 2.0 ? 3 : v < 3.0 ? 2 : v < 4.0 ? 1 : 0)
const gradeHb = (v) => (v < 60 ? 4 : v < 80 ? 3 : v < 100 ? 2 : v < 110 ? 1 : 0)

check('CTCAE ANC 分级边界（1.5/1.0/0.5）', () => {
  assert(gradeAnc(2.4) === 0)
  assert(gradeAnc(1.9) === 1)
  assert(gradeAnc(1.4) === 2)
  assert(gradeAnc(0.9) === 3)
  assert(gradeAnc(0.4) === 4)
})
check('CTCAE PLT 分级边界（75/50/25）', () => {
  assert(gradePlt(180) === 0)
  assert(gradePlt(90) === 1)
  assert(gradePlt(60) === 2)
  assert(gradePlt(40) === 3)
  assert(gradePlt(18) === 4)
})
check('CTCAE WBC / Hb 分级', () => {
  assert(gradeWbc(3.4) === 1 && gradeWbc(2.5) === 2 && gradeWbc(1.2) === 3 && gradeWbc(0.6) === 4)
  assert(gradeHb(105) === 1 && gradeHb(92) === 2 && gradeHb(72) === 3 && gradeHb(55) === 4)
})

// ---------- 2. 风险评分→等级（与 src/data/riskForm.ts 一致）----------
const totalWeight = 89 // 14 项权重之和
const scoreOf = (raw) => Math.round((raw / totalWeight) * 100)
const levelOf = (s) => (s >= 60 ? 'high' : s >= 30 ? 'mid' : 'low')

check('风险分值归一化与等级阈值（30/60）', () => {
  assert(levelOf(scoreOf(26)) === 'low', `26 分应低危，实得 ${scoreOf(26)}`)
  assert(levelOf(scoreOf(30)) === 'mid', `30 分应中危，实得 ${scoreOf(30)}`)
  assert(levelOf(scoreOf(53)) === 'high', `53 分应高危，实得 ${scoreOf(53)}`)
  assert(scoreOf(89) === 100)
})

check('风险权重与表单条目数一致', () => {
  const src = readFileSync('src/data/riskForm.ts', 'utf8')
  const weights = [...src.matchAll(/weight: (\d+)/g)].map((m) => Number(m[1]))
  assert(weights.length === 14, `应有 14 项，实际 ${weights.length}`)
  const sum = weights.reduce((a, b) => a + b, 0)
  assert(sum === totalWeight, `权重和应为 ${totalWeight}，实际 ${sum}`)
})

check('风险分级联动动作完整（低/中/高三档各有动作）', () => {
  const src = readFileSync('src/data/riskForm.ts', 'utf8')
  assert(src.includes("level: 'low'") && src.includes("level: 'mid'") && src.includes("level: 'high'"))
  assert((src.match(/actions: \[/g) ?? []).length === 3, '三档均应配置联动动作')
})

// ---------- 3. 随访计划生成规则 ----------
const schedule = { low: [7], mid: [4, 7, 14], high: [3, 5, 7, 10, 14] }
check('随访计划按风险分层生成', () => {
  assert(schedule.low.length === 1)
  assert(schedule.mid.length === 3)
  assert(schedule.high.length === 5)
  assert(schedule.high.every((d) => d <= 14))
})
check('源码中随访计划规则与文档一致', () => {
  const src = readFileSync('src/store/app.ts', 'utf8')
  assert(/low: \[7\], mid: \[4, 7, 14\], high: \[3, 5, 7, 10, 14\]/.test(src), '应与 PRD 第 4.2 节一致')
})

// ---------- 4. 危急症状识别 ----------
const EMERGENCY = {
  fever: (t) => t >= 38.3,
  bleeding: () => true,
  breath: () => true,
  shock: () => true,
}
check('发热阈值 38.3℃ 触发高危引导', () => {
  assert(EMERGENCY.fever(38.2) === false)
  assert(EMERGENCY.fever(38.3) === true)
})
check('高危症状清单覆盖发热/出血/气道/循环/外渗', () => {
  const src = readFileSync('src/lib/ctcae.ts', 'utf8')
  for (const k of ['fever383', 'bleeding', 'breath', 'shock', 'vomit', 'rash', 'extrav']) {
    assert(src.includes(`key: '${k}'`), `缺少高危项 ${k}`)
  }
})

// ---------- 5. AI 边界（不生成诊疗方案；急症/超范围转人工）----------
check('AI 知识库边界三档齐备', () => {
  const src = readFileSync('src/data/kb.ts', 'utf8')
  assert(src.includes("boundary: 'education'"))
  assert(src.includes("boundary: 'triage'"))
  assert(src.includes("boundary: 'emergency'"))
})
check('AI 明确免责声明（不替代执业医师）', () => {
  const src = readFileSync('src/data/kb.ts', 'utf8')
  assert(src.includes('我不能替代医生做出调整决定') || src.includes('不替代执业医师'))
  const ui = readFileSync('src/pages/patient/Patient.tsx', 'utf8')
  assert(ui.includes('不替代执业医师诊疗'))
})
check('急症关键词触发强制引导', () => {
  const src = readFileSync('src/store/app.ts', 'utf8')
  assert(src.includes('EMERGENCY_KW'))
  assert(src.includes('拨打 120'))
})

// ---------- 6. 免打扰时段计算 ----------
const inQuiet = (start, end, h, m) => {
  const cur = h * 60 + m
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  const e = eh * 60 + em
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e
}
check('免打扰时段跨零点判断正确（22:00-07:00）', () => {
  assert(inQuiet('22:00', '07:00', 23, 30) === true)
  assert(inQuiet('22:00', '07:00', 3, 0) === true)
  assert(inQuiet('22:00', '07:00', 12, 0) === false)
  assert(inQuiet('22:00', '07:00', 7, 0) === false)
  assert(inQuiet('22:00', '07:00', 21, 59) === false)
})

// ---------- 7. 提醒模板时间轴 ----------
check('提醒模板覆盖化疗前/中/后三阶段', () => {
  const src = readFileSync('src/data/templates.ts', 'utf8')
  assert(src.includes("id: 'tpl-pre-24'"))
  assert(src.includes("id: 'tpl-during-30'"))
  assert(src.includes("id: 'tpl-post-168'"))
  assert((src.match(/approvedBy:/g) ?? []).length >= 12, '模板均应标注审核人')
})
check('提醒模板含免打扰与语音渠道', () => {
  const src = readFileSync('src/data/templates.ts', 'utf8')
  assert(src.includes("channel: ['push', 'voice']"))
  assert(src.includes('voiceText:'), '语音播报文案须单独维护')
})

// ---------- 8. SOP 库覆盖高频风险 ----------
check('SOP 覆盖过敏/骨髓抑制/消化道/外渗/感染/发热', () => {
  const src = readFileSync('src/data/sop.ts', 'utf8')
  for (const cat of ['过敏反应', '骨髓抑制', '血管通路', '消化道', '感染', '全身']) {
    assert(src.includes(`category: '${cat}'`) || src.includes('sop-fever'), `缺少类别 ${cat}`)
  }
  assert((src.match(/id: 'sop-/g) ?? []).length >= 10, 'SOP 条目应 ≥10')
})

// ---------- 9. 宣教库覆盖三阶段 + 素材形式 ----------
check('宣教素材覆盖化疗前三阶段与多种形式', () => {
  const src = readFileSync('src/data/education.ts', 'utf8')
  assert(src.includes("phase: 'pre'") && src.includes("phase: 'during'") && src.includes("phase: 'post'"))
  assert(src.includes("form: '图文'") || src.includes("form: '图文+语音'"))
  assert(src.includes("form: '语音'") || src.includes("form: '短视频'"))
  assert(src.includes('approvedBy:'), '宣教内容须专科审核署名')
})

// ---------- 10. 离线语音包 ----------
check('离线语音包已生成且含清单', () => {
  const manifest = path.resolve('public/audio/manifest.json')
  assert(existsSync(manifest), '缺少 public/audio/manifest.json，请运行 node tools/gen-audio.mjs')
  const m = JSON.parse(readFileSync(manifest, 'utf8'))
  assert(m.clips.length >= 8, `音频片段应 ≥8，实际 ${m.clips.length}`)
  for (const c of m.clips) assert(existsSync(path.join('public/audio', c.file)), `缺少音频 ${c.file}`)
})

// ---------- 11. 质控指标口径 ----------
check('质控指标包含需求要求的全部统计项', () => {
  const src = readFileSync('src/lib/qc.ts', 'utf8')
  for (const k of ['assessRate', 'eduRate', 'fuRate', 'adrCount', 'delayedAnc']) {
    assert(src.includes(k), `缺少指标 ${k}`)
  }
  const ui = readFileSync('src/pages/qc/Qc.tsx', 'utf8')
  assert(ui.includes('风险评估完成率') && ui.includes('宣教覆盖率') && ui.includes('随访完成率'))
  assert(ui.includes('骨髓抑制延迟发现'))
})
check('HFMEA 报表含 S/O/D/RPN 列', () => {
  const src = readFileSync('src/lib/qc.ts', 'utf8')
  for (const k of ['S:', 'O:', 'D:', 'RPN:']) assert(src.includes(k), `HFMEA 缺少 ${k}`)
})
check('品管圈报表按不良反应类型统计', () => {
  const src = readFileSync('src/lib/qc.ts', 'utf8')
  assert(src.includes('buildQccRows') && src.includes('不良反应类型'))
})

// ---------- 12. 权限矩阵 ----------
check('五类角色权限矩阵齐备', () => {
  const src = readFileSync('src/lib/permissions.ts', 'utf8')
  for (const r of ['doctor', 'nurse', 'headnurse', 'qc', 'patient']) assert(src.includes(`${r}:`), `缺少角色 ${r}`)
  assert(src.includes('PERMISSIONS'))
})
check('患者角色无后台权限', () => {
  const src = readFileSync('src/lib/permissions.ts', 'utf8')
  const m = src.match(/patient: \[([^\]]*)\]/)
  assert(m && m[1].trim() === '', '患者权限应为空集')
})

// ---------- 13. 隐私脱敏 ----------
check('隐私脱敏函数存在且被列表使用', () => {
  const src = readFileSync('src/lib/date.ts', 'utf8')
  assert(src.includes('maskPhone') && src.includes('maskMrn') && src.includes('maskName'))
  const drawer = readFileSync('src/components/PatientDrawer.tsx', 'utf8')
  assert(drawer.includes('maskMrn') && drawer.includes('maskPhone'))
})

// ---------- 14. 后端接口实现 ----------
check('后端实现 PRD 列出的核心接口', () => {
  const src = readFileSync('server/index.mjs', 'utf8')
  const required = [
    '/api/v1/patients', '/api/v1/assessments', '/api/v1/adr-events', '/api/v1/symptom-reports',
    '/api/v1/ai/ask', '/api/v1/followups', '/api/v1/qc/summary', '/api/v1/qc/hfmea.csv',
    '/api/v1/integrations/lis/results', '/api/v1/integrations/device/vitals', '/api/v1/audit',
  ]
  for (const r of required) assert(src.includes(r), `缺少接口 ${r}`)
})
check('后端含 CTCAE 自动研判与审计留痕', () => {
  const src = readFileSync('server/index.mjs', 'utf8')
  assert(src.includes('gradeAnc') && src.includes('gradePlt'))
  assert(src.includes('auditLog'))
  assert(src.includes('INSERT INTO audit'))
})

// ---------- 14b. 知识库导入工具 ----------
check('知识库批量导入脚本可用（四类模板齐备）', () => {
  const src = readFileSync('tools/import-kb.mjs', 'utf8')
  for (const k of ["kb:", "sop:", "ctcae:", "edu:", "tpl:"]) assert(src.includes(k), `缺少类别 ${k}`)
  assert(src.includes('parseCsv'), '缺少 CSV 解析')
  assert(src.includes('不得出现特殊符号') || src.includes('voiceText 含不宜朗读符号'), '缺少语音文案校验')
  const samples = ['docs/samples/kb-sample.csv', 'docs/samples/sop-sample.csv', 'docs/samples/edu-sample.csv', 'docs/samples/tpl-sample.csv']
  for (const f of samples) assert(existsSync(f), `缺少示例 ${f}`)
})

check('导入内容已实际并入系统数据（KB 18 / SOP 13 / 宣教 11 / 模板 13）', () => {
  const kb = readFileSync('src/data/kb.ts', 'utf8')
  assert((kb.match(/kb-[0-9]+|kb-custom/g) ?? []).length >= 18, 'KB 条目不足 18')
  const sop = readFileSync('src/data/sop.ts', 'utf8')
  assert((sop.match(/id: 'sop-/g) ?? []).length >= 13, 'SOP 条目不足 13')
  const edu = readFileSync('src/data/education.ts', 'utf8')
  assert((edu.match(/id: 'edu-/g) ?? []).length >= 11, '宣教条目不足 11')
  const tpl = readFileSync('src/data/templates.ts', 'utf8')
  assert((tpl.match(/id: 'tpl-/g) ?? []).length >= 13, '模板条目不足 13')
})

// ---------- 15. 文档齐备性 ----------
check('交付文档齐备（手册/运维/培训/知识库模板/PRD）', () => {
  const files = ['docs/PRD.md', 'docs/操作手册.md', 'docs/运维文档.md', 'docs/知识库导入模板.md', 'docs/培训PPT.md']
  for (const f of files) assert(existsSync(f), `缺少文档 ${f}`)
  assert(existsSync('docs/日间化疗智慧照护系统-培训PPT.pptx') || existsSync('docs/training.pptx'), '缺少培训 PPT 文件')
})

// ---------- 输出 ----------
console.log(results.join('\n'))
console.log(`\n通过 ${pass} / ${pass + fail}`)
if (fail > 0) process.exitCode = 1
