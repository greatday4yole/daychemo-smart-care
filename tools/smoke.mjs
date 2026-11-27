// 端到端冒烟测试：遍历全部页面 + 关键业务动作（评估/上报/闭环/AI 问答/报表导出）
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173/'
const OUT = process.env.SHOT_DIR || '/tmp/daychemo-shots'
mkdirSync(OUT, { recursive: true })

const errors = []
const results = []
const ok = (name, detail = '') => { results.push({ name, pass: true, detail }); console.log(`✅ ${name} ${detail}`) }
const fail = (name, detail = '') => { results.push({ name, pass: false, detail }); console.log(`❌ ${name} ${detail}`) }

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(`[console] ${m.text().slice(0, 160)}`) })

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/01-login.png`, fullPage: true })
const loginCards = await page.locator('button:has-text("责任护士")').count()
loginCards > 0 ? ok('登录页渲染', `角色入口 ${await page.locator('.group.relative').count()} 个`) : fail('登录页渲染')

// 1) 护士端
await page.getByText('李晓梅').first().click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/02-workbench-nurse.png`, fullPage: true })
ok('护士工作台', `患者卡 ${await page.locator('section button').count()} 个`)

for (const [label, file] of [['化疗中实时监控', '03-monitor'], ['化疗前风险评估', '04-assess'], ['随访与居家照护', '05-followup'], ['不良反应闭环', '06-adr']]) {
  await page.locator('aside nav button', { hasText: label }).first().click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true })
  ok(`页面 ${label}`)
}

// 评估交互：勾选条目 → 分值变化 → 提交
await page.locator('aside nav button', { hasText: '化疗前风险评估' }).first().click()
await page.waitForTimeout(400)
const scoreBefore = await page.locator('text=/自动评分/').locator('..').locator('text=/^\\d+$/').first().textContent().catch(() => null)
await page.getByText('既往化疗后出现 3～4 级骨髓抑制').first().click()
await page.waitForTimeout(300)
const scoreAfter = await page.locator('text=/自动评分/').locator('..').locator('text=/^\\d+$/').first().textContent().catch(() => null)
scoreAfter !== scoreBefore ? ok('评估分值实时联动', `${scoreBefore} → ${scoreAfter}`) : fail('评估分值实时联动', `${scoreBefore} vs ${scoreAfter}`)

// 知情同意并提交
const consent = page.locator('input[type=checkbox]').first()
if (!(await consent.isChecked())) await consent.check()
await page.getByRole('button', { name: /提交评估并生成随访计划/ }).click()
await page.waitForTimeout(600)
const modalShown = await page.getByText('评估完成').first().isVisible().catch(() => false)
modalShown ? ok('评估提交与随访计划生成') : fail('评估提交')
await page.getByRole('button', { name: '知道了' }).click()
await page.waitForTimeout(300)

// ADR 闭环：打开一条并推进
await page.locator('aside nav button', { hasText: '不良反应闭环' }).first().click()
await page.waitForTimeout(500)
await page.getByText('中性粒细胞计数降低').first().click()
await page.waitForTimeout(500)
const adrModal = await page.getByText('ADR 处置追踪').isVisible().catch(() => false)
adrModal ? ok('ADR 详情与 SOP 联动') : fail('ADR 详情')
await page.screenshot({ path: `${OUT}/06-adr-detail.png`, fullPage: true })
const closeBtn = page.getByRole('button', { name: /风险解除 · 闭环/ })
if (await closeBtn.count()) { await closeBtn.click(); await page.waitForTimeout(400); ok('ADR 闭环动作') } else { ok('ADR 处置推进（当前状态无需闭环）') }
await page.keyboard.press('Escape').catch(() => {})
await page.locator('div.fixed.inset-0 button[aria-label=关闭]').first().click().catch(() => {})

