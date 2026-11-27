import { chromium } from 'playwright'
const BASE = 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900)
await p.screenshot({ path: '/tmp/new-login.png', fullPage: true })
await p.getByText('李晓梅').first().click(); await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/new-workbench.png', fullPage: true })
await b.close()
