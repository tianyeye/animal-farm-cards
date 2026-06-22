/**
 * 卡图优化 + 水印脚本（美术更新卡图、或想改水印时运行）
 *
 * 作用：读美术导出的大 PNG → 打上对角平铺的半透明水印 → 压成 WebP（同分辨率、
 *       保留透明圆角）→ 输出 assets/cards/<编号>.webp。
 *       每次都从「干净的源 PNG」重新生成，所以水印永远只有一层，重复运行不会叠加。
 *
 * 水印文字来自 config/site.txt 的 watermark1 / watermark2（傻瓜式可改）。
 *
 * 用法（项目根目录）：
 *   1) 装一次依赖：  npm install sharp
 *   2) 运行：        node tools/optimize-images.mjs
 *      （也可以用  python build.py --images  一并跑图片+内容）
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

const SRC_DIR = "h:/2025-2026项目/动物庄园/4.25导出_圆角"; // 美术大 PNG 源目录
const OUT_DIR = path.join(ROOT, "assets", "cards");
const SITE_TXT = path.join(ROOT, "config", "site.txt");
const QUALITY = 86;

// 默认水印文字（config/site.txt 里有 watermark1/2 则以那里为准）
let WM1 = "动物庄园·试玩版本";
let WM2 = "官方qq群：1084138439";
try {
  for (const line of fs.readFileSync(SITE_TXT, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i).trim(), v = s.slice(i + 1).trim();
    if (k === "watermark1") WM1 = v;
    if (k === "watermark2") WM2 = v;
  }
} catch (e) { /* 用默认 */ }

