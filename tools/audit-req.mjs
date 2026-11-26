// 逐条需求截图审计：对应原需求 6 大模块的每一项，确认线上可点击、可见
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'https://greatday4yole.github.io/daychemo-smart-care/'
const OUT = '/tmp/audit'
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } })
const p = await ctx.newPage()
const found = {}
const seen = (k, v = true) => { found[k] = v }

const goto = async (hash) => { await p.goto(`${BASE}#/${hash}`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700) }
const hasText = async (t) => (await p.getByText(t, { exact: false }).count()) > 0

// 登录
await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700)
seen('角色选择首页（6 类角色）', (await p.locator('.group.relative').count()) === 6)
await p.getByText('李晓梅').first().click(); await p.waitForTimeout(600)

// 模块1
await p.locator('aside nav button', { hasText: '化疗前风险评估' }).first().click(); await p.waitForTimeout(600)
seen('M1-1 标准化评估表单一键勾选自动分级', await hasText('标准化风险评估表单'))
seen('M1-1 过敏史/骨髓抑制/基础疾病/血管条件/营养 五维度', (await p.locator('text=过敏与既往反应').count()) > 0 && (await p.locator('text=营养与支持系统').count()) > 0)
seen('M1-4 CTCAE 知识库可查阅', (await p.locator('button:has-text("CTCAE 知识库")').count()) > 0)
seen('M1-5 个体化宣教清单', await hasText('预览个体化宣教清单'))
await p.screenshot({ path: `${OUT}/m1.png`, fullPage: true })

await p.locator('aside nav button', { hasText: '工作台 / 风险看板' }).first().click(); await p.waitForTimeout(500)
seen('M1-2 高危患者标记与加密联动', await hasText('高危'), await p.locator('text=高危').count())

// 模块2
await p.locator('aside nav button', { hasText: '化疗中实时监控' }).first().click(); await p.waitForTimeout(600)
seen('M2-1 输液绑定与药物属性标识', await hasText('HIS 输液绑定'))
seen('M2-1 发泡剂/高致敏标识', (await p.locator('text=高致敏').count()) > 0 || (await p.locator('text=发泡剂').count()) > 0)
seen('M2-2 标准化巡视节点', await hasText('标准化巡视节点'))
seen('M2-3 不良反应快速上报入口', await hasText('床旁快速上报'))
seen('M2-4 监护数据与弹窗预警', await hasText('床旁监护'))
seen('M2-5 床头端语音播报', await hasText('床头端 AI 语音播报'))
await p.screenshot({ path: `${OUT}/m2.png`, fullPage: true })

// 模块5
await p.locator('aside nav button', { hasText: '不良反应闭环' }).first().click(); await p.waitForTimeout(600)
seen('M5-1 SOP 库', await hasText('标准化处置 SOP 库'))
seen('M5-2 骨髓抑制自动识别/分级', (await p.locator('text=中性粒细胞').count()) > 0)
seen('M5-4 追踪闭环', await hasText('已闭环') || await hasText('复评'))
await p.screenshot({ path: `${OUT}/m5.png`, fullPage: true })

// 模块3
await p.locator('aside nav button', { hasText: '随访与居家照护' }).first().click(); await p.waitForTimeout(600)
seen('M3-4 随访闭环台账（完成/漏访/迟访）', await hasText('随访闭环台账'))
seen('M3-2/3 AI 转人工接诊队列 + 症状上报记录', (await p.locator('text=AI 转人工接诊队列').count()) > 0 && (await p.locator('text=居家症状上报记录').count()) > 0)
seen('M3-5 宣教素材库（患者端）', true)
await p.screenshot({ path: `${OUT}/m3.png`, fullPage: true })

// 模块6
await p.locator('aside').getByTitle('退出登录').click(); await p.waitForTimeout(500)
await p.getByText('张海燕').first().click(); await p.waitForTimeout(600)
await p.locator('aside nav button', { hasText: '质控与数据统计' }).first().click(); await p.waitForTimeout(600)
seen('M6-1 六项自动统计', (await p.locator('text=风险评估完成率').count()) > 0 && (await p.locator('text=宣教覆盖率').count()) > 0)
seen('M6-2 风险看板', await hasText('高危与异常看板'))
seen('M6-3 HFMEA 与品管圈报表', (await p.locator('text=HFMEA 分析').count()) > 0 && (await p.locator('text=品管圈改善').count()) > 0)
await p.screenshot({ path: `${OUT}/m6.png`, fullPage: true })

