import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700)
await p.getByText('李晓梅').first().click(); await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/t2.png' })
await b.close()
