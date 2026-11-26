import type { AssessmentItem, RiskLevel } from '../types'

// 标准化日间化疗风险评估表单（12 项 4 维度，参考 HFMEA 风险条目与 ASCO/NCCN 骨髓抑制风险因素）
export const RISK_GROUPS = ['过敏与既往反应', '骨髓抑制风险', '基础疾病与器官功能', '血管条件与治疗相关', '营养与支持系统'] as const

export const RISK_ITEMS: AssessmentItem[] = [
  { id: 'r01', group: '过敏与既往反应', label: '药物过敏史（含碘造影剂、抗生素、化疗药）', hint: '任一药物过敏史即计入', weight: 6, ctcaeref: 'allergy' },
  { id: 'r02', group: '过敏与既往反应', label: '既往化疗输注中出现过敏/输液反应', hint: '皮疹、胸闷、喉头发紧、血压下降等', weight: 10, ctcaeref: 'allergy' },
  { id: 'r03', group: '过敏与既往反应', label: '本次方案含高致敏药物（紫杉类/铂类/利妥昔单抗/门冬酰胺酶）', hint: '系统按医嘱药物属性自动勾选', weight: 8, ctcaeref: 'allergy' },
  { id: 'r04', group: '骨髓抑制风险', label: '既往化疗后出现 3～4 级骨髓抑制', hint: 'ANC<1.0 或 PLT<50 或需 G-CSF 治疗', weight: 10, ctcaeref: 'anc' },
  { id: 'r05', group: '骨髓抑制风险', label: '本次方案为高骨髓抑制风险方案', hint: '如 TC、TAC、ICE、大剂量 MTX 等', weight: 6, ctcaeref: 'anc' },
  { id: 'r06', group: '骨髓抑制风险', label: '拟行第 2 周期及以上化疗，或近期放疗/多线治疗', hint: '累积骨髓毒性风险增加', weight: 4, ctcaeref: 'anc' },
  { id: 'r07', group: '基础疾病与器官功能', label: '年龄 ≥ 70 岁或 ECOG 评分 ≥ 2', hint: '老年与体能状态差者风险升高', weight: 6 },
  { id: 'r08', group: '基础疾病与器官功能', label: '合并糖尿病、慢性肾病、肝功能异常或心血管疾病', hint: '影响药物代谢与耐受', weight: 5 },
  { id: 'r09', group: '基础疾病与器官功能', label: '近 3 个月内有发热/感染史或活动性感染灶', hint: '含口腔溃疡、皮肤破损、留置导管感染', weight: 5 },
  { id: 'r10', group: '血管条件与治疗相关', label: '外周血管条件差（细、硬、多次穿刺）或中心静脉导管（PICC/PORT）', hint: '外渗与静脉炎高风险', weight: 6, ctcaeref: 'extrav' },
  { id: 'r11', group: '血管条件与治疗相关', label: '本次方案含发泡剂/刺激性药物（蒽环类、长春碱类、奥沙利铂等）', hint: '系统按医嘱药物属性自动勾选', weight: 8, ctcaeref: 'extrav' },
  { id: 'r12', group: '营养与支持系统', label: '营养风险筛查 NRS-2002 ≥ 3 分，或近 1 个月体重下降 >5%', hint: '需营养支持与随访加强', weight: 5, ctcaeref: 'fatigue' },
  { id: 'r13', group: '营养与支持系统', label: '独居、照护者缺失或依从性差（无法按时复查）', hint: '居家风险高，需加密随访', weight: 6 },
  { id: 'r14', group: '营养与支持系统', label: '既往出现消化道反应 ≥2 级（恶心呕吐/腹泻）', hint: '本次需预防性止吐方案', weight: 4, ctcaeref: 'nausea' },
]

export interface RiskRule {
  min: number
  max: number
  level: RiskLevel
  label: string
  actions: string[]
}

// 分值→等级联动规则（0-100 归一化分值）
export const RISK_RULES: RiskRule[] = [
  { min: 0, max: 29, level: 'low', label: '低危', actions: ['常规宣教推送', '化疗后第 7 天血常规复查', '常规随访 1 次'] },
  { min: 30, max: 59, level: 'mid', label: '中危', actions: ['加密宣教推送（每日）', '化疗后第 4、7、14 天血常规复查', '居家症状每日上报', '48 小时电话随访'] },
  { min: 60, max: 100, level: 'high', label: '高危', actions: ['红色标记 + 高危看板置顶', '化疗中每 30 分钟巡视打卡', '化疗后第 3、5、7、10、14 天复查', '居家症状每日上报 + 语音提醒优先', '24 小时医护随访、必要时预防性 G-CSF'] },
]

export const scoreToLevel = (rawScore: number, totalWeight: number): { score: number; level: RiskLevel } => {
  const score = Math.round((rawScore / totalWeight) * 100)
  const rule = RISK_RULES.find((r) => score >= r.min && score <= r.max) ?? RISK_RULES[0]
  return { score, level: rule.level }
}

export const LEVEL_TEXT: Record<RiskLevel, string> = { low: '低危', mid: '中危', high: '高危' }
export const LEVEL_COLOR: Record<RiskLevel, string> = { low: 'emerald', mid: 'amber', high: 'rose' }
