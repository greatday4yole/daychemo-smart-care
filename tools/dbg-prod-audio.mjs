import { chromium } from 'playwright'
const BASE = 'https://greatday4yole.github.io/daychemo-smart-care/'
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
p.on('console', m => console.log('[console]', m.type(), m.text().slice(0, 200)))
await p.goto(`${BASE}#/patient`, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1200)
const info = await p.evaluate(async () => {
  const url = new URL('./audio/post-04.mp3', document.baseURI).href
  const out = { docBase: document.baseURI, url }
  try {
    const r = await fetch(url)
    out.status = r.status
    out.type = r.headers.get('content-type')
  } catch (e) { out.fetchErr = String(e) }
  const a = new Audio(url)
  out.readyState = a.readyState
  try {
    await a.play()
    out.played = true
    out.duration = a.duration
  } catch (e) { out.playErr = e.name + ': ' + e.message }
  return out
})
console.log(JSON.stringify(info, null, 2))
await b.close()
