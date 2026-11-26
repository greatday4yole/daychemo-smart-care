import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const OUT = '/tmp/daychemo-shots'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600)
await p.getByText('张海燕').first().click(); await p.waitForTimeout(700)
for (const [label, file] of [['质控与数据统计','qc'],['不良反应闭环','adr'],['随访与居家照护','followup'],['工作台 / 风险看板','wb']]) {
  await p.locator('aside nav button', { hasText: label }).first().click()
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${OUT}/final-${file}.png`, fullPage: true })
}
await b.close()
