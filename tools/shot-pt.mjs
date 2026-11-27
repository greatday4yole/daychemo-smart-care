import { chromium } from 'playwright'
const BASE = 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000)
await p.screenshot({ path: '/tmp/pt-home.png', fullPage: true })
await p.locator('nav button:has-text("症状上报")').click(); await p.waitForTimeout(500)
await p.screenshot({ path: '/tmp/pt-symptom.png', fullPage: true })
await p.goto(`${BASE}#/bedside`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/pt-bedside.png', fullPage: true })
console.log('errors:', errs)
await b.close()