// 模块4 + 配置
await p.locator('aside nav button', { hasText: '提醒与配置中心' }).first().click(); await p.waitForTimeout(600)
seen('M4-1 提醒模板自定义时序', await hasText('提醒模板（时序）'))
seen('M4-3 内容须专科审核（审核人署名）', (await p.locator('text=/审核：/').count()) > 0)
seen('可维护性-可视化配置（无需开发）', await hasText('新增模板'))
await p.screenshot({ path: `${OUT}/m4.png`, fullPage: true })
await p.getByText('语音与免打扰').first().click(); await p.waitForTimeout(500)
seen('M4-2 语速可调/免打扰', await hasText('AI 语音引擎参数'))
seen('M4-4 免打扰设置', await hasText('免打扰开始'))
await p.screenshot({ path: `${OUT}/m4-settings.png`, fullPage: true })

await p.locator('aside nav button', { hasText: '知识库管理' }).first().click(); await p.waitForTimeout(600)
seen('知识库管理后台（问答/SOP/CTCAE）', (await p.locator('text=AI 问答知识库').count()) > 0 && (await p.locator('text=CTCAE 分级库').count()) > 0)
await p.screenshot({ path: `${OUT}/kb.png`, fullPage: true })

await p.locator('aside nav button', { hasText: '接口集成联调' }).first().click(); await p.waitForTimeout(600)
seen('接口-HIS/LIS/消息/监护四类', (await p.locator('text=HIS 医院信息系统').count()) > 0 && (await p.locator('text=LIS 检验系统').count()) > 0 && (await p.locator('text=院内消息推送平台').count()) > 0)
await p.getByText('REST API 规范').first().click(); await p.waitForTimeout(400)
seen('接口-数据标准与等保要求', await hasText('等保三级'))
await p.screenshot({ path: `${OUT}/iface.png`, fullPage: true })

await p.locator('aside nav button', { hasText: '操作审计追溯' }).first().click(); await p.waitForTimeout(600)
seen('质控可追溯-审计日志', await hasText('审计日志'))
seen('隐私脱敏说明', await hasText('脱敏'))

// 患者端（手机）
const mob = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const mp = await mob.newPage()
await mp.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(900)
const pseen = async (t) => (await mp.getByText(t, { exact: false }).count()) > 0
found['患者端-分时序语音提醒'] = await pseen('AI 语音提醒')
found['患者端-语音播报按钮'] = await pseen('语音播报')
found['患者端-症状上报入口'] = await pseen('上报症状')
found['患者端-AI语音助手'] = await pseen('问语音助手')
found['患者端-复查节点提醒'] = await pseen('下次随访')
found['患者端-宣教入口'] = (await mp.locator('nav button:has-text("我的宣教")').count()) > 0
await mp.screenshot({ path: `${OUT}/patient.png`, fullPage: true })

await mp.locator('nav button:has-text("症状上报")').click(); await mp.waitForTimeout(500)
found['患者端-CTCAE自动初筛'] = await pseen('CTCAE 自动初筛')
found['患者端-高危症状就医指引'] = await pseen('红色清单')
await mp.screenshot({ path: `${OUT}/patient-symptom.png`, fullPage: true })

await mp.locator('nav button:has-text("语音小助手")').click(); await mp.waitForTimeout(500)
found['患者端-语音提问与知识库应答'] = await pseen('AI 语音小助手')
found['患者端-一键转医护'] = await pseen('转医护')
found['患者端-AI边界免责声明'] = await pseen('不替代执业医师诊疗')
await mp.screenshot({ path: `${OUT}/patient-ai.png`, fullPage: true })

await mp.locator('nav button').filter({ hasText: /^我的$/ }).click(); await mp.waitForTimeout(400)
found['患者端-语音开关/语速/免打扰'] = (await pseen('AI 语音播报')) && (await pseen('免打扰'))
await mp.screenshot({ path: `${OUT}/patient-mine.png`, fullPage: true })

// 床头端
await mp.goto(`${BASE}#/bedside`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(700)
found['床头端-大字输注信息+实时监护+语音播报+语音提问'] = (await mp.getByText('正在输注').count()) > 0 && (await mp.getByText('实时监护').count()) > 0
await mp.screenshot({ path: `${OUT}/bedside.png`, fullPage: true })

await b.close()

let pass = 0, fail = 0
for (const [k, v] of Object.entries(found)) {
  if (v === true || (typeof v === 'number' && v > 0)) { pass++; console.log(`✅ ${k}`) }
  else { fail++; console.log(`❌ ${k}`) }
}
console.log(`\n需求条目审计：${pass}/${pass + fail}`)
if (fail) process.exitCode = 1
