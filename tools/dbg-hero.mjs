import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const p = await ctx.newPage()
for (const base of ['http://localhost:4173/', 'https://greatday4yole.github.io/daychemo-smart-care/']) {
  await p.goto(`${base}#/patient`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(900)
  const state = await p.evaluate(() => {
    const raw = localStorage.getItem('daychemo:state:v3')
    if (!raw) return { err: 'no state' }
    const s = JSON.parse(raw)
    const mine = s.dispatches.filter(d => d.patientId === s.activePatientId).sort((a,b)=>b.dueAt.localeCompare(a.dueAt))
    return { count: mine.length, top5: mine.slice(0,5).map(d => ({ t: d.templateId, due: d.dueAt.slice(0,16), st: d.status })) }
  })
  console.log(base, JSON.stringify(state))
}
await b.close()
