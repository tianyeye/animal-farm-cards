# -*- coding: utf-8 -*-
"""
动物庄园查卡站 · 内容构建脚本
读取 config/ 下的傻瓜式配置，生成网站用的 js 文件：
  config/cards_characters.csv + cards_functions.csv  ->  js/data.js   （卡牌数据 + 复制卡图）
  config/rules.md + faq.md + keywords.csv            ->  js/content.js（规则书 / FAQ / 关键词）
  config/site.txt                                    ->  js/config.js （标题 / 反馈邮箱 / 页脚）

改完 config/ 里的文件后，运行：  python build.py
"""
import csv
import os
import json
import re
import shutil

# ---------------------------------------------------------------- 路径
HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "config")
CHAR_CSV = os.path.join(CONFIG, "cards_characters.csv")
FUNC_CSV = os.path.join(CONFIG, "cards_functions.csv")
KW_CSV = os.path.join(CONFIG, "keywords.csv")
RULES_MD = os.path.join(CONFIG, "rules.md")
FAQ_MD = os.path.join(CONFIG, "faq.md")
SITE_TXT = os.path.join(CONFIG, "site.txt")

# 卡图来源（美术导出目录，不属于傻瓜式配置；顺序/数量变了改下面 IMAGE_MAP）
IMG_SRC_DIR = r"h:\2025-2026项目\动物庄园\4.25导出_圆角"
IMG_OUT_DIR = os.path.join(HERE, "assets", "cards")

JS_DIR = os.path.join(HERE, "js")
DATA_OUT = os.path.join(JS_DIR, "data.js")
CONTENT_OUT = os.path.join(JS_DIR, "content.js")
CONFIG_OUT = os.path.join(JS_DIR, "config.js")

COLOR_KEY = {"红": "red", "黄": "yellow", "蓝": "blue", "绿": "green", "紫": "purple"}
COLOR_ORDER = {"红": 0, "黄": 1, "蓝": 2, "绿": 3, "紫": 4}

# 图片 编号 -> 源文件名（红黄蓝绿紫，每色 5 主卡，主卡+绑定副卡）—— 逐张核对
IMAGE_MAP = {
    "Red_Base_Leader_01": "模板.png", "Red_Base_Sub_01": "模板2.png",
    "Red_Base_Leader_02": "模板3.png", "Red_Base_Sub_02": "模板4.png",
    "Red_Base_Leader_03": "模板5.png", "Red_Base_Sub_03": "模板6.png",
    "Red_Base_Leader_04": "模板7.png", "Red_Base_Sub_04": "模板8.png",
    "Red_Base_Leader_05": "模板9.png", "Red_Base_Sub_05": "模板10.png",
    "Yellow_Base_Leader_01": "模板11.png", "Yellow_Base_Sub_01": "模板12.png",
    "Yellow_Base_Leader_02": "模板13.png", "Yellow_Base_Sub_02": "模板14.png",
    "Yellow_Base_Leader_03": "模板15.png", "Yellow_Base_Sub_03": "模板16.png",
    "Yellow_Base_Leader_04": "模板17.png", "Yellow_Base_Sub_04": "模板18.png",
    "Yellow_Base_Leader_05": "模板19.png", "Yellow_Base_Sub_05": "模板20.png",
    "Blue_Base_Leader_01": "模板23.png", "Blue_Base_Sub_01": "模板24.png",
    "Blue_Base_Leader_02": "模板25.png", "Blue_Base_Sub_02": "模板26.png",
    "Blue_Base_Leader_03": "模板27.png", "Blue_Base_Sub_03": "模板28.png",
    "Blue_Base_Leader_04": "模板29.png", "Blue_Base_Sub_04": "模板30.png",
    "Blue_Base_Leader_05": "模板31.png", "Blue_Base_Sub_05": "模板32.png",
    "Green_Base_Leader_01": "模板33.png", "Green_Base_Sub_01": "模板34.png",
    "Green_Base_Leader_02": "模板35.png", "Green_Base_Sub_02": "模板36.png",
    "Green_Base_Leader_03": "模板37.png", "Green_Base_Sub_03": "模板38.png",
    "Green_Base_Leader_04": "模板39.png", "Green_Base_Sub_04": "模板40.png",
    "Green_Base_Leader_05": "模板41.png", "Green_Base_Sub_05": "模板42.png",
    "Purple_Base_Leader_01": "模板43.png", "Purple_Base_Sub_01": "模板44.png",
    "Purple_Base_Leader_02": "模板45.png", "Purple_Base_Sub_02": "模板46.png",
    "Purple_Base_Leader_03": "模板47.png", "Purple_Base_Sub_03": "模板48.png",
    "Purple_Base_Leader_04": "模板49.png", "Purple_Base_Sub_04": "模板50.png",
    "Purple_Base_Leader_05": "模板51.png", "Purple_Base_Sub_05": "模板52.png",
}