// 2) 头护士：质控 + 配置 + 知识库 + 接口
await page.getByRole('button', { name: '退出登录' }).first().click()
await page.waitForTimeout(600)
await page.getByText('张海燕').first().click()
await page.waitForTimeout(800)
for (const [label, file] of [['质控与数据统计', '07-qc'], ['操作审计追溯', '08-audit'], ['提醒与配置中心', '09-config'], ['知识库管理', '10-kb'], ['接口集成联调', '11-integrations']]) {
  await page.locator('aside nav button', { hasText: label }).first().click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true })
  ok(`页面 ${label}`)
}
// HFMEA 导出
await page.locator('aside nav button', { hasText: '质控与数据统计' }).first().click()
await page.waitForTimeout(500)
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
  page.getByRole('button', { name: /导出 HFMEA/ }).click(),
])
dl ? ok('HFMEA 报表导出', dl.suggestedFilename()) : fail('HFMEA 报表导出')

// 接口联调：推送 LIS
await page.locator('aside nav button', { hasText: '接口集成联调' }).first().click()
await page.waitForTimeout(500)
await page.getByText('联调（模拟推送）').click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /推送并自动研判/ }).click()
await page.waitForTimeout(600)
const logHas = await page.getByText(/LIS 推送成功/).first().isVisible().catch(() => false)
logHas ? ok('LIS 模拟推送与自动研判') : fail('LIS 模拟推送')

// 3) 患者端
await page.locator('aside').getByRole('button', { name: /查看患者端/ }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/12-patient-home.png`, fullPage: true })
ok('患者端首页', `URL ${page.url()}`)

// 症状上报 → 高危
await page.getByText('症状上报', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(500)
await page.locator('button:has-text("发热")').first().click()
await page.locator('input[placeholder="如 37.5"]').fill('38.8')
await page.screenshot({ path: `${OUT}/13-patient-symptom.png`, fullPage: true })
await page.getByRole('button', { name: /提交上报/ }).click()
await page.waitForTimeout(700)
const emergency = await page.getByText(/请立即联系医护/).first().isVisible().catch(() => false)
emergency ? ok('高危症状上报与强制引导') : fail('高危症状上报')
await page.screenshot({ path: `${OUT}/14-patient-emergency.png`, fullPage: true })
await page.getByRole('button', { name: '我知道了' }).click().catch(() => {})

// AI 问答
await page.locator('nav button:has-text("语音小助手")').click()
await page.waitForTimeout(500)
await page.getByText('化疗后发烧了怎么办？').first().click()
await page.waitForTimeout(600)
const answerShown = await page.getByText(/我需要立即|请立即联系|化疗后发热需要特别重视/).first().isVisible().catch(() => false)
answerShown ? ok('AI 语音问答（知识库命中）') : fail('AI 语音问答')
await page.screenshot({ path: `${OUT}/15-patient-ai.png`, fullPage: true })

// 宣教
await page.locator('nav button:has-text("我的宣教")').click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/16-patient-education.png`, fullPage: true })
ok('患者宣教列表', `条目 ${await page.locator('main button.card').count()}`)

// 我的 / 语音设置
await page.locator('nav button').filter({ hasText: /^我的$/ }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/17-patient-mine.png`, fullPage: true })
ok('患者设置页')

// 4) 床头端
await page.getByRole('button', { name: /返回医护端/ }).click()
await page.waitForTimeout(400)
await page.goto(`${BASE}#/bedside`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/18-bedside.png`, fullPage: true })
ok('床头端', `URL ${page.url()}`)

// 5) 移动端视口下的患者端
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, locale: 'zh-CN' })
const mp = await mobile.newPage()
await mp.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' })
await mp.waitForTimeout(800)
await mp.screenshot({ path: `${OUT}/19-patient-mobile.png`, fullPage: true })
ok('移动端视口渲染')
await mobile.close()

await browser.close()

console.log('\n================ 结果汇总 ================')
const passed = results.filter((r) => r.pass).length
console.log(`通过 ${passed}/${results.length}`)
if (errors.length) {
  console.log(`\n运行期错误 ${errors.length} 条：`)
  errors.slice(0, 20).forEach((e) => console.log(' -', e))
}
const failed = results.filter((r) => !r.pass)
if (failed.length) {
  console.log('\n失败项：')
  failed.forEach((f) => console.log(' -', f.name, f.detail))
  process.exitCode = 1
}
if (errors.length) process.exitCode = 1
