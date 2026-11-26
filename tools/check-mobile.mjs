import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-CN' })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1000)
await p.screenshot({ path: '/tmp/daychemo-shots/19-patient-mobile.png', fullPage: true })
console.log('patient home title:', await p.locator('header p').first().textContent())
// 症状上报
await p.locator('nav button:has-text("症状上报")').click()
await p.waitForTimeout(500)
await p.screenshot({ path: '/tmp/daychemo-shots/20-mobile-symptom.png', fullPage: true })
// AI
await p.locator('nav button:has-text("语音小助手")').click()
await p.waitForTimeout(500)
await p.getByText('化疗后发烧了怎么办？').first().click()
await p.waitForTimeout(700)
await p.screenshot({ path: '/tmp/daychemo-shots/21-mobile-ai.png', fullPage: true })
console.log('errors:', errs)
await b.close()
