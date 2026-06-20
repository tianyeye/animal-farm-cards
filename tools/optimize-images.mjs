/**
 * 卡图优化脚本（仅在美术更新卡图时才需要运行，平时改卡表/规则不用跑这个）
 *
 * 作用：把美术导出的大 PNG 压成体积约 1/7 的 WebP（同分辨率、保留透明圆角），
 *       输出到 assets/cards/<编号>.webp，供网站使用，国内加载快很多。
 *
 * 用法（在项目根目录）：
 *   1) 装一次依赖：  npm install sharp
 *   2) 运行：        node tools/optimize-images.mjs
 *
 * 如果卡图的导出顺序/数量变了，改下面的 IMAGE_MAP 即可。
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

// 美术卡图源目录（大 PNG）
const SRC_DIR = "h:/2025-2026项目/动物庄园/4.25导出_圆角";
const OUT_DIR = path.join(ROOT, "assets", "cards");
const QUALITY = 86; // WebP 质量（80~92，越大越清晰也越大）

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
  const dp = path.join(OUT_DIR, id + ".webp");
  before += fs.statSync(sp).size;
  await sharp(sp).webp({ quality: QUALITY, effort: 6 }).toFile(dp);
  after += fs.statSync(dp).size;
  ok++;
}
console.log(`已生成 ${ok} 张 WebP（质量 ${QUALITY}）`);
console.log(`体积：${(before / 1048576).toFixed(0)}MB -> ${(after / 1048576).toFixed(1)}MB`);
console.log("接着运行 python build.py 让网站引用新图。");
