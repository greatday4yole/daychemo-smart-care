// 验证离线语音包实际可播（真实解码 + 时长）
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:4173/'
const b = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
const res = await p.evaluate(async () => {
  const files = ['pre-01', 'during-01', 'post-01', 'post-03', 'emergency', 'welcome']
  const out = []
  for (const f of files) {
    const url = `${location.origin}${location.pathname}audio/${f}.mp3`
    const r = await fetch(url)
    out.push(`fetch ${f}: ${r.status} ${r.headers.get('content-length')}B`)
    const a = new Audio(url)
    await new Promise((resolve) => {
      a.onloadedmetadata = () => { out.push(`  decode ${f}: ${a.duration.toFixed(2)}s`); resolve() }
      a.onerror = () => { out.push(`  decode ${f}: ERROR`); resolve() }
      setTimeout(resolve, 3000)
    })
  }
  return out
})
console.log(res.join('\n'))
await b.close()
