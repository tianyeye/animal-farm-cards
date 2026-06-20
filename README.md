# 动物庄园 · 查卡站

桌游《动物庄园》的在线查卡网站：54 张卡牌图鉴（其中 50 张有卡图）、分项介绍、规则书与 FAQ，并且每张卡都能一键反馈问题到作者邮箱。

纯静态站点，无需后端，直接挂在 GitHub Pages 上即可。

## 目录结构

```
animal-farm-cards/
├─ config/            ★ 内容总开关（你只改这里，详见 config/README.txt）
│  ├─ cards_characters.csv  角色牌（主卡角色 + 副卡角色）
│  ├─ cards_functions.csv   功能牌
│  ├─ rules.md              规则书正文（Markdown）
│  ├─ faq.md                常见问题
│  ├─ keywords.csv          关键词,释义
│  ├─ site.txt              站点设置（标题/反馈邮箱/页脚）
│  └─ README.txt            填写说明
├─ build.py           构建脚本：读 config/ → 生成下面的 js 文件 + 复制卡图
├─ index.html         主页（卡牌图鉴 / 组卡 / 规则书 / FAQ 四个标签）
├─ css/style.css      样式
├─ js/
│  ├─ data.js         卡牌数据（自动生成，勿手改）
│  ├─ content.js      规则书 / FAQ / 关键词（自动生成，勿手改）
│  ├─ config.js       站点设置（自动生成，勿手改）
│  ├─ util.js         共享工具（转义/关键词高亮/卡牌分项信息）
│  ├─ app.js          页面逻辑（图鉴/标签/弹窗/反馈/规则目录）
│  ├─ deckbuilder.js  组卡系统（标准/乱局 + 本地保存 + 拼版导出）
│  └─ vendor/jspdf.umd.min.js  PDF 生成库（本地内置，A4 导出用）
├─ assets/cards/      卡图（编号命名，如 Red_Base_Leader_01.png）
├─ start.bat          一键启动本地服务器
├─ .nojekyll          告诉 GitHub Pages 原样发布（勿删）
└─ README.md
```

## 〇、改内容只看这一节（傻瓜式）

**所有页面内容都由 `config/` 文件夹驱动。** 你只改 `config/` 里的文件，然后运行一次：

```bash
python build.py
```

卡牌、规则书、FAQ、关键词、站点标题/反馈邮箱就会全部重新生成（写入 `js/data.js`、`js/content.js`、`js/config.js`，并复制最新卡图）。`js/` 里这三个文件是自动产物，别手改。

- **加/改卡** → 编辑 `config/cards_characters.csv`、`cards_functions.csv`
- **改规则书** → 编辑 `config/rules.md`（Markdown：`##/###/####` 标题、`- ` 列表、`> ` 提示框、`**加粗**`、`{关键词}`；左侧目录自动生成）
- **改 FAQ** → 编辑 `config/faq.md`（`## ` 是问题，下面是答案）
- **加关键词** → 编辑 `config/keywords.csv`
- **改标题/反馈邮箱/页脚** → 编辑 `config/site.txt`

详细填写说明见 `config/README.txt`。

## 一、本地预览

**最简单：双击根目录的 `start.bat`**（Windows）。它会启动本地服务器并自动打开浏览器，用完关掉黑窗口即可。

> ⚠️ 不要直接双击 `index.html`。那是 `file://` 方式，浏览器会限制画布读取，**两个导出功能会失败**（提示「Tainted canvases」）。看图鉴/组卡没问题，但导出必须经服务器。

手动方式（任何系统）：

```bash
cd animal-farm-cards
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

部署到 GitHub Pages 后是 https 访问，导出一切正常，无需担心此问题。

## 二、部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `animal-farm-cards`。
2. 把本文件夹里的<b>全部内容</b>推上去：
   ```bash
   cd animal-farm-cards
   git init
   git add .
   git commit -m "动物庄园查卡站"
   git branch -M main
   git remote add origin https://github.com/你的用户名/animal-farm-cards.git
   git push -u origin main
   ```
3. 仓库 → Settings → Pages → Source 选 `Deploy from a branch`，Branch 选 `main` / `(root)`，保存。
4. 等一两分钟，访问 `https://你的用户名.github.io/animal-farm-cards/` 即可。

> 想用根域名 `你的用户名.github.io`，就把仓库命名为 `你的用户名.github.io`。
> 站内所有路径都是相对路径，放在子目录也能正常工作。

## 三、玩家反馈如何到你邮箱（重要）

反馈用的是免费服务 **FormSubmit.co**，会把表单转发到 `dogtian@foxmail.com`。

