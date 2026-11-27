import { chromium } from 'playwright'
const BASE = 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800)
await p.getByText('张海燕').first().click(); await p.waitForTimeout(700)
for (const [label, file] of [['工作台 / 风险看板','wb'],['化疗中实时监控','monitor'],['化疗前风险评估','assess'],['随访与居家照护','followup'],['不良反应闭环','adr'],['质控与数据统计','qc'],['操作审计追溯','audit'],['提醒与配置中心','config'],['知识库管理','kb'],['接口集成联调','iface']]) {
  await p.locator('aside nav button', { hasText: label }).first().click()
  await p.waitForTimeout(600)
  await p.screenshot({ path: `/tmp/nv-${file}.png`, fullPage: true })
}
console.log('errors:', errs)
await b.close()
