import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
await p.goto('https://greatday4yole.github.io/daychemo-smart-care/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200)
await p.screenshot({ path: '/tmp/prod-login.png', fullPage: true })
await b.close()