const FONT = "Microsoft YaHei,PingFang SC,Noto Sans CJK SC,SimHei,sans-serif";
function xml(s) { return s.replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
function watermarkSvg(w, h) {
  // 描边 + 半透明填充：深色背景靠白字、浅色背景靠黑描边，任何底图都看得清
  var common = 'fill="#ffffff" fill-opacity="0.42" stroke="#000000" stroke-opacity="0.38" stroke-width="0.9" paint-order="stroke"';
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="wm" width="300" height="172" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
    <text x="0" y="24" font-family="${FONT}" font-size="22" font-weight="bold" ${common}>${xml(WM1)}</text>
    <text x="0" y="52" font-family="${FONT}" font-size="16" ${common}>${xml(WM2)}</text>
  </pattern></defs>
  <rect width="100%" height="100%" fill="url(#wm)"/></svg>`;
}

// 编号 -> 源文件名（红黄蓝绿紫，每色 5 主卡，主卡+绑定副卡）—— 逐张核对
const IMAGE_MAP = {
  Red_Base_Leader_01: "模板.png", Red_Base_Sub_01: "模板2.png",
  Red_Base_Leader_02: "模板3.png", Red_Base_Sub_02: "模板4.png",
  Red_Base_Leader_03: "模板5.png", Red_Base_Sub_03: "模板6.png",
  Red_Base_Leader_04: "模板7.png", Red_Base_Sub_04: "模板8.png",
  Red_Base_Leader_05: "模板9.png", Red_Base_Sub_05: "模板10.png",
  Yellow_Base_Leader_01: "模板11.png", Yellow_Base_Sub_01: "模板12.png",
  Yellow_Base_Leader_02: "模板13.png", Yellow_Base_Sub_02: "模板14.png",
  Yellow_Base_Leader_03: "模板15.png", Yellow_Base_Sub_03: "模板16.png",
  Yellow_Base_Leader_04: "模板17.png", Yellow_Base_Sub_04: "模板18.png",
  Yellow_Base_Leader_05: "模板19.png", Yellow_Base_Sub_05: "模板20.png",
  Blue_Base_Leader_01: "模板23.png", Blue_Base_Sub_01: "模板24.png",
  Blue_Base_Leader_02: "模板25.png", Blue_Base_Sub_02: "模板26.png",
  Blue_Base_Leader_03: "模板27.png", Blue_Base_Sub_03: "模板28.png",
  Blue_Base_Leader_04: "模板29.png", Blue_Base_Sub_04: "模板30.png",
  Blue_Base_Leader_05: "模板31.png", Blue_Base_Sub_05: "模板32.png",
  Green_Base_Leader_01: "模板33.png", Green_Base_Sub_01: "模板34.png",
  Green_Base_Leader_02: "模板35.png", Green_Base_Sub_02: "模板36.png",
  Green_Base_Leader_03: "模板37.png", Green_Base_Sub_03: "模板38.png",
  Green_Base_Leader_04: "模板39.png", Green_Base_Sub_04: "模板40.png",
  Green_Base_Leader_05: "模板41.png", Green_Base_Sub_05: "模板42.png",
  Purple_Base_Leader_01: "模板43.png", Purple_Base_Sub_01: "模板44.png",
  Purple_Base_Leader_02: "模板45.png", Purple_Base_Sub_02: "模板46.png",
  Purple_Base_Leader_03: "模板47.png", Purple_Base_Sub_03: "模板48.png",
  Purple_Base_Leader_04: "模板49.png", Purple_Base_Sub_04: "模板50.png",
  Purple_Base_Leader_05: "模板51.png", Purple_Base_Sub_05: "模板52.png",
};

fs.mkdirSync(OUT_DIR, { recursive: true });
let ok = 0, before = 0, after = 0;
for (const [id, src] of Object.entries(IMAGE_MAP)) {
  const sp = path.join(SRC_DIR, src);
  if (!fs.existsSync(sp)) { console.warn("! 缺少源图:", src); continue; }
  const meta = await sharp(sp).metadata();
  const svg = Buffer.from(watermarkSvg(meta.width, meta.height));
  const dp = path.join(OUT_DIR, id + ".webp");
  before += fs.statSync(sp).size;
  await sharp(sp).composite([{ input: svg, top: 0, left: 0 }]).webp({ quality: QUALITY, effort: 6 }).toFile(dp);
  after += fs.statSync(dp).size;
  ok++;
}
console.log(`已生成 ${ok} 张带水印 WebP（质量 ${QUALITY}）`);
console.log(`水印：「${WM1}」/「${WM2}」`);
console.log(`体积：${(before / 1048576).toFixed(0)}MB -> ${(after / 1048576).toFixed(1)}MB`);

// ================= 异画卡 =================
// 异画原图带 3mm 出血（成品 63×88mm，含血 69×94mm），放在 assets/ 下。
// 处理：裁掉四周出血 → 圆角(≈3mm) → 打水印 → 输出 assets/cards/<编号>_alt.webp
const FW = 744, FH = 1039;           // 成品像素（63×88mm@300ppi），与普通卡一致
const RADIUS = 34;                   // 圆角半径(≈3mm)
const ALT_SRC_DIR = path.join(ROOT, "assets");
const ALT_MAP = {
  Purple_Base_Leader_01: "紫色背景-异画.png", // 拿破仑
  Yellow_Base_Leader_01: "黄色背景-异画.png", // 莫莉
};
function roundMaskSvg(w, h, r) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`;
}
let altOk = 0;
for (const [id, file] of Object.entries(ALT_MAP)) {
  const sp = path.join(ALT_SRC_DIR, file);
  if (!fs.existsSync(sp)) { console.warn("! 缺少异画原图:", file); continue; }
  const m = await sharp(sp).metadata();
  // 按比例裁掉 3mm 出血（成品占 63/69 宽、88/94 高），居中
  const ew = Math.round(m.width * 63 / 69), eh = Math.round(m.height * 88 / 94);
  const left = Math.round((m.width - ew) / 2), top = Math.round((m.height - eh) / 2);
  const dp = path.join(OUT_DIR, id + "_alt.webp");
  await sharp(sp)
    .extract({ left, top, width: ew, height: eh })
    .resize(FW, FH)
    .composite([
      { input: Buffer.from(watermarkSvg(FW, FH)), top: 0, left: 0 },          // 水印
      { input: Buffer.from(roundMaskSvg(FW, FH, RADIUS)), blend: "dest-in" },  // 圆角裁切
    ])
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(dp);
  altOk++;
}
console.log(`异画卡：生成 ${altOk} 张（裁出血+圆角+水印）`);

// ================= 需补圆角的新卡 / 调整卡（6.22 导出为直角，744×1039 无出血）=================
// 这些卡来自后期导出（直角），统一做 3mm 圆角 + 水印；会覆盖 IMAGE_MAP 里的旧图，故放最后。
const ROUND_SRC_DIR = "h:/2025-2026项目/动物庄园/6.22";
const ROUND_RADIUS = 35;             // 3mm @ 300ppi ≈ 35px
const ROUND_MAP = {
  Yellow_SP_Leader_01: "模板21.png",    // 唐纳德鸭（SP）
  Yellow_SP_Sub_01:    "模板22.png",    // 永远在赢/边境墙（SP）
  Purple_SP_Leader_01: "模板53.png",    // 肥头（SP）
  Purple_SP_Sub_01:    "模板54.png",    // 肥头二世（SP）
  Yellow_Base_Leader_02: "模板13.png",  // 那只猫（调整）
  Yellow_Base_Leader_04: "模板17.png",  // 波拉尼奥（调整）
};
let roundOk = 0;
for (const [id, file] of Object.entries(ROUND_MAP)) {
  const sp = path.join(ROUND_SRC_DIR, file);
  if (!fs.existsSync(sp)) { console.warn("! 缺少待圆角卡图:", file); continue; }
  const m = await sharp(sp).metadata();
  await sharp(sp)
    .composite([
      { input: Buffer.from(watermarkSvg(m.width, m.height)), top: 0, left: 0 },             // 水印
      { input: Buffer.from(roundMaskSvg(m.width, m.height, ROUND_RADIUS)), blend: "dest-in" }, // 圆角
    ])
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(path.join(OUT_DIR, id + ".webp"));
  roundOk++;
}
console.log(`补圆角卡：生成 ${roundOk} 张（圆角+水印；含 SP 与调整卡）`);
console.log("接着运行 python build.py 让网站引用新图（用 python build.py --images 可一步到位）。");
