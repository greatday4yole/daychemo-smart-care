import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const cases = [
  { name: 'tablet-1024', w: 1024, h: 768 },
  { name: 'mobile-web-390', w: 390, h: 844 },
]
for (const c of cases) {
  const p = await (await b.newContext({ viewport: { width: c.w, height: c.h }, isMobile: c.w < 600, hasTouch: c.w < 600 })).newPage()
  await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700)
  await p.screenshot({ path: `/tmp/resp-login-${c.name}.png` })
  await p.getByText('李晓梅').first().click(); await p.waitForTimeout(700)
  await p.screenshot({ path: `/tmp/resp-wb-${c.name}.png` })
}
await b.close()