**首次激活（只需一次）：**
1. 网站上线后，自己在任意卡牌里点「反馈这张卡的问题」提交一条测试反馈。
2. FormSubmit 会给 `dogtian@foxmail.com` 发一封激活邮件，点里面的确认链接。
3. 激活后，之后所有玩家的反馈都会自动发到你邮箱。

**可选 · 隐藏邮箱防垃圾邮件：** 激活后 FormSubmit 会给你一个哈希地址（形如 `https://formsubmit.co/ajax/xxxxxxxx`）。把 `js/app.js` 顶部的 `FEEDBACK_ENDPOINT` 换成那个哈希地址，邮箱就不会暴露在网页源码里。

如果反馈提交失败（例如玩家网络问题），页面会自动给出 `mailto:` 邮件兜底链接。

## 四、更新卡牌数据

卡牌数据来源是两份策划表：
- `h:\2025-2026项目\动物庄园\策划-角色牌.csv`
- `h:\2025-2026项目\动物庄园\策划-功能牌.csv`

卡图来源：`h:\2025-2026项目\动物庄园\4.25导出_圆角\`

改完卡表后，重新生成数据与卡图：

```bash
python build.py
```

脚本会重新解析 CSV、覆盖生成 `js/data.js`（不再处理图片）。

### 关于卡图（已压缩为 WebP）

卡图存放在 `assets/cards/<编号>.webp`，是从美术大 PNG 压缩来的（同分辨率 744×1039 = 63×88mm@300ppi，保留透明圆角，每张约 200KB，**总计约 11MB，国内加载快**；导出打印质量不受影响）。

平时改卡表/规则**不用**碰图片。只有**美术更新了卡图**时才需要重新压缩：

```bash
npm install sharp        # 装一次
node tools/optimize-images.mjs   # 读 4.25导出_圆角 的 PNG → 生成 webp
python build.py          # 让网站引用新图
```

卡图的「编号 → 源文件名」映射写在 `tools/optimize-images.mjs` 的 `IMAGE_MAP` 里；导出顺序/数量变了改那里。

### 关于无卡图的 4 张

唐纳德鸭、永远在赢/反移民政策、肥头、肥头二号（均为 SP 卡）暂无卡图，站内显示「暂无卡图」占位。等有图后在 `optimize-images.mjs` 的 `IMAGE_MAP` 补上映射、重跑上面两步即可。

## 五、组卡系统

「组卡」标签是一个本地组卡器，两种模式：

- **标准模式**：主副绑定、1x，点选恰好 **5 张主卡**（自动带入主+副两张，共 10 张）。
- **乱局模式**：主副解绑，每张卡最多 **2 张**，牌组 **≥ 20 张**；卡池为全部 54 张单卡。

牌组保存在浏览器的 **localStorage**（本地记录，不是下载文件），可命名、载入、删除，换设备/清缓存会丢失。同一台机器、同一浏览器下持久保留。标准/乱局是两类独立记录，切换模式会开始一套新牌组（不会误覆盖已存的另一模式牌组）。

**界面功能：**
- **大图 / 列表** 两种卡池显示方式（工具条右上角切换）。
- **鼠标悬浮**任意卡牌（卡池里或牌组里）即显示该卡的分项详情。
- 标准模式下打开 **「看副卡」** 开关，卡池缩略图会翻到每张主卡的副牌（选择仍按主卡整组）。

**导出拼版（针对当前牌组，需先有牌）：**
1. **A4 打印 PDF**：在 300ppi 的 A4 纸上拼版，每页最多 3×3 = 9 张，带浅色裁切线，下载 `.pdf`。卡图原生 744×1039 像素 = 63×88mm 标准扑克尺寸，打印无需缩放。
2. **TTS 图包 PNG**：每行 5 张、无缝紧密拼版，按数量决定行数，整副牌拼到一张 `.png`（文件名含 `列×行`，方便在 TTS 里按网格导入）。

> ⚠️ 导出用到 `<canvas>` 读取卡图，**必须通过本地服务器或线上访问**（`python -m http.server` 或 GitHub Pages）。直接双击 `file://` 打开时浏览器会「污染画布」导致导出失败——页面会给出相应提示。

> 27 张主卡里含 2 张 SP 主卡（唐纳德鸭、肥头），组卡器允许选入并标了「SP」角标；是否在你的赛制里合法由你定。SP 等暂无卡图的卡，导出时以「卡名占位块」呈现。

## 六、规则书 / FAQ 维护

规则书、FAQ、关键词都在 `config/` 里用 Markdown / CSV 维护（`rules.md`、`faq.md`、`keywords.csv`），改完跑 `python build.py` 重新生成。规则书左侧的分级目录会按 `##/###/####` 标题层级自动生成，无需手动维护。
