import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const OUT = '/tmp/docs-shots'
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 })).newPage()
await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900)
await p.screenshot({ path: `${OUT}/screen-login.png`, fullPage: true })
await p.getByText('李晓梅').first().click(); await p.waitForTimeout(700)
const shots = [['工作台 / 风险看板','screen-workbench'],['化疗中实时监控','screen-monitor'],['化疗前风险评估','screen-assess'],['随访与居家照护','screen-followup'],['不良反应闭环','screen-adr']]
for (const [label, file] of shots) {
  await p.locator('aside nav button', { hasText: label }).first().click(); await p.waitForTimeout(600)
  await p.screenshot({ path: `${OUT}/${file}.png`, fullPage: true })
}
// 头护士视角
await p.getByRole('button', { name: '退出登录' }).first().click(); await p.waitForTimeout(600)
await p.getByText('张海燕').first().click(); await p.waitForTimeout(700)
for (const [label, file] of [['质控与数据统计','screen-qc'],['操作审计追溯','screen-audit'],['提醒与配置中心','screen-config'],['知识库管理','screen-kb'],['接口集成联调','screen-integrations']]) {
  await p.locator('aside nav button', { hasText: label }).first().click(); await p.waitForTimeout(600)
  await p.screenshot({ path: `${OUT}/${file}.png`, fullPage: true })
}
// 患者端 / 床头端
const mob = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const mp = await mob.newPage()
await mp.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(1000)
await mp.screenshot({ path: `${OUT}/screen-patient-mobile.png`, fullPage: true })
await mp.locator('nav button:has-text("语音小助手")').click(); await mp.waitForTimeout(500)
await mp.getByText('化疗后发烧了怎么办？').first().click(); await mp.waitForTimeout(700)
await mp.screenshot({ path: `${OUT}/screen-patient-ai.png`, fullPage: true })
await mp.locator('nav button:has-text("症状上报")').click(); await mp.waitForTimeout(500)
await mp.screenshot({ path: `${OUT}/screen-patient-symptom.png`, fullPage: true })
await mp.goto(`${BASE}#/bedside`, { waitUntil: 'domcontentloaded' }); await mp.waitForTimeout(800)
await mp.screenshot({ path: `${OUT}/screen-bedside.png`, fullPage: true })
await b.close()
console.log('shots done')