def clean(v):
    return (v or "").strip()


def norm_id(raw):
    return clean(raw).replace("Laeder", "Leader")


def pair_id(cid):
    if "_Leader_" in cid:
        return cid.replace("_Leader_", "_Sub_")
    if "_Sub_" in cid:
        return cid.replace("_Sub_", "_Leader_")
    return None


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


# ===================================================== 关键词
def read_keywords():
    kw = {}
    with open(KW_CSV, encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            k, v = row[0].strip(), row[1].strip()
            if not k or k == "关键词":
                continue
            kw[k] = v
    return kw


# ===================================================== Markdown -> HTML
def esc_html(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def wrap_keywords(s, kw):
    """把 {关键词} 包成带释义的高亮 span（s 已转义）"""
    def repl(m):
        inner = m.group(1)
        base = re.sub(r"[0-9Xx]+$", "", re.sub(r"^已", "", inner))
        desc = kw.get(base) or kw.get(inner) or ""
        data = ' data-desc="' + esc_html(desc) + '"' if desc else ""
        return '<span class="kw"' + data + ">" + inner + "</span>"
    return re.sub(r"\{([^}]+)\}", repl, s)


def inline(s, kw):
    s = esc_html(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    s = wrap_keywords(s, kw)
    return s


def parse_list(lines, i, kw):
    items = []  # [text, [children]]
    while i < len(lines):
        m = re.match(r"^(\s*)-\s+(.*)$", lines[i])
        if not m:
            break
        indent, text = len(m.group(1)), m.group(2)
        if indent >= 2 and items:
            items[-1][1].append(inline(text, kw))
        else:
            items.append([inline(text, kw), []])
        i += 1
    html = "<ul>"
    for text, kids in items:
        html += "<li>" + text
        if kids:
            html += "<ul>" + "".join("<li>" + c + "</li>" for c in kids) + "</ul>"
        html += "</li>"
    html += "</ul>"
    return html, i


def md_to_html(md, kw):
    lines = md.split("\n")
    out, para, i = [], [], 0

    def flush():
        if para:
            out.append("<p>" + inline("".join(para), kw) + "</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if s == "":
            flush(); i += 1; continue
        if s.startswith("#"):  # 注释行（# 开头但不是标题语法）也跳过
            if line.startswith("#### "):
                flush(); out.append("<h4>" + inline(line[5:].strip(), kw) + "</h4>"); i += 1; continue
            if line.startswith("### "):
                flush(); out.append("<h3>" + inline(line[4:].strip(), kw) + "</h3>"); i += 1; continue
            if line.startswith("## "):
                flush(); out.append("<h2>" + inline(line[3:].strip(), kw) + "</h2>"); i += 1; continue
            i += 1; continue  # 纯注释
        if s == "{{glossary}}":
            flush(); out.append('<div class="glossary" id="glossary"></div>'); i += 1; continue
        if line.startswith(">"):
            flush()
            note = []
            while i < len(lines) and lines[i].startswith(">"):
                note.append(inline(lines[i].lstrip(">").strip(), kw)); i += 1
            out.append('<p class="note">' + "<br>".join(note) + "</p>"); continue
        if re.match(r"^\s*-\s", line):
            flush()
            html, i = parse_list(lines, i, kw)
            out.append(html); continue
        para.append(s); i += 1
    flush()
    return "\n".join(out)


def faq_to_list(md, kw):
    items, cur = [], None
    for line in md.split("\n"):
        if line.startswith("## "):
            if cur:
                items.append(cur)
            cur = {"q": inline(line[3:].strip(), kw), "a": []}
        elif line.startswith("#"):
            continue  # 注释
        elif cur is not None and line.strip():
            cur["a"].append(inline(line.strip(), kw))
    if cur:
        items.append(cur)
    return [{"q": it["q"], "a": "<br>".join(it["a"])} for it in items]


# ===================================================== site.txt
def read_site():
    d = {}
    with open(SITE_TXT, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip()
    return d


# ===================================================== 卡牌
def build_cards():
    cards = []
    for row in read_csv(CHAR_CSV):
        cid = norm_id(row["编号"])
        if not cid:
            continue
        color = clean(row["颜色"])
        cards.append({
            "id": cid, "color": color, "colorKey": COLOR_KEY.get(color, ""),
            "type": "character",
            "role": (clean(row.get("主/副卡")).replace("Laeder", "Leader")
                     or ("Sub" if "_Sub_" in cid else "Leader")),
            "name": clean(row["角色名称"]), "animal": clean(row["动物类型"]),
            "recruit": clean(row["募集能力"]), "passive": clean(row["被动效果"]),
            "declName": clean(row["宣言名称"]), "declCost": clean(row["宣言消耗"]),
            "declEffect": clean(row["宣言效果"]), "bound": clean(row["绑定卡"]),
            "tags": clean(row.get("标签")),
        })
    for row in read_csv(FUNC_CSV):
        cid = norm_id(row["编号"])
        if not cid:
            continue
        color = clean(row["颜色"])
        cards.append({
            "id": cid, "color": color, "colorKey": COLOR_KEY.get(color, ""),
            "type": "function", "role": "Sub",
            "name": clean(row["功能牌名称"]),
            "meansName": clean(row["手段名称"]), "meansCost": clean(row["手段消耗"]),
            "meansEffect": clean(row["手段效果"]), "billName": clean(row["议案名称"]),
            "billEffect": clean(row["议案效果"]), "bound": clean(row["绑定卡"]),
        })

    os.makedirs(IMG_OUT_DIR, exist_ok=True)
    by_id = {c["id"]: c for c in cards}
    copied = 0
    for cid, c in by_id.items():
        src_name = IMAGE_MAP.get(cid)
        if src_name and os.path.exists(os.path.join(IMG_SRC_DIR, src_name)):
            shutil.copyfile(os.path.join(IMG_SRC_DIR, src_name),
                            os.path.join(IMG_OUT_DIR, cid + ".png"))
            c["image"] = "assets/cards/" + cid + ".png"
            copied += 1
        else:
            if src_name:
                print("  ! 缺少源图片:", src_name)
            c["image"] = None

    for c in cards:
        pid = pair_id(c["id"])
        c["pairId"] = pid if (pid and pid in by_id) else None

    def sort_key(c):
        return (COLOR_ORDER.get(c["color"], 9), 1 if "_SP_" in c["id"] else 0,
                c["id"].split("_")[-1], 1 if "_Sub_" in c["id"] else 0)
    cards.sort(key=sort_key)
    return cards, copied


# ===================================================== 写出
def write_js(path, header, body):
    os.makedirs(JS_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n" + body + "\n")


GEN = "// 由 build.py 从 config/ 自动生成，请勿手改。改内容请编辑 config/ 后重跑 build.py"


def main():
    kw = read_keywords()
    cards, copied = build_cards()
    rules_html = md_to_html(open(RULES_MD, encoding="utf-8-sig").read(), kw)
    faq = faq_to_list(open(FAQ_MD, encoding="utf-8-sig").read(), kw)
    site = read_site()

    write_js(DATA_OUT, GEN, "window.CARDS = " + json.dumps(cards, ensure_ascii=False, indent=2) + ";")
    write_js(CONTENT_OUT, GEN,
             "window.KEYWORDS = " + json.dumps(kw, ensure_ascii=False, indent=2) + ";\n\n"
             + "window.RULES_HTML = " + json.dumps(rules_html, ensure_ascii=False) + ";\n\n"
             + "window.FAQ = " + json.dumps(faq, ensure_ascii=False, indent=2) + ";")
    write_js(CONFIG_OUT, GEN, "window.SITE = " + json.dumps(site, ensure_ascii=False, indent=2) + ";")

    with_img = sum(1 for c in cards if c.get("image"))
    print(f"卡牌：{len(cards)} 张（复制图片 {copied}，有图 {with_img}，无图 {len(cards) - with_img}）")
    print(f"关键词：{len(kw)} 条 | 规则书：{rules_html.count('<h3')} 个章节 | FAQ：{len(faq)} 条")
    print("已生成 js/data.js, js/content.js, js/config.js")


if __name__ == "__main__":
    main()
