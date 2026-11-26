// 验证：患者端点“语音播报”实际发出声音（播放进度推进），并显示播放引擎
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(900)

// 拦截 Audio 构造，记录谁被播放
await p.evaluate(() => {
  window.__played = []
  const Orig = window.Audio
  window.Audio = function (src) {
    const a = new Orig(src)
    a.addEventListener('playing', () => window.__played.push(src))
    return a
  }
})
await p.getByText('语音播报').first().click()
await p.waitForTimeout(1800)
const played = await p.evaluate(() => window.__played || [])
console.log('played audio:', played)
const hint = await p.locator('text=/播放引擎/').first().textContent().catch(() => null)
console.log('engine hint:', hint)
await p.screenshot({ path: '/tmp/daychemo-shots/22-patient-playing.png', fullPage: false })
console.log('errors:', errs)
await b.close()
