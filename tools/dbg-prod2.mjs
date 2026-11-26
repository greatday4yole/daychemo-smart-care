import { chromium } from 'playwright'
const BASE = 'https://greatday4yole.github.io/daychemo-smart-care/'
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const p = await ctx.newPage()
p.on('console', m => console.log('[c]', m.text().slice(0, 150)))
await p.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1000)
const info = await p.evaluate(() => {
  const raw = localStorage.getItem('daychemo:state:v3')
  const s = raw ? JSON.parse(raw) : null
  return { has: !!s, offlinePack: s?.settings?.offlinePack, voice: s?.settings?.voiceEnabled, pid: s?.activePatientId }
})
console.log('state:', JSON.stringify(info))
const heroTitle = await p.locator('section').first().innerText()
console.log('hero:', heroTitle.split('\n').slice(0,4).join(' | '))
// 检查 BASE_URL 与音频路径
const env = await p.evaluate(() => {
  const el = document.querySelector('script[type=module]')
  return { src: el?.getAttribute('src'), baseURI: document.baseURI }
})
console.log('env:', JSON.stringify(env))
await b.close()
