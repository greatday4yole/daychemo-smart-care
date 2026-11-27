import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
const p = await ctx.newPage()
await p.goto('http://localhost:4173/#/patient', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500)
await p.screenshot({ path: '/tmp/pt-viewport.png' })
// 滚到底检查内容不被遮挡
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(600)
await p.screenshot({ path: '/tmp/pt-bottom.png' })
await b.close()
