import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })).newPage()
await p.goto('https://www.chhospital.com.cn/gzb/zjzh/yyjj.htm', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
await p.waitForTimeout(2500)
await p.screenshot({ path: '/tmp/ref-hospital.png' })
await p.screenshot({ path: '/tmp/ref-hospital-full.png', fullPage: true })
console.log('title:', await p.title())
await b.close()
