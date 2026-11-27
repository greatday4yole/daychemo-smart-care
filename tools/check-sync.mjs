// 跨标签页联动验证：护士端完成评估 → 患者端标签页应实时收到
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })

// 标签 1：护士
const nurse = await ctx.newPage()
await nurse.goto(BASE, { waitUntil: 'domcontentloaded' }); await nurse.waitForTimeout(700)
await nurse.getByText('李晓梅').first().click(); await nurse.waitForTimeout(600)

// 标签 2：患者（同浏览器独立会话）
const patient = await ctx.newPage()
await patient.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' }); await patient.waitForTimeout(800)

// 患者端上报发热 38.8℃
await patient.locator('nav button:has-text("症状上报")').click(); await patient.waitForTimeout(400)
await patient.locator('button:has-text("发热")').first().click()
await patient.locator('input[placeholder="如 37.5"]').fill('38.8')
await patient.getByRole('button', { name: /提交上报/ }).click()
await patient.waitForTimeout(600)

// 护士端应实时收到预警（无需刷新）
const alertVisible = await nurse.getByText(/周晓芸/).first().isVisible()
const bell = await nurse.locator('header button[aria-label=通知]').innerText().catch(() => '')
console.log('患者端上报完成')
console.log('护士端预警可见（周晓芸）:', alertVisible)
await nurse.locator('aside nav button', { hasText: '工作台 / 风险看板' }).first().click().catch(() => {})
await nurse.waitForTimeout(500)
const feed = await nurse.locator('text=实时预警与通知').locator('..').locator('..').innerText()
console.log('护士端通知流含高危上报:', /高危症状预警/.test(feed))
console.log('护士端通知流含上报内容:', /发热/.test(feed))
await nurse.screenshot({ path: '/tmp/sync-nurse.png', fullPage: false })
await b.close()
