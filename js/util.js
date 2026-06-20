/* ===== 共享工具：转义 / 关键词高亮 / 卡牌分项信息 ===== */
(function () {
  "use strict";
  var KW = window.KEYWORDS || {};
  var SITE = window.SITE || {};
  var COLOR_CLASS = { "红": "red", "黄": "yellow", "蓝": "blue", "绿": "green", "紫": "purple" };

  // 卡图地址：若配置了 cdn_base（jsDelivr），相对路径前面加上 CDN 前缀（国内加速）
  var CDN = (SITE.cdn_base || "").replace(/\/+$/, "");
  function imgUrl(p) {
    if (!p || /^https?:/i.test(p)) return p;
    return CDN ? CDN + "/" + p : p;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }

  // 把效果文字里的 {关键词} 渲染成高亮，释义存 data-desc（由统一气泡显示，不用浏览器原生 title）
  function renderEffect(text) {
    if (!text) return "";
    return esc(text).replace(/\{([^}]+)\}/g, function (_, inner) {
      var base = inner.replace(/^已/, "").replace(/[0-9Xx]+$/, "");
      var desc = KW[base] || KW[inner] || "";
      var data = desc ? ' data-desc="' + esc(desc) + '"' : "";
      return '<span class="kw"' + data + ">" + esc(inner) + "</span>";
    });
  }

  // 身份图标：角色（半身像）/ 功能（文书）
  var ICON_CHAR = '<svg class="ki" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="2.6"/><path d="M3 14c0-2.9 2.2-4.8 5-4.8s5 1.9 5 4.8"/></svg>';
  var ICON_FUNC = '<svg class="ki" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="9" height="11" rx="1.3"/><path d="M5.8 6h4.4M5.8 8.4h4.4M5.8 10.8h2.8"/></svg>';

  // 三种身份：主卡·角色牌 / 副卡·角色牌 / 副卡·功能牌（无「领袖」一说，leader = 主卡）
  // 角标 = 主/副（位置）+ 角色/功能图标（类型）
  function cardKind(c) {
    var leader = c.role === "Leader";
    var func = c.type === "function";
    return {
      short: leader ? "主" : "副",
      cls: leader ? "main" : "sub",
      type: func ? "func" : "char",
      full: leader ? "主卡·角色牌" : (func ? "副卡·功能牌" : "副卡·角色牌")
    };
  }
  function typeLabel(c) { return cardKind(c).full; }
  function roleRibbon(c) {
    var k = cardKind(c);
    return '<span class="role-rib r-' + k.cls + '" title="' + esc(k.full) + '">' +
      k.short + (k.type === "func" ? ICON_FUNC : ICON_CHAR) + "</span>";
  }

  function field(label, valHtml, cost) {
    if (!valHtml) return "";
    var costHtml = (cost !== undefined && cost !== "") ? '<span class="cost">消耗 ' + esc(cost) + "</span>" : "";
    return '<div class="field"><div class="label">' + esc(label) + costHtml +
      '</div><div class="val">' + valHtml + "</div></div>";
  }

  function cardTagsHtml(c) {
    var cls = COLOR_CLASS[c.color] || "";
    var t = '<span class="tag color-' + cls + '">' + esc(c.color) + "色</span>";
    t += '<span class="tag">' + cardKind(c).full + "</span>";
    if (c.type === "character") {
      if (c.animal) t += '<span class="tag">' + esc(c.animal) + "</span>";
      if (c.recruit) t += '<span class="tag">募集 ' + esc(c.recruit) + "</span>";
    }
    if (c.tags) t += '<span class="tag">' + esc(c.tags) + "</span>";
    return t;
  }

  // 分项字段（被动/宣言 或 手段/议案），不含名称、配对、反馈
  function cardFieldsHtml(c) {
    var s = "";
    if (c.type === "character") {
      s += field("被动效果", renderEffect(c.passive));
      s += field("宣言 · " + esc(c.declName || ""), renderEffect(c.declEffect), c.declCost);
    } else {
      s += field("手段 · " + esc(c.meansName || ""), renderEffect(c.meansEffect), c.meansCost);
      s += field("议案 · " + esc(c.billName || ""), renderEffect(c.billEffect));
    }
    return s;
  }

  // 悬浮卡片信息（名称 + 标签 + 分项）
  function cardInfoHtml(c) {
    return '<div class="tt-name">' + esc(c.name) + "</div>" +
      '<div class="m-tags">' + cardTagsHtml(c) + "</div>" + cardFieldsHtml(c);
  }

  window.AF = {
    esc: esc,
    imgUrl: imgUrl,
    renderEffect: renderEffect,
    typeLabel: typeLabel,
    cardKind: cardKind,
    roleRibbon: roleRibbon,
    cardTagsHtml: cardTagsHtml,
    cardFieldsHtml: cardFieldsHtml,
    cardInfoHtml: cardInfoHtml,
    COLOR_CLASS: COLOR_CLASS
  };
})();
