// 离线语音播报包生成器（每句生成一个 MP3，供弱网/离线场景回放）
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('public/audio')
mkdirSync(outDir, { recursive: true })

const VOICE = process.env.VOICE || 'Tingting'
const RATE = process.env.SPEECH_RATE || '165'

const SCRIPTS = [
  ['pre-01', '明天是您的日间化疗日。今晚请清淡饮食，保证睡眠。明早无需空腹，请穿宽松开衫，携带病历，八点半前到达日间化疗中心。'],
  ['pre-02', '本次化疗使用高致敏药物，输注前半小时是过敏高发时段，医护会全程巡视。请勿自行调节滴速，如有瘙痒、胸闷，请立即按呼叫铃。'],
  ['during-01', '现在开始输注，请注意穿刺部位有没有疼痛、肿胀或者发红，有没有胸闷、气促、皮肤瘙痒。出现任何不舒服，请立即按床头呼叫铃，护士会在一分钟内到达。'],
  ['during-02', '输注已进行一段时间，可以适量饮水。去卫生间请按铃告知护士，并携带输液架。穿刺这一侧的手臂，请避免提重物。'],
  ['post-01', '您已完成今日化疗，回家后请好好休息。今晚可能出现乏力、恶心，属于常见反应。请少量多次饮水，每天一千五到两千毫升，清淡饮食。今晚和明晨各测一次体温。'],
  ['post-02', '现在进入骨髓抑制低谷期，一般在化疗后五到七天。请务必戴口罩、勤洗手、吃熟食，每天测量体温。出现发热、咽痛、口腔溃疡或者牙龈出血，请立即上报或者就医。'],
  ['post-03', '出现以下情况请立即就医：体温超过三十八度三，或者发热伴随寒战；牙龈出血不止、鼻出血超过十分钟、黑便或者血尿；胸闷、气促、喉头发紧；头晕眼花、面色苍白、意识模糊。'],
  ['post-04', '今天是化疗后第七天，请完成血常规复查，并把结果上传到系统。医护会为您判读中性粒细胞和血小板的数值。如果出现发热，请先联系医护，再前往医院。'],
  ['post-05', '化疗后两周，多数患者血象开始回升。请复查血常规，并完成随访问卷，告诉我们您的饮食、睡眠和体力恢复情况。'],
  ['welcome', '您好，我是您的日间化疗语音助手。请按时测量体温，如有发热、胸闷、牙龈出血，请立即联系医护。您也可以点击话筒直接向我提问。'],
  ['emergency', '您上报的症状需要立即处理。请立即联系您的责任护士，或者拨打日间化疗中心电话，情况紧急请拨打一百二十或者前往急诊。我已同时通知医护。'],
]

const made = []
const skipped = []
for (const [name, text] of SCRIPTS) {
  const aiff = `/tmp/daychemo-${name}.aiff`
  const mp3 = path.join(outDir, `${name}.mp3`)
  if (existsSync(mp3) && process.env.FORCE !== '1') { skipped.push(name); continue }
  execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', aiff, text])
  execFileSync('ffmpeg', ['-y', '-i', aiff, '-codec:a', 'libmp3lame', '-qscale:a', '5', '-ar', '22050', '-ac', '1', mp3], { stdio: 'ignore' })
  made.push(name)
}

writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      voice: VOICE,
      rate: Number(RATE),
      generatedAt: new Date().toISOString(),
      note: '离线语音包：由 macOS say + ffmpeg 预生成，供弱网/离线场景（床头端、断网居家）回放。',
      clips: SCRIPTS.map(([name, text]) => ({ file: `${name}.mp3`, text })),
    },
    null,
    2,
  ),
)
console.log(`生成 ${made.length} 个音频，跳过 ${skipped.length} 个已存在文件`)
