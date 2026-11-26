# -*- coding: utf-8 -*-
"""生成培训 PPT（16:9，青绿主题，纯形状排版，无外部图片依赖）"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

W, H = Inches(13.333), Inches(7.5)
BRAND = RGBColor(0x0E, 0x8F, 0x92)
BRAND_D = RGBColor(0x10, 0x4A, 0x4E)
BRAND_L = RGBColor(0xE6, 0xF6, 0xF5)
INK = RGBColor(0x1E, 0x29, 0x3B)
INK2 = RGBColor(0x47, 0x55, 0x69)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG = RGBColor(0xF8, 0xFA, 0xFC)
AMBER = RGBColor(0xD9, 0x77, 0x06)
ROSE = RGBColor(0xBE, 0x12, 0x3C)
EMER = RGBColor(0x05, 0x96, 0x69)
FONT = "Microsoft YaHei"

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


def bg(slide, color=BG):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    s.fill.solid(); s.fill.fore_color.rgb = color
    s.line.fill.background(); s.shadow.inherit = False
    return s


def rect(slide, x, y, w, h, fill=None, line=None, radius=None, transparency=0):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shape_type, x, y, w, h)
    if radius:
        try:
            s.adjustments[0] = radius
        except Exception:
            pass
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid(); s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line; s.line.width = Pt(0.75)
    s.shadow.inherit = False
    return s


def text(slide, x, y, w, h, s, size=14, color=INK, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, line_spacing=1.25, font=FONT, space_after=4):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0; tf.margin_right = 0; tf.margin_top = 0; tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    lines = s.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        r = p.add_run(); r.text = ln
        r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color; r.font.name = font
    return tb


def header(slide, kicker, title, sub=None):
    rect(slide, 0, 0, W, Inches(0.09), BRAND)
    text(slide, Inches(0.75), Inches(0.55), Inches(11.8), Inches(0.3), kicker, 11, BRAND, True)
    text(slide, Inches(0.75), Inches(0.85), Inches(11.8), Inches(0.55), title, 27, INK, True)
    if sub:
        text(slide, Inches(0.75), Inches(1.42), Inches(11.6), Inches(0.4), sub, 12.5, INK2)
    rect(slide, Inches(0.75), Inches(1.78), Inches(0.62), Inches(0.055), BRAND)


def footer(slide, n, label="日间化疗患者智慧照护系统 · 培训"):
    text(slide, Inches(0.75), H - Inches(0.52), Inches(8), Inches(0.28), label, 9, MUTED)
    text(slide, W - Inches(1.3), H - Inches(0.52), Inches(0.6), Inches(0.28), str(n), 9, MUTED, align=PP_ALIGN.RIGHT)


def card(slide, x, y, w, h, num, title, body, accent=BRAND, num_bg=None):
    rect(slide, x, y, w, h, WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.08)
    badge = rect(slide, x + Inches(0.3), y + Inches(0.28), Inches(0.42), Inches(0.42), num_bg or accent, None, 0.5)
    tf = badge.text_frame; tf.word_wrap = False
    tf.margin_left = 0; tf.margin_right = 0; tf.margin_top = 0; tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = str(num); r.font.size = Pt(15); r.font.bold = True; r.font.color.rgb = WHITE; r.font.name = FONT
    text(slide, x + Inches(0.86), y + Inches(0.3), w - Inches(1.1), Inches(0.34), title, 15, INK, True)
    text(slide, x + Inches(0.3), y + Inches(0.86), w - Inches(0.6), h - Inches(1.05), body, 11.5, INK2, line_spacing=1.35)


def bullets(slide, x, y, w, items, size=12, gap=Inches(0.42), color=INK2, bullet_color=BRAND):
    for i, it in enumerate(items):
        rect(slide, x, y + gap * i + Inches(0.07), Inches(0.11), Inches(0.11), bullet_color, None, 0.5)
        text(slide, x + Inches(0.28), y + gap * i, w, gap, it, size, color, line_spacing=1.2)


def pill(slide, x, y, w, h, label, fill=BRAND_L, color=BRAND_D, size=10.5):
    rect(slide, x, y, w, h, fill, None, 0.5)
    text(slide, x, y + Inches(0.04), w, h, label, size, color, True, align=PP_ALIGN.CENTER)


def table(slide, x, y, w, rows, col_w, header_row=True, size=10.5, row_h=Inches(0.38)):
    for ri, row in enumerate(rows):
        cy = y + row_h * ri
        cx = x
        for ci, cell in enumerate(row):
            cw = col_w[ci]
            fill = BRAND if (ri == 0 and header_row) else (WHITE if ri % 2 else RGBColor(0xF1, 0xF5, 0xF9))
            rect(slide, cx, cy, cw, row_h, fill, RGBColor(0xE2, 0xE8, 0xF0))
            text(slide, cx + Inches(0.1), cy + Inches(0.07), cw - Inches(0.16), row_h,
                 str(cell), size, WHITE if (ri == 0 and header_row) else INK,
                 ri == 0 and header_row, line_spacing=1.0)
            cx += cw


# ============ 1 封面 ============
s = prs.slides.add_slide(BLANK)
bg(s, BRAND_D)
rect(s, 0, 0, Inches(13.333), Inches(0.12), BRAND)
blob = rect(s, Inches(9.1), Inches(-1.3), Inches(6.2), Inches(6.2), RGBColor(0x0B, 0x3A, 0x3D), None, 0.5)
blob2 = rect(s, Inches(10.4), Inches(3.2), Inches(4.2), Inches(4.2), RGBColor(0x12, 0x5B, 0x5F), None, 0.5)
text(s, Inches(0.95), Inches(1.35), Inches(7.5), Inches(0.3), "DAY-CHEMO SMART CARE PLATFORM", 11.5, RGBColor(0x7B, 0xE2, 0xE0), True)
text(s, Inches(0.9), Inches(1.78), Inches(8.2), Inches(1.5), "日间化疗患者\n智慧照护系统", 40, WHITE, True, line_spacing=1.1)
rect(s, Inches(0.95), Inches(3.55), Inches(708000), Inches(0.06), BRAND)
text(s, Inches(0.95), Inches(3.82), Inches(7.6), Inches(0.9),
     "化疗前风险评估 · 化疗中实时监控 · 化疗后居家随访\nAI 语音提醒 ｜ CTCAE 自动分级 ｜ ADR 闭环处置 ｜ 质控可追溯", 13, RGBColor(0xD6, 0xF7, 0xF5), line_spacing=1.5)
for i, t in enumerate(["流程闭环", "AI 语音交互", "风险前置管控", "HFMEA 落地"]):
    pill(s, Inches(0.95) + Inches(1.42) * i, Inches(5.02), Inches(1.32), Inches(0.4), t, RGBColor(0x12, 0x5B, 0x5F), RGBColor(0x7B, 0xE2, 0xE0))
text(s, Inches(0.95), Inches(6.28), Inches(8), Inches(0.3), "系统操作与临床应用培训 ｜ 护理团队 + 质控团队 ｜ 2 学时", 11, RGBColor(0x9E, 0xD8, 0xD7))
text(s, Inches(0.95), Inches(6.62), Inches(8), Inches(0.3), "演示环境：greatday4yole.github.io/daychemo-smart-care  ·  数据为虚构演示数据", 9.5, RGBColor(0x6E, 0xB8, 0xB7))

# ============ 2 目录 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "CONTENTS", "培训内容", "6 个模块 · 3 条演示路径 · 2 小时实操")
items = [
    ("01", "项目背景与建设目标", "痛点 → 目标 → 全流程闭环"),
    ("02", "角色权限与系统架构", "五类角色 · 三端 · 数据链路"),
    ("03", "模块 1–2：评估与监控", "14 项评估表单 · 巡视打卡 · 监护预警"),
    ("04", "模块 3–4：随访与 AI 语音", "13 条提醒模板 · 症状上报 · 语音问答"),
    ("05", "模块 5–6：闭环与质控", "SOP 库 · CTCAE 分级 · HFMEA 报表"),
    ("06", "实操与考核", "三条演示路径 · 分组练习 · 上线计划"),
]
for i, (n, t, d) in enumerate(items):
    col, row = i % 2, i // 2
    x = Inches(0.78) + Inches(6.1) * col
    y = Inches(2.25) + Inches(1.28) * row
    rect(s, x, y, Inches(5.72), Inches(1.02), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.08)
    text(s, x + Inches(0.28), y + Inches(0.24), Inches(0.7), Inches(0.5), n, 20, BRAND, True)
    text(s, x + Inches(1.02), y + Inches(0.2), Inches(4.5), Inches(0.32), t, 14, INK, True)
    text(s, x + Inches(1.02), y + Inches(0.58), Inches(4.5), Inches(0.3), d, 10.5, MUTED)
footer(s, 2)

# ============ 3 背景痛点 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "01 / 背景", "为什么需要这套系统", "日间化疗“当天输注、当天回家”模式带来的五个管理难点")
pain = [
    ("住院时间短", "当日输注即离院，护士可观察窗口仅 2–6 小时，过敏反应高发期恰在输注前 30 分钟"),
    ("居家风险高", "化疗后 7–14 天为骨髓抑制低谷期，患者独自在家，发热/出血识别滞后"),
    ("随访分散", "靠纸质记录与电话，迟访漏访无法量化，复查依从性无抓手"),
    ("宣教不到位", "口头宣教易遗漏、不可追溯，老年患者记不住、不敢问"),
    ("识别滞后", "骨髓抑制与过敏反应常因患者延迟上报而错过干预窗口"),
]
for i, (t, d) in enumerate(pain):
    y = Inches(2.2) + Inches(0.94) * i
    rect(s, Inches(0.78), y, Inches(0.075), Inches(0.74), ROSE if i in (1, 4) else AMBER)
    text(s, Inches(1.02), y + Inches(0.04), Inches(1.9), Inches(0.3), t, 12.5, INK, True)
    text(s, Inches(2.95), y + Inches(0.04), Inches(9.4), Inches(0.62), d, 11.5, INK2, line_spacing=1.3)
# 右侧对策卡
rect(s, Inches(0.78), Inches(6.35), Inches(11.8), Inches(0.012 + Inches(0.0)), RGBColor(0xE2, 0xE8, 0xF0))
text(s, Inches(0.78), Inches(6.5), Inches(11.8), Inches(0.4),
     "对策主线：把“患者回家后的未知”变成“系统可感知、可提醒、可预警、可追溯”", 12, BRAND, True)
footer(s, 3)

# ============ 4 建设目标 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "01 / 目标", "五项建设目标与度量指标", "每项目标都对应可量化指标，验收时可核")
cards = [
    ("流程闭环", "前中后全周期贯通\n医护 / 患者 / 质控三端数据链路", "三端覆盖率 100%"),
    ("智能宣教提醒", "分阶段宣教 + 复查节点 + 预警提醒\nAI 语音播报、语速可调、可离线", "宣教覆盖 ≥90%\n提醒已读 ≥80%"),
    ("风险智能预警", "对接检验与医嘱\n自动识别骨髓抑制 / 过敏高危", "高危 30 分钟内可见 100%"),
    ("不良反应闭环", "上报 → 分级 → 处置 → 复评 → 闭环\n全过程留痕可导出", "闭环率 ≥95%\n闭环时长 ≤24h"),
    ("质控可追溯", "自动统计六项质控指标\n支撑 HFMEA / 品管圈分析", "报表导出 100%"),
]
for i, (t, d, kpi) in enumerate(cards):
    x = Inches(0.78) + Inches(2.42) * i
    rect(s, x, Inches(2.25), Inches(2.24), Inches(3.85), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.07)
    rect(s, x, Inches(2.25), Inches(2.24), Inches(0.07), BRAND)
    text(s, x + Inches(0.2), Inches(2.52), Inches(1.9), Inches(0.6), t, 13, INK, True, line_spacing=1.2)
    text(s, x + Inches(0.2), Inches(3.22), Inches(1.9), Inches(1.3), d, 10.5, INK2, line_spacing=1.4)
    pill(s, x + Inches(0.2), Inches(5.15), Inches(1.84), Inches(0.38), "", RGBColor(0xF1, 0xF5, 0xF9))
    text(s, x + Inches(0.2), Inches(5.2), Inches(1.84), Inches(0.62), kpi, 9.5, BRAND, True, align=PP_ALIGN.CENTER, line_spacing=1.25)
text(s, Inches(0.78), Inches(6.35), Inches(11.8), Inches(0.5),
     "补充：原需求未定义“评分算法”与“延迟发现口径”，本项目已补全并在 PRD 第 3、6 章列明（见第 6 页）", 10.5, MUTED)
footer(s, 4)

# ============ 5 全流程闭环 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "02 / 全景", "全流程闭环与三端协同")
phases = [
    ("化疗前", "风险评估", ["标准化 14 项表单", "自动分级（低/中/高）", "CTCAE 对照查阅", "生成个体化宣教清单"], BRAND),
    ("化疗中", "实时监控", ["HIS 输液绑定与药物属性", "标准化巡视打卡", "床旁一键上报 + SOP", "监护异常弹窗预警"], RGBColor(0xB4, 0x53, 0x09)),
    ("化疗后", "居家随访", ["13 条分时序语音提醒", "症状上报 CTCAE 初判", "AI 语音问答 + 转人工", "随访台账与二次提醒"], EMER),
]
for i, (p1, p2, its, col) in enumerate(phases):
    x = Inches(0.78) + Inches(4.02) * i
    rect(s, x, Inches(2.15), Inches(3.72), Inches(3.35), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.07)
    rect(s, x, Inches(2.15), Inches(3.72), Inches(0.62), col)
    text(s, x + Inches(0.22), Inches(2.28), Inches(3.3), Inches(0.36), f"{p1} · {p2}", 13, WHITE, True)
    for j, it in enumerate(its):
        text(s, x + Inches(0.24), Inches(2.94) + Inches(0.42) * j, Inches(3.3), Inches(0.38), "· " + it, 10.5, INK2)
    if i < 2:
        text(s, x + Inches(3.74), Inches(3.55), Inches(0.3), Inches(0.4), "→", 18, MUTED, True)
rect(s, Inches(0.78), Inches(5.72), Inches(11.8), Inches(0.72), BRAND_L, None, 0.06)
text(s, Inches(1.0), Inches(5.86), Inches(11.4), Inches(0.5),
     "贯穿主线：不良反应闭环处置（上报 → 分级 → SOP → 复评 → 闭环） ＋ 质控可追溯（全量留痕 · HFMEA / 品管圈导出）", 11.5, BRAND_D, True)
footer(s, 5)

# ============ 6 评分规则（补充口径） ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "02 / 规则", "风险评分算法与关键口径", "原需求仅要求“自动分级”，本方案补全可执行算法")
# 左：算法
rect(s, Inches(0.78), Inches(2.12), Inches(5.9), Inches(4.3), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.05)
text(s, Inches(1.02), Inches(2.3), Inches(5.4), Inches(0.3), "风险评分（14 项 · 5 维度 · 加权百分制）", 12.5, INK, True)
steps = [
    "① 勾选条目 → 累加权重（总权重 89）",
    "② 归一化分值 = ⌈(权重和 / 89) × 100⌉，取值 0–100",
    "③ 阈值：0–29 低危 ｜ 30–59 中危 ｜ ≥60 高危",
    "④ 依据：HFMEA 严重度 + ASCO/NCCN 骨髓抑制风险因素",
    "⑤ 权重与阈值集中在 riskForm.ts，院内可校准",
]
bullets(s, Inches(1.02), Inches(2.72), Inches(5.5), steps, 10.5, Inches(0.52))
text(s, Inches(1.02), Inches(5.35), Inches(5.4), Inches(0.9),
     "示例：勾选“既往 3–4 级骨髓抑制(10) + 高致敏方案(8) + 高龄(6）”\n→ 24/89 → 27 分 → 低危（缓存）", 9.5, MUTED, line_spacing=1.35)
# 右：分级联动
rows = [["等级", "分值", "自动联动动作"],
        ["低危", "0–29", "常规宣教 · 第 7 天复查 1 次"],
        ["中危", "30–59", "每日宣教 · 第 4/7/14 天复查 3 次 · 每日上报"],
        ["高危", "≥60", "红色置顶 · 每 30 分钟巡视 · 第 3/5/7/10/14 天复查 5 次"]]
table(s, Inches(6.92), Inches(2.12), Inches(5.65), rows, [Inches(0.85), Inches(0.95), Inches(3.85)], size=9.5, row_h=Inches(0.52))
rect(s, Inches(6.92), Inches(4.32), Inches(5.65), Inches(2.1), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.05)
text(s, Inches(7.12), Inches(4.46), Inches(5.2), Inches(0.28), "另两项补充口径", 11, INK, True)
bullets(s, Inches(7.12), Inches(4.78), Inches(5.2), [
    "骨髓抑制延迟发现 = ANC/PLT ≥3 级事件首次医护动作 >24h 或缺失",
    "高危症状阈值：体温 ≥38.3℃ / 出血不止 / 胸闷气促 / 意识改变 / 外渗",
    "提醒免打扰默认 22:00–07:00（支持跨零点，语音静默但文字照常）",
], 9.5, Inches(0.46))
footer(s, 6)

# ============ 7 角色权限 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "02 / 角色", "五类角色与权限边界", "按最小必要原则；患者仅可见本人数据")
roles = [
    ("医生", "ADR 处置与复评、医嘱参考、质控查看", BRAND),
    ("护士", "风险评估、巡视打卡、床旁上报、随访干预", RGBColor(0x0F, 0x76, 0x6E)),
    ("护士长", "模板/宣教配置、看板、报表导出、审计", RGBColor(0x6D, 0x28, 0xD9)),
    ("质控员", "HFMEA / 品管圈导出、追溯核查（只读）", EMER),
    ("患者", "语音提醒、症状上报、AI 问答、宣教、随访打卡", ROSE),
]
for i, (t, d, c) in enumerate(roles):
    x = Inches(0.78) + Inches(1.55) * i
    rect(s, x, Inches(2.15), Inches(1.44), Inches(1.5), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.09)
    rect(s, x, Inches(2.15), Inches(1.44), Inches(0.07), c)
    text(s, x + Inches(0.1), Inches(2.36), Inches(1.24), Inches(0.3), t, 12.5, INK, True, align=PP_ALIGN.CENTER)
    text(s, x + Inches(0.14), Inches(2.76), Inches(1.18), Inches(0.8), d, 9, INK2, align=PP_ALIGN.CENTER, line_spacing=1.3)
x0 = Inches(0.78)
rows = [["功能", "医生", "护士", "护士长", "质控员", "患者"],
        ["风险评估填写", "阅读", "填写", "填写", "阅读", "—"],
        ["巡视打卡 / 监护", "阅读处置", "打卡上报", "打卡上报", "阅读", "床头端播报"],
        ["ADR 处置", "处置闭环", "上报处置", "上报闭环", "阅读", "上报症状"],
        ["随访台账", "填写", "填写", "填写", "阅读", "打卡"],
        ["质控报表", "阅读", "—", "导出", "导出", "—"],
        ["模板 / 知识库配置", "审核", "阅读", "配置", "阅读", "开关语音"]]
table(s, x0, Inches(3.92), Inches(11.8), rows, [Inches(3.2), Inches(1.72), Inches(1.72), Inches(1.72), Inches(1.72), Inches(1.72)], size=9.5, row_h=Inches(0.4))
footer(s, 7)

# ============ 8 模块1 风险评估 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "03 / 模块 1", "化疗前风险评估（护士端）", "14 项表单 · 一键勾选 · 自动分级 · CTCAE 对照 · 宣教清单自动生成")
card(s, Inches(0.78), Inches(2.15), Inches(3.8), Inches(1.95), 1, "标准化表单",
     "5 维度 14 项：过敏与既往反应、骨髓抑制风险、基础疾病与器官功能、血管条件、营养支持。每条目带权重与 CTCAE 关联。")
card(s, Inches(4.78), Inches(2.15), Inches(3.8), Inches(1.95), 2, "HIS 自动带入",
     "医嘱含 3 级高致敏 → 自动勾“高致敏方案”；含发泡剂/刺激性 → 自动勾对应项；年龄 ≥70 → 自动勾“高龄”。一点即应用。",
     RGBColor(0x0F, 0x76, 0x6E))
card(s, Inches(8.78), Inches(2.15), Inches(3.8), Inches(1.95), 3, "CTCAE 即时对照",
     "勾选条目旁紫色 CTCAE 徽标，点击即阅 1–4 级标准与临床提示，评估时无需另开手册。", RGBColor(0x6D, 0x28, 0xD9))
card(s, Inches(0.78), Inches(4.32), Inches(3.8), Inches(1.95), 4, "知情同意前置",
     "未勾选“已告知风险并签署”时，提交按钮禁用，避免流程跳步。", AMBER)
card(s, Inches(4.78), Inches(4.32), Inches(3.8), Inches(1.95), 5, "自动生成计划",
     "提交后按等级自动生成随访：低危 1 条 / 中危 3 条 / 高危 5 条；并生成个体化宣教清单推送到患者端。",
     RGBColor(0x0F, 0x76, 0x6E), AMBER)
card(s, Inches(8.78), Inches(4.32), Inches(3.8), Inches(1.95), 6, "存档与调阅",
     "评估自动归档（时间/评分/等级/标签/CTCAE 关联/同步状态），历史评估随时回看，同步护理记录。", EMER)
footer(s, 8)

# ============ 9 模块2 实时监控 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "03 / 模块 2", "化疗中实时监控（医护端 + 床头端）", "输液绑定 · 巡视打卡 · 床旁上报 · 监护预警 · AI 语音")
left = [
    ("输液信息绑定", "HIS 医嘱号、药物/剂量/通路、泵速余量、预处理；自动标注“发泡剂·外渗高危”“高致敏 ≥3 级”。"),
    ("标准化巡视打卡", "开始 15/30/60/90 分钟 + 结束 30 分钟；高危患者加密至每 30 分钟；超时标红并计“超时 N 分钟”。"),
    ("床旁一键上报", "6 个快捷症状 + 体温 + 分级 + 描述；提交后自动匹配 SOP 并创建 ADR 进入闭环。"),
    ("监护异常弹窗", "体温 ≥38.0 / HR >110 / SBP <90 / SpO₂ <94% → 弹窗 + 站内预警 + SBAR 提示。"),
    ("床头端 AI 语音", "大屏大字、播放输注注意事项、语音提问即时应答、一键呼叫护士。"),
]
for i, (t, d) in enumerate(left):
    y = Inches(2.18) + Inches(0.9) * i
    rect(s, Inches(0.78), y, Inches(7.1), Inches(0.78), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.06)
    text(s, Inches(1.0), y + Inches(0.1), Inches(2.05), Inches(0.6), t, 11.5, INK, True, line_spacing=1.15)
    text(s, Inches(3.12), y + Inches(0.11), Inches(4.62), Inches(0.62), d, 9.5, INK2, line_spacing=1.25)
# 右：监护阈值卡
rect(s, Inches(8.2), Inches(2.18), Inches(4.38), Inches(4.42), BRAND_D, None, 0.06)
text(s, Inches(8.45), Inches(2.36), Inches(3.9), Inches(0.3), "监护 / 输液泵阈值（演示）", 11, RGBColor(0x7B, 0xE2, 0xE0), True)
vitals = [("体温", "≥ 38.0 ℃", ROSE), ("心率", "> 110 bpm", AMBER), ("收缩压", "< 90 mmHg", ROSE), ("血氧", "< 94 %", ROSE), ("泵速/余量", "按医嘱核对", BRAND)]
for i, (k, v, c) in enumerate(vitals):
    y = Inches(2.85) + Inches(0.62) * i
    text(s, Inches(8.45), y, Inches(1.6), Inches(0.3), k, 10.5, RGBColor(0xD6, 0xF7, 0xF5))
    text(s, Inches(10.1), y, Inches(2.2), Inches(0.3), v, 12, WHITE, True)
    rect(s, Inches(8.45), y + Inches(0.36), Inches(3.86), Inches(0.014), c)
text(s, Inches(8.45), Inches(6.05), Inches(3.9), Inches(0.4), "命中任一阈值即触发床旁弹窗与护士站推送", 9, RGBColor(0x9E, 0xD8, 0xD7))
footer(s, 9)

# ============ 10 模块3/4 随访与AI ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "04 / 模块 3–4", "化疗后居家随访 与 AI 语音提醒引擎", "13 条分时序模板 · 症状上报 CTCAE 初判 · 语音问答三级边界")
rows = [["时间点", "阶段", "提醒内容", "适用风险", "渠道"],
        ["-24h", "化疗前", "明日准备事项（饮食/携带/到达时间）", "全部", "推送+语音"],
        ["-2h", "化疗前", "高致敏药物配合要点", "中/高危", "语音"],
        ["+0.5h / +1.5h", "化疗中", "观察要点 / 呼叫方式 / 饮水如厕", "全部", "语音"],
        ["+6h / +24h", "化疗后", "居家首次提醒 / 症状自查", "全部", "推送+语音"],
        ["+72h", "化疗后", "血常规复查（中危 4 天 / 高危 3 天）", "中/高危", "推送+语音+短信"],
        ["+120h / +168h", "化疗后", "低谷期预警 / 第 7 天复查上传", "全部", "推送+语音"],
        ["+336h / +504h", "化疗后", "第 14 天恢复评估 / 下次化疗预约", "全部", "推送 (+语音)"]]
table(s, Inches(0.78), Inches(2.15), Inches(7.35), rows, [Inches(1.22), Inches(0.9), Inches(3.05), Inches(1.0), Inches(1.18)], size=9, row_h=Inches(0.47))
rect(s, Inches(8.42), Inches(2.15), Inches(4.16), Inches(4.35), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.05)
text(s, Inches(8.66), Inches(2.32), Inches(3.7), Inches(0.3), "AI 应答三级边界（红线）", 11.5, INK, True)
bounds = [
    ("education 宣教指引", "护理措施、饮食、日常观察 → 自动应答 + 语音播报", EMER),
    ("triage 转人工", "用药剂量、方案调整、预后、报销 → 强制转医护", AMBER),
    ("emergency 急症", "发热≥38.3 / 出血不止 / 气道循环 / 意识改变 → 引导 120 或急诊 + 预警", ROSE),
    ("硬性约束", "AI 不生成诊疗方案，不替代执业医师；回复底部常驻免责声明", BRAND),
]
for i, (t, d, c) in enumerate(bounds):
    y = Inches(2.75) + Inches(0.92) * i
    rect(s, Inches(8.66), y, Inches(3.68), Inches(0.8), RGBColor(0xF6, 0xF9, 0xFB), None, 0.06)
    rect(s, Inches(8.66), y, Inches(0.06), Inches(0.8), c)
    text(s, Inches(8.84), y + Inches(0.08), Inches(3.4), Inches(0.28), t, 10, INK, True)
    text(s, Inches(8.84), y + Inches(0.38), Inches(3.4), Inches(0.4), d, 8.5, INK2, line_spacing=1.2)
rect(s, Inches(0.78), Inches(5.78), Inches(7.35), Inches(0.72), BRAND_L, None, 0.06)
text(s, Inches(1.0), Inches(5.9), Inches(6.95), Inches(0.5),
     "症状上报：10 个图标 + 体温 + 语音快速录入 → CTCAE 初判 → ≥2 级建 ADR；高热/出血等立即红色预警 + 语音引导就医", 9.5, BRAND_D, line_spacing=1.3)
footer(s, 10)

# ============ 11 模块5 ADR闭环 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "05 / 模块 5", "不良反应闭环处置", "11 条 SOP 库 · CTCAE 自动研判 · 五态闭环 · 可导出")
flow = ["上报", "分级研判", "SOP 处置", "复评追踪", "闭环归档"]
for i, f in enumerate(flow):
    x = Inches(0.78) + Inches(2.42) * i
    rect(s, x, Inches(2.2), Inches(2.1), Inches(0.78), BRAND if i < 4 else EMER, None, 0.1)
    text(s, x, Inches(2.4), Inches(2.1), Inches(0.4), f, 13, WHITE, True, align=PP_ALIGN.CENTER)
    if i < 4:
        text(s, x + Inches(2.12), Inches(2.42), Inches(0.3), Inches(0.4), "→", 16, MUTED, True)
text(s, Inches(0.78), Inches(3.16), Inches(11.8), Inches(0.3),
     "五态状态机：reported → triaged → handling → rechecking → closed（3–4 级可随时升级）", 10, MUTED)
cols = [
    ("SOP 库（11 条）", ["过敏 1/2/3 级 + 休克应急", "ANC 1/2/3–4 级（含 FN）", "PLT 3 级、化疗外渗", "消化道反应、导管感染", "居家发热强制引导"], BRAND),
    ("自动研判", ["LIS 抓取血常规（HL7 ORU）", "ANC/PLT/WBC/Hb 阈值分级", "≥2 级自动建 ADR 并推送", "≥3 级标红、延迟发现标记", "告警直达责任护士"], AMBER),
    ("闭环与导出", ["处置步骤 + 医嘱参考", "复查要求 + 升级条件", "时间线记录人/动作/时间", "闭环写入 closedAt", "导出 ADR 台账与 HFMEA"], EMER),
]
for i, (t, its, c) in enumerate(cols):
    x = Inches(0.78) + Inches(4.02) * i
    rect(s, x, Inches(3.62), Inches(3.72), Inches(2.85), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.06)
    rect(s, x, Inches(3.62), Inches(3.72), Inches(0.07), c)
    text(s, x + Inches(0.22), Inches(3.78), Inches(3.3), Inches(0.3), t, 12, INK, True)
    for j, it in enumerate(its):
        text(s, x + Inches(0.24), Inches(4.22) + Inches(0.4) * j, Inches(3.3), Inches(0.36), "· " + it, 9.5, INK2)
footer(s, 11)

# ============ 12 模块6 质控 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "05 / 模块 6", "质控管理与数据统计", "六项指标自动统计 · 三栏风险看板 · HFMEA / 品管圈报表导出")
kpis = [("风险评估完成率", "≥90%"), ("宣教覆盖率", "≥90%"), ("随访完成率", "≥80%"), ("提醒已读率", "≥80%"), ("ADR 闭环率", "≥95%"), ("延迟发现例数", "目标 0")]
for i, (k, v) in enumerate(kpis):
    x = Inches(0.78) + Inches(2.0) * i
    rect(s, x, Inches(2.18), Inches(1.86), Inches(1.0), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.09)
    text(s, x + Inches(0.12), Inches(2.3), Inches(1.62), Inches(0.3), k, 9, INK2)
    text(s, x + Inches(0.12), Inches(2.6), Inches(1.62), Inches(0.4), v, 16, BRAND, True)
rows = [["报表", "内容", "用途"],
        ["HFMEA 分析", "失效模式 / 原因 / 影响 / 措施 / S·O·D / RPN", "优先改进项（RPN ≥200 标红）"],
        ["品管圈改善", "按不良反应类型的例数与 3–4 级占比 + 改善建议", "QCC 选题与改善效果对比"],
        ["质控明细", "逐患者：评估/宣教/随访完成率/ADR/最近动作", "月度质控核查与整改"],
        ["操作审计", "全量操作留痕（只追加）", "等保审计与责任追溯"]]
table(s, Inches(0.78), Inches(3.42), Inches(7.6), rows, [Inches(1.5), Inches(3.6), Inches(2.5)], size=9.5, row_h=Inches(0.55))
rect(s, Inches(8.62), Inches(3.42), Inches(3.96), Inches(2.75), BRAND_D, None, 0.05)
text(s, Inches(8.86), Inches(3.58), Inches(3.5), Inches(0.3), "三栏风险看板（实时）", 11, RGBColor(0x7B, 0xE2, 0xE0), True)
for i, t in enumerate(["高危患者（红色置顶）", "指标异常（ANC/PLT 低）", "迟访 / 漏访患者"]):
    y = Inches(3.98) + Inches(0.66) * i
    rect(s, Inches(8.86), y, Inches(3.5), Inches(0.5), RGBColor(0x12, 0x5B, 0x5F), None, 0.12)
    text(s, Inches(9.0), y + Inches(0.11), Inches(3.2), Inches(0.3), f"{i+1}. {t}", 9.5, WHITE)
text(s, Inches(8.86), Inches(5.98), Inches(3.5), Inches(0.3), "护士长 / 质控员视角，支持导出 CSV / JSON", 8.5, RGBColor(0x9E, 0xD8, 0xD7))
footer(s, 12)

# ============ 13 患者端演示路径 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "06 / 实操", "患者端演示路径（手机扫码，5 分钟）", "直达链接：/daychemo-smart-care/#/patient（免登录）")
steps = [
    ("①", "首页语音提醒", "看到“化疗后第 7 天复查”提醒卡，点“语音播报”听一遍；点“查看”确认已读。"),
    ("②", "症状上报", "点“症状上报”→“发热”+体温 38.8 → 提交 → 出现红色“请立即联系医护”弹窗与 120 按钮。"),
    ("③", "语音AI 提问", "点“语音小助手”→ 点快捷键“化疗后发烧了怎么办？”→ 听到语音应答与“急症识别”标签。"),
    ("④", "转人工", "在回答下方点“转医护”→ 医护端“随访页”AI 转人工队列出现该问题。"),
    ("⑤", "宣教与设置", "“我的宣教”按阶段筛选并语音朗读；“我的”调语速/免打扰/大字模式。"),
]
for i, (n, t, d) in enumerate(steps):
    y = Inches(2.15) + Inches(0.86) * i
    rect(s, Inches(0.78), y, Inches(7.4), Inches(0.74), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.06)
    text(s, Inches(0.96), y + Inches(0.18), Inches(0.4), Inches(0.4), n, 14, BRAND, True)
    text(s, Inches(1.42), y + Inches(0.09), Inches(1.7), Inches(0.3), t, 10.5, INK, True)
    text(s, Inches(3.16), y + Inches(0.1), Inches(4.82), Inches(0.58), d, 9.2, INK2, line_spacing=1.2)
rect(s, Inches(8.5), Inches(2.15), Inches(4.08), Inches(4.3), BRAND_D, None, 0.06)
text(s, Inches(8.74), Inches(2.3), Inches(3.6), Inches(0.3), "扫码进入患者端", 11, RGBColor(0x7B, 0xE2, 0xE0), True)
try:
    s.shapes.add_picture("docs/images/qr-patient.png", Inches(9.32), Inches(2.66), height=Inches(1.7))
    text(s, Inches(8.74), Inches(4.44), Inches(3.6), Inches(0.28), "与学员手机同屏对照操作", 8.5, RGBColor(0x9E, 0xD8, 0xD7), align=PP_ALIGN.CENTER)
except Exception:
    pass
text(s, Inches(8.74), Inches(4.78), Inches(3.6), Inches(0.3), "老年友好设计", 11, RGBColor(0x7B, 0xE2, 0xE0), True)
for i, t in enumerate(["大字模式（字号 +18%、按钮 ≥56px）", "语音优先：可全程“说话”完成上报与提问", "10 个图标 + 表情，无需阅读长文", "高危症状红色大字 + 一键拨 120", "免打扰夜间静音，不打扰睡眠"]):
    text(s, Inches(8.74), Inches(5.14) + Inches(0.26) * i, Inches(3.6), Inches(0.26), "· " + t, 8.2, RGBColor(0xD6, 0xF7, 0xF5), line_spacing=1.05)
text(s, Inches(0.78), Inches(6.62), Inches(11.8), Inches(0.3),
     "考核点：能否独立完成“听提醒 → 报症状 → 语音提问 → 转人工”四步（限时 3 分钟）", 10, MUTED)
footer(s, 13)

# ============ 14 医护端演示路径 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "06 / 实操", "医护端演示路径（8 分钟）", "护士 → 医生 → 护士长三角色串联")
steps = [
    ("护士", "① 登录选“李晓梅” → 化疗前评估 → 勾选 3 项看分值变化 → 提交生成随访计划", BRAND),
    ("护士", "② 实时监控 → 张桂芳卡片“模拟采集” → 异常弹窗 → “床旁快速上报”2 级过敏", RGBColor(0x0F, 0x76, 0x6E)),
    ("医生", "③ 切“王建国” → 不良反应闭环 → 打开事件 → 看 SOP 与时间线 → 提交复评 → 闭环", RGBColor(0x1D, 0x4E, 0xD8)),
    ("护士", "④ 随访页 → 找到漏访患者 → “二次提醒” → “填写随访”保存完成", AMBER),
    ("护士长", "⑤ 切“张海燕” → 质控页 → 看四项完成率 → HFMEA RPN → 导出 CSV", RGBColor(0x6D, 0x28, 0xD9)),
    ("管理", "⑥ 配置中心改名提醒话术 → 知识库加一条问答 → 接口页推送 ANC 0.86 造 ADR", EMER),
]
for i, (r, t, c) in enumerate(steps):
    y = Inches(2.12) + Inches(0.72) * i
    rect(s, Inches(0.78), y, Inches(11.8), Inches(0.6), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.06)
    pill(s, Inches(0.9), y + Inches(0.13), Inches(0.92), Inches(0.34), r, c, WHITE, 9)
    text(s, Inches(1.98), y + Inches(0.16), Inches(10.4), Inches(0.34), t, 10, INK2)
text(s, Inches(0.78), Inches(6.5), Inches(11.8), Inches(0.3),
     "考核点：能说出“高危患者为什么会被加密随访”、能在 1 分钟内导出一份 HFMEA 报表", 10, MUTED)
footer(s, 14)

# ============ 15 接口与安全 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "07 / 集成", "接口集成与安全合规", "HIS / LIS / 消息平台 / 监护设备 · 等保三级要求")
ifaces = [("HIS", "HL7 v2.5 / FHIR R4", "患者、化疗医嘱、药物属性、预处理"), ("LIS", "HL7 ORU^R01", "血常规 WBC/ANC/PLT/Hb、CRP"), ("消息", "HTTP REST", "站内、短信、企业微信"), ("监护", "MQTT over TLS", "T/HR/BP/SpO₂、泵速余量")]
for i, (n, p, d) in enumerate(ifaces):
    x = Inches(0.78) + Inches(2.98) * i
    rect(s, x, Inches(2.15), Inches(2.82), Inches(1.5), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.07)
    text(s, x + Inches(0.2), Inches(2.3), Inches(2.4), Inches(0.3), n, 12.5, INK, True)
    text(s, x + Inches(0.2), Inches(2.62), Inches(2.4), Inches(0.3), p, 9, BRAND)
    text(s, x + Inches(0.2), Inches(2.94), Inches(2.4), Inches(0.6), d, 9, INK2, line_spacing=1.25)
secs = [("传输", "HTTPS / TLS 1.2+；院内建议 TLS 1.3 + HSTS"), ("存储", "字段级加密（AES-256）+ 密钥 KMS 托管"), ("隐私", "姓名/住院号/手机号默认脱敏，导出同样脱敏"), ("审计", "全量操作留痕 ≥6 个月，只追加不可改"), ("AI", "检索式知识库 + 三级边界，不生成诊疗方案"), ("等保", "按 GB/T 22239 三级完成定级备案与测评")]
for i, (k, v) in enumerate(secs):
    col, row = i % 2, i // 2
    x = Inches(0.78) + Inches(5.98) * col
    y = Inches(3.92) + Inches(0.8) * row
    rect(s, x, y, Inches(5.82), Inches(0.66), WHITE, RGBColor(0xE2, 0xE8, 0xF0), 0.05)
    text(s, x + Inches(0.16), y + Inches(0.16), Inches(0.8), Inches(0.3), k, 9.5, BRAND, True)
    text(s, x + Inches(1.02), y + Inches(0.16), Inches(4.64), Inches(0.4), v, 9, INK2)
footer(s, 15)

# ============ 16 上线计划 ============
s = prs.slides.add_slide(BLANK)
bg(s)
header(s, "08 / 实施", "上线实施计划（建议）", "从演示到院内生产的关键里程碑")
rows = [["阶段", "周期", "关键任务", "交付/验收"],
        ["P0 需求确认", "1 周", "评审 PRD、校准评分权重与阈值、确认 SOP/宣教口径", "签字版 PRD、内容清单"],
        ["P1 内容导入", "1–2 周", "导入 SOP / CTCAE / 宣教 / 模板 / 知识库；专科审核", "审核签字的导入清单"],
        ["P2 接口对接", "2–3 周", "HIS/LIS/消息/监护联调；患者标识与脱敏规则", "接口测试报告"],
        ["P3 试运行", "2 周", "单病区 20–30 例平行运行；对比人工流程", "问题清单 + 改进项"],
        ["P4 培训上线", "1 周", "分层培训（护士/医生/质控/患者）；应急预案", "考核通过率 ≥90%"],
        ["P5 验收与推广", "1 周", "质控指标基线采集、等保整改、全院推广", "验收报告 + 质控基线"]]
table(s, Inches(0.78), Inches(2.12), Inches(11.8), rows, [Inches(2.0), Inches(1.2), Inches(5.4), Inches(3.2)], size=9.5, row_h=Inches(0.6))
rect(s, Inches(0.78), Inches(6.28), Inches(11.8), Inches(0.68), BRAND_L, None, 0.06)
text(s, Inches(1.0), Inches(6.42), Inches(11.4), Inches(0.42),
     "总周期约 8–10 周（内容审核与接口联调为主要不确定项）；建议先以“演示版 + 单病区试运行”双轨推进", 10, BRAND_D)
footer(s, 16)

# ============ 17 考核与答疑 ============
s = prs.slides.add_slide(BLANK)
bg(s, BRAND_D)
rect(s, 0, 0, W, Inches(0.12), BRAND)
text(s, Inches(0.95), Inches(1.15), Inches(7), Inches(0.35), "WRAP-UP", 11.5, RGBColor(0x7B, 0xE2, 0xE0), True)
text(s, Inches(0.9), Inches(1.55), Inches(8.6), Inches(0.9), "培训考核与持续改进", 34, WHITE, True)
rect(s, Inches(0.95), Inches(2.55), Inches(0.7), Inches(0.06), BRAND)
tasks = ["说出高危患者的 3 条自动联动动作", "独立完成一次床旁上报并解释 SOP 依据", "在患者端完成“听提醒→报症状→语音提问”三步", "导出一份 HFMEA 报表并指出 1 个优先改进项", "说明 AI 的三级边界与免责要求"]
text(s, Inches(0.95), Inches(2.95), Inches(5.2), Inches(0.3), "考核任务（5 项，≥4 项通过）", 12, RGBColor(0x9E, 0xD8, 0xD7), True)
for i, t in enumerate(tasks):
    text(s, Inches(0.95), Inches(3.38) + Inches(0.46) * i, Inches(5.4), Inches(0.4), f"{i+1}. {t}", 10.5, RGBColor(0xD6, 0xF7, 0xF5))
rect(s, Inches(6.65), Inches(2.9), Inches(5.85), Inches(3.3), RGBColor(0x12, 0x5B, 0x5F), None, 0.06)
text(s, Inches(6.9), Inches(3.06), Inches(5.3), Inches(0.3), "持续改进机制", 11.5, RGBColor(0x7B, 0xE2, 0xE0), True)
for i, t in enumerate(["每月质控例会：看 4 项完成率 + 延迟发现例数", "每季 SOP / 知识库版本评审", "每半年权重与阈值校准（用本院真实数据）", "问题反馈：GitHub Issues / 院内工单"]):
    text(s, Inches(6.9), Inches(3.5) + Inches(0.55) * i, Inches(5.3), Inches(0.5), "· " + t, 9.5, RGBColor(0xD6, 0xF7, 0xF5), line_spacing=1.2)
text(s, Inches(0.95), Inches(6.5), Inches(11.4), Inches(0.35),
     "演示地址：greatday4yole.github.io/daychemo-smart-care  ｜  患者端直达：#/patient  ｜  床头端直达：#/bedside", 10, RGBColor(0x9E, 0xD8, 0xD7))

prs.save("docs/日间化疗智慧照护系统-培训PPT.pptx")
print("saved:", len(prs.slides.__iter__.__self__._sldIdLst), "slides")
