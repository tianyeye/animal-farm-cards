/* ===== 组卡系统（标准 / 乱局）· 本地保存 · 列表/大图 · 悬浮详情 · 导出拼版 ===== */
(function () {
  "use strict";

  var AF = window.AF;
  var CARDS = window.CARDS || [];
  var byId = {};
  CARDS.forEach(function (c) { byId[c.id] = c; });

  var COLOR_ORDER = { "红": 0, "黄": 1, "蓝": 2, "绿": 3, "紫": 4 };
  var COLOR_CLASS = AF.COLOR_CLASS;
  var STORE_KEY = "af_decks_v1";

  var STD_LEADERS = 5, CHAOS_MIN = 20, MAX_COPIES = 2;

  // 拼版尺寸：卡图原生 744×1039 = 300ppi 下 63×88mm（标准扑克）
  var CARD_W_MM = 63, CARD_H_MM = 88;
  var CARD_W_PX = 744, CARD_H_PX = 1039;

  var leaders = CARDS.filter(function (c) { return c.role === "Leader"; }).sort(cmpCard);
  var allCards = CARDS.slice().sort(cmpCard);

  function cmpCard(a, b) {
    var ca = COLOR_ORDER[a.color], cb = COLOR_ORDER[b.color];
    ca = ca == null ? 9 : ca; cb = cb == null ? 9 : cb;
    if (ca !== cb) return ca - cb;
    var sa = /_SP_/.test(a.id) ? 1 : 0, sb = /_SP_/.test(b.id) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    var na = a.id.split("_").pop(), nb = b.id.split("_").pop();
    if (na !== nb) return na < nb ? -1 : 1;
    return (/_Sub_/.test(a.id) ? 1 : 0) - (/_Sub_/.test(b.id) ? 1 : 0);
  }

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  var esc = AF.esc;
  function $(id) { return document.getElementById(id); }

  function thumb(c) {
    return c.image
      ? '<img src="' + esc(AF.imgUrl(c.image)) + '" alt="' + esc(c.name) + '" loading="lazy">'
      : '<div class="noimg">暂无图<br>' + esc(c.name) + "</div>";
  }
  function dot(c) { return '<span class="cdot c-' + (COLOR_CLASS[c.color] || "") + '"></span>'; }
  var roleRibbon = AF.roleRibbon;
  // 配对卡小链接（带 ⇄，悬浮可看配对卡详情）
  function partnerChip(p) { return '<span class="pair-chip" data-tip-id="' + esc(p.id) + '">⇄ ' + esc(p.name) + "</span>"; }

  // ---- 状态 ----
  var DB = {
    mode: "standard", view: "grid", color: "all",
    showSub: false, std: [], chaos: {}, editingId: null, msg: ""
  };

  // ====================== 卡池 ======================
  function renderPool() {
    var grid = $("pool-grid");
    grid.className = "pool-grid " + (DB.view === "list" ? "as-list" : "as-grid");
    grid.innerHTML = "";
    var list = (DB.mode === "standard" ? leaders : allCards).filter(function (c) {
      return DB.color === "all" || c.color === DB.color;
    });

    list.forEach(function (c) {
      var node = DB.mode === "standard" ? poolStd(c) : poolChaos(c);
      grid.appendChild(node);
    });
  }

  function poolStd(leader) {
    // 显示卡：看副卡时显示其副牌，但选择始终作用于主卡
    var sub = byId[leader.pairId];
    var disp = (DB.showSub && sub) ? sub : leader;
    var partner = (disp === leader) ? sub : leader;
    var on = DB.std.indexOf(leader.id) !== -1;
    var sp = /_SP_/.test(leader.id) ? '<span class="badge sp">SP</span>' : "";
    var recruit = (disp.type === "character" && disp.recruit) ? '<span class="badge">募' + esc(disp.recruit) + "</span>" : "";
    if (DB.view === "list") {
      var node = el(
        '<div class="pool-row' + (on ? " on" : "") + '" data-color="' + esc(leader.color) + '" data-id="' + esc(leader.id) + '" data-tip-id="' + esc(disp.id) + '">' +
        dot(disp) + roleRibbon(disp) + '<span class="pr-name">' + esc(disp.name) + "</span>" +
        (partner ? partnerChip(partner) : "") +
        '<span class="pr-meta">' + sp + "</span>" +
        '<span class="pr-check">' + (on ? "✓" : "＋") + "</span></div>"
      );
      node.addEventListener("click", function () { toggleStd(leader.id); });
      return node;
    }
    var card = el(
      '<div class="pool-card' + (on ? " on" : "") + '" data-color="' + esc(leader.color) + '" data-id="' + esc(leader.id) + '">' +
      '<div class="pc-thumb" data-tip-id="' + esc(disp.id) + '">' + thumb(disp) + roleRibbon(disp) + (on ? '<span class="pc-check">✓</span>' : "") + "</div>" +
      '<div class="pc-meta"><div class="pc-name">' + esc(disp.name) + "</div>" +
      '<div class="pc-sub">' + sp + recruit + (partner ? partnerChip(partner) : "") + "</div></div></div>"
    );
    card.addEventListener("click", function () { toggleStd(leader.id); });
    return card;
  }

  function poolChaos(c) {
    var cnt = DB.chaos[c.id] || 0;
    if (DB.view === "list") {
      var node = el(
        '<div class="pool-row chaos' + (cnt ? " on" : "") + '" data-color="' + esc(c.color) + '" data-id="' + esc(c.id) + '" data-tip-id="' + esc(c.id) + '">' +
        dot(c) + roleRibbon(c) + '<span class="pr-name">' + esc(c.name) + "</span>" +
        '<span class="pr-step"><button class="step minus"' + (cnt ? "" : " disabled") + ">−</button>" +
        '<span class="cnt">' + cnt + "</span>" +
        '<button class="step plus"' + (cnt >= MAX_COPIES ? " disabled" : "") + ">＋</button></span></div>"
      );
      node.addEventListener("click", function () { changeChaos(c.id, +1); });
      node.querySelector(".plus").addEventListener("click", function (e) { e.stopPropagation(); changeChaos(c.id, +1); });
      node.querySelector(".minus").addEventListener("click", function (e) { e.stopPropagation(); changeChaos(c.id, -1); });
      return node;
    }
    var card = el(
      '<div class="pool-card chaos' + (cnt ? " on" : "") + '" data-color="' + esc(c.color) + '" data-id="' + esc(c.id) + '">' +
      '<div class="pc-thumb" data-tip-id="' + esc(c.id) + '">' + thumb(c) + roleRibbon(c) + (cnt ? '<span class="pc-count">×' + cnt + "</span>" : "") + "</div>" +
      '<div class="pc-meta"><div class="pc-name">' + esc(c.name) + "</div>" +
      '<div class="pc-step"><button class="step minus"' + (cnt ? "" : " disabled") + ">−</button>" +
      '<span class="cnt">' + cnt + "/" + MAX_COPIES + "</span>" +
      '<button class="step plus"' + (cnt >= MAX_COPIES ? " disabled" : "") + ">＋</button></div></div></div>"
    );
    card.addEventListener("click", function () { changeChaos(c.id, +1); }); // 点卡=加1（与标准一致）
    card.querySelector(".plus").addEventListener("click", function (e) { e.stopPropagation(); changeChaos(c.id, +1); });
    card.querySelector(".minus").addEventListener("click", function (e) { e.stopPropagation(); changeChaos(c.id, -1); });
    return card;
  }

  // ====================== 增删 ======================
  function toggleStd(id) {
    var i = DB.std.indexOf(id);
    if (i !== -1) { DB.std.splice(i, 1); DB.msg = ""; }
    else {
      if (DB.std.length >= STD_LEADERS) { DB.msg = "标准模式最多 " + STD_LEADERS + " 张主卡。"; renderStatus(); return; }
      DB.std.push(id); DB.msg = "";
    }
    renderAll();
  }
  function changeChaos(id, d) {
    var next = Math.max(0, Math.min(MAX_COPIES, (DB.chaos[id] || 0) + d));
    if (next === 0) delete DB.chaos[id]; else DB.chaos[id] = next;
    renderAll();
  }

  // ====================== 当前牌组 ======================
  function deckCardCount() {
    if (DB.mode === "standard") return DB.std.length * 2;
    return Object.keys(DB.chaos).reduce(function (s, k) { return s + DB.chaos[k]; }, 0);
  }
  function colorBreakdown() {
    var t = {};
    if (DB.mode === "standard") {
      DB.std.forEach(function (id) {
        [byId[id], byId[byId[id].pairId]].forEach(function (c) { if (c) t[c.color] = (t[c.color] || 0) + 1; });
      });
    } else {
      Object.keys(DB.chaos).forEach(function (id) { t[byId[id].color] = (t[byId[id].color] || 0) + DB.chaos[id]; });
    }
    return t;
  }
  function isValid() {
    return DB.mode === "standard" ? DB.std.length === STD_LEADERS : deckCardCount() >= CHAOS_MIN;
  }

  function renderStatus() {
    var n = deckCardCount(), valid = isValid(), line;
    if (DB.mode === "standard") line = "主卡 <b>" + DB.std.length + "/" + STD_LEADERS + "</b> · 共 " + n + " 张";
    else line = "卡牌 <b>" + n + "</b> 张（需 ≥ " + CHAOS_MIN + "）· " + Object.keys(DB.chaos).length + " 种";

    var t = colorBreakdown();
    var bars = ["红", "黄", "蓝", "绿", "紫"].filter(function (c) { return t[c]; }).map(function (c) {
      return '<span class="cbar c-' + COLOR_CLASS[c] + '" style="flex:' + t[c] + '" title="' + c + " " + t[c] + '">' + c + t[c] + "</span>";
    }).join("");

    $("deck-status").innerHTML =
      '<div class="ds-line ' + (valid ? "ok" : "warn") + '">' + line +
      '<span class="ds-flag">' + (valid ? "✓ 合法" : "✗ 不合法") + "</span></div>" +
      (bars ? '<div class="cbars">' + bars + "</div>" : "") +
      (DB.msg ? '<div class="ds-msg">' + esc(DB.msg) + "</div>" : "");
    var fc = $("deck-fab-count"); if (fc) fc.textContent = n;  // 移动端抽屉按钮上的张数
  }

  function renderDeckList() {
    var box = $("deck-list");
    box.innerHTML = "";
    if (DB.mode === "standard") {
      if (!DB.std.length) { box.innerHTML = '<p class="empty">从左侧点选 5 张主卡（自动带入主+副两张牌）。</p>'; return; }
      DB.std.forEach(function (id) {
        var l = byId[id], p = byId[l.pairId];
        var row = el(
          '<div class="dl-pair" data-color="' + esc(l.color) + '">' +
          '<div class="dlp-line" data-tip-id="' + esc(l.id) + '">' + roleRibbon(l) + '<span class="dlp-name">' + esc(l.name) + "</span></div>" +
          (p ? '<div class="dlp-line dlp-sub" data-tip-id="' + esc(p.id) + '">' + roleRibbon(p) + '<span class="dlp-name">' + esc(p.name) + "</span></div>" : "") +
          '<button class="dl-x" title="移除整组">×</button></div>'
        );
        row.querySelector(".dl-x").addEventListener("click", function () { toggleStd(id); });
        box.appendChild(row);
      });
    } else {
      var ids = Object.keys(DB.chaos).sort(function (a, b) { return cmpCard(byId[a], byId[b]); });
      if (!ids.length) { box.innerHTML = '<p class="empty">从左侧把卡加入牌组（每张最多 ' + MAX_COPIES + ' 张，总数 ≥ ' + CHAOS_MIN + '）。</p>'; return; }
      ids.forEach(function (id) {
        var c = byId[id];
        var row = el(
          '<div class="dl-row" data-color="' + esc(c.color) + '" data-tip-id="' + esc(c.id) + '">' +
          '<span class="dl-cnt">×' + DB.chaos[id] + "</span>" +
          '<span class="dl-name">' + esc(c.name) + "</span>" +
          '<span class="dl-type">' + AF.typeLabel(c) + "</span>" +
          '<button class="dl-x" title="移除">×</button></div>'
        );
        row.querySelector(".dl-x").addEventListener("click", function () { delete DB.chaos[id]; renderAll(); });
        box.appendChild(row);
      });
    }
  }

  // ====================== 悬浮详情 tooltip ======================
  var tipId = null;
  function tipBox() { return $("card-tip"); }
  function showTip(id, x, y) {
    var tipEl = tipBox(); if (!tipEl) return;
    var c = byId[id]; if (!c) { hideTip(); return; }
    if (id !== tipId) { tipEl.innerHTML = AF.cardInfoHtml(c); tipId = id; tipEl.hidden = false; }
    var pad = 16, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var L = x + pad, T = y + pad;
    if (L + w > window.innerWidth - 8) L = x - w - pad;
    if (L < 8) L = 8;
    if (T + h > window.innerHeight - 8) T = window.innerHeight - h - 8;
    if (T < 8) T = 8;
    tipEl.style.left = L + "px"; tipEl.style.top = T + "px";
  }
  function hideTip() { var t = tipBox(); if (t) t.hidden = true; tipId = null; }
  function bindTips(box) {
    box.addEventListener("pointermove", function (e) {
      var t = e.target.closest("[data-tip-id]");
      if (!t || !box.contains(t)) { hideTip(); return; }
      showTip(t.getAttribute("data-tip-id"), e.clientX, e.clientY);
    });
    box.addEventListener("pointerleave", hideTip);
    box.addEventListener("scroll", hideTip, true);
  }

  // ====================== 本地存档 ======================
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; } }
  function writeStore(a) { try { localStorage.setItem(STORE_KEY, JSON.stringify(a)); return true; } catch (e) { alert("保存失败：本地存储不可用（隐私模式？）。"); return false; } }
  function newId() { return "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  function saveDeck() {
    var name = $("deck-name").value.trim();
    if (!name) { DB.msg = "请先给牌组起个名字。"; renderStatus(); $("deck-name").focus(); return; }
    var arr = loadStore();
    var rec = {
      id: DB.editingId || newId(), name: name, mode: DB.mode,
      std: DB.std.slice(), chaos: Object.assign({}, DB.chaos),
      cards: deckCardCount(), updatedAt: new Date().toISOString()
    };
    var idx = arr.findIndex(function (d) { return d.id === rec.id; });
    if (idx >= 0) arr[idx] = rec; else arr.unshift(rec);
    if (writeStore(arr)) { DB.editingId = rec.id; DB.msg = "已保存：" + name; renderStatus(); renderSaved(); }
  }
  function loadDeck(id) {
    var d = loadStore().find(function (x) { return x.id === id; });
    if (!d) return;
    DB.mode = d.mode; DB.std = (d.std || []).slice(); DB.chaos = Object.assign({}, d.chaos || {});
    DB.editingId = d.id; DB.color = "all"; DB.showSub = false; DB.msg = "已载入：" + d.name;
    $("deck-name").value = d.name; $("sub-toggle").checked = false;
    syncModeButtons(); syncColorChips(); renderAll(); renderSaved();
  }
  function deleteDeck(id) {
    if (!confirm("确定删除这个牌组？")) return;
    writeStore(loadStore().filter(function (x) { return x.id !== id; }));
    if (DB.editingId === id) DB.editingId = null;
    renderSaved();
  }
  function renderSaved() {
    var box = $("saved-list"), arr = loadStore();
    box.innerHTML = "";
    if (!arr.length) { box.innerHTML = '<p class="empty">还没有保存的牌组。</p>'; return; }
    arr.forEach(function (d) {
      var row = el(
        '<div class="sv-row' + (d.id === DB.editingId ? " active" : "") + '">' +
        '<div class="sv-info"><span class="sv-name">' + esc(d.name) + "</span>" +
        '<span class="sv-meta">' + (d.mode === "standard" ? "标准" : "乱局") + " · " + (d.cards || 0) + " 张</span></div>" +
        '<div class="sv-btns"><button class="sv-load">载入</button><button class="sv-del">删除</button></div>' +
        "</div>"
      );
      row.querySelector(".sv-load").addEventListener("click", function () { loadDeck(d.id); });
      row.querySelector(".sv-del").addEventListener("click", function () { deleteDeck(d.id); });
      box.appendChild(row);
    });
  }

  // ====================== 导出拼版 ======================
  function deckPhysicalCards() {
    var out = [];
    if (DB.mode === "standard") {
      DB.std.forEach(function (id) { var l = byId[id], p = byId[l.pairId]; out.push(l); if (p) out.push(p); });
    } else {
      Object.keys(DB.chaos).sort(function (a, b) { return cmpCard(byId[a], byId[b]); })
        .forEach(function (id) { for (var k = 0; k < DB.chaos[id]; k++) out.push(byId[id]); });
    }
    return out;
  }
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      // 走 CDN 时需要匿名跨域，否则导出会污染画布；jsDelivr 带 CORS 头，安全
      if (/^https?:/i.test(src)) im.crossOrigin = "anonymous";
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error("无法加载图片：" + src)); };
      im.src = src;
    });
  }
  function deckName() { return ($("deck-name").value.trim() || "未命名牌组"); }
  function exMsg(s, err) { var m = $("export-msg"); m.textContent = s || ""; m.className = "export-msg" + (err ? " err" : ""); }
  // file:// 下浏览器会污染画布导致无法导出，提前拦截并给出清晰指引
  function fileProtocolBlocked() {
    if (location.protocol === "file:") {
      exMsg("无法导出：你是直接双击网页打开的(file://)。请改用本地服务器——双击根目录的 start.bat，或运行 python -m http.server 后访问 http://localhost:8000。线上(GitHub Pages)则正常。", true);
      return true;
    }
    return false;
  }
  function downloadBlob(blob, fn) {
    var a = document.createElement("a"), url = URL.createObjectURL(blob);
    a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function drawPlaceholderCtx(ctx, x, y, w, h, c) {
    ctx.fillStyle = "#222"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#555"; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = "#ccc"; ctx.font = "bold " + Math.round(w / 9) + "px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.name, x + w / 2, y + h / 2);
  }

  // 1) TTS：每行 5 张，无缝拼版，PNG
  function exportTTS() {
    var cards = deckPhysicalCards();
    if (!cards.length) { exMsg("牌组是空的。", true); return; }
    if (fileProtocolBlocked()) return;
    exMsg("正在生成 TTS 图包…");
    var cols = 5, rows = Math.ceil(cards.length / cols);
    var cv = document.createElement("canvas");
    cv.width = cols * CARD_W_PX; cv.height = rows * CARD_H_PX;
    var ctx = cv.getContext("2d");
    var jobs = cards.map(function (c, i) {
      var x = (i % cols) * CARD_W_PX, y = Math.floor(i / cols) * CARD_H_PX;
      if (!c.image) { drawPlaceholderCtx(ctx, x, y, CARD_W_PX, CARD_H_PX, c); return Promise.resolve(); }
      return loadImg(AF.imgUrl(c.image)).then(function (im) { ctx.drawImage(im, x, y, CARD_W_PX, CARD_H_PX); });
    });
    Promise.all(jobs).then(function () {
      cv.toBlob(function (b) {
        if (!b) { exMsg("生成失败（本地 file:// 打开时浏览器会污染画布，请用本地服务器或线上访问）。", true); return; }
        downloadBlob(b, deckName() + "_TTS_" + cols + "x" + rows + ".png");
        exMsg("✓ 已导出 TTS 图包（" + cols + "×" + rows + "，共 " + cards.length + " 张）");
      }, "image/png");
    }).catch(function (e) { exMsg("生成失败：" + e.message, true); });
  }

  // 2) A4 打印：300ppi、每页 3×3=9 张、含裁切线、PDF
  function exportPDF() {
    var cards = deckPhysicalCards();
    if (!cards.length) { exMsg("牌组是空的。", true); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { exMsg("PDF 组件未加载。", true); return; }
    if (fileProtocolBlocked()) return;
    exMsg("正在生成 A4 打印 PDF…");
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var cols = 3, rows = 3, per = 9;
    var gw = cols * CARD_W_MM, gh = rows * CARD_H_MM;
    var mx = (210 - gw) / 2, my = (297 - gh) / 2;

    var jobs = cards.map(function (c) { return c.image ? loadImg(AF.imgUrl(c.image)).then(function (im) { return { c: c, im: im }; }, function () { return { c: c, im: null }; }) : Promise.resolve({ c: c, im: null }); });
    Promise.all(jobs).then(function (items) {
      for (var i = 0; i < items.length; i++) {
        if (i > 0 && i % per === 0) doc.addPage();
        var idx = i % per, col = idx % cols, row = Math.floor(idx / cols);
        var x = mx + col * CARD_W_MM, y = my + row * CARD_H_MM;
        if (idx === 0) drawCutLines(doc, mx, my, gw, gh, cols, rows);
        var it = items[i];
        if (it.im) { try { doc.addImage(it.im, "PNG", x, y, CARD_W_MM, CARD_H_MM); } catch (e) { drawPlaceholderPdf(doc, x, y, it.c); } }
        else drawPlaceholderPdf(doc, x, y, it.c);
      }
      doc.save(deckName() + "_A4打印.pdf");
      exMsg("✓ 已导出 A4 打印 PDF（共 " + cards.length + " 张 / " + Math.ceil(cards.length / per) + " 页）");
    }).catch(function (e) { exMsg("生成失败：" + e.message, true); });
  }
  function drawCutLines(doc, mx, my, gw, gh, cols, rows) {
    doc.setDrawColor(180); doc.setLineWidth(0.1);
    for (var c = 0; c <= cols; c++) doc.line(mx + c * CARD_W_MM, my - 4, mx + c * CARD_W_MM, my + gh + 4);
    for (var r = 0; r <= rows; r++) doc.line(mx - 4, my + r * CARD_H_MM, mx + gw + 4, my + r * CARD_H_MM);
  }
  function drawPlaceholderPdf(doc, x, y, c) {
    doc.setFillColor(235); doc.rect(x, y, CARD_W_MM, CARD_H_MM, "F");
    doc.setTextColor(90); doc.setFontSize(10);
    doc.text(String(c.name), x + CARD_W_MM / 2, y + CARD_H_MM / 2, { align: "center" });
    doc.setTextColor(0);
  }

  function syncExportButtons() {
    var empty = deckPhysicalCards().length === 0;
    $("export-pdf").disabled = empty; $("export-tts").disabled = empty;
  }

  // ====================== 模式 / 视图 / 颜色 ======================
  function setMode(m) {
    if (DB.mode === m) return;
    DB.mode = m; DB.color = "all"; DB.msg = ""; DB.editingId = null; DB.showSub = false;
    $("sub-toggle").checked = false;
    syncModeButtons(); syncColorChips(); renderAll(); renderSaved();
  }
  function syncModeButtons() {
    document.querySelectorAll("#mode-seg .seg-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === DB.mode); });
    // 乱局模式：「看副卡」不适用 —— 置灰禁用而非隐藏
    var dis = DB.mode !== "standard";
    $("sub-toggle-wrap").classList.toggle("disabled", dis);
    $("sub-toggle").disabled = dis;
    if (dis) { $("sub-toggle").checked = false; DB.showSub = false; }
    $("mode-hint").textContent = DB.mode === "standard"
      ? "主副绑定 · 选 5 张主卡（10 张）"
      : "解绑 · 每卡 ≤2 张 · ≥20 张";
  }
  function syncColorChips() {
    document.querySelectorAll("#deck-filter-color .chip").forEach(function (b) { b.classList.toggle("active", b.dataset.color === DB.color); });
  }
  function syncViewButtons() {
    document.querySelectorAll("#view-seg .seg-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.vm === DB.view); });
  }

  function renderAll() { renderPool(); renderStatus(); renderDeckList(); syncExportButtons(); }
  function newDeck() { DB.std = []; DB.chaos = {}; DB.editingId = null; DB.msg = ""; $("deck-name").value = ""; exMsg(""); renderAll(); renderSaved(); }
  function clearDeck() { if (DB.mode === "standard") DB.std = []; else DB.chaos = {}; DB.msg = ""; renderAll(); }

  // ====================== 初始化 ======================
  function init() {
    $("mode-seg").addEventListener("click", function (e) { var b = e.target.closest(".seg-btn"); if (b) setMode(b.dataset.mode); });
    $("view-seg").addEventListener("click", function (e) {
      var b = e.target.closest(".seg-btn"); if (!b || b.dataset.vm === DB.view) return;
      DB.view = b.dataset.vm; syncViewButtons(); renderPool();
    });
    $("sub-toggle").addEventListener("change", function (e) { DB.showSub = e.target.checked; renderPool(); });
    $("deck-filter-color").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      DB.color = b.dataset.color; syncColorChips(); renderPool();
    });
    $("deck-save").addEventListener("click", saveDeck);
    $("deck-new").addEventListener("click", newDeck);
    $("deck-clear").addEventListener("click", clearDeck);
    $("deck-name").addEventListener("keydown", function (e) { if (e.key === "Enter") saveDeck(); });
    $("export-pdf").addEventListener("click", exportPDF);
    $("export-tts").addEventListener("click", exportTTS);

    // 移动端：右侧抽屉开关
    var dside = document.querySelector(".deck-side");
    function setDrawer(open) {
      dside.classList.toggle("open", open);
      $("deck-backdrop").classList.toggle("show", open);
    }
    $("deck-fab").addEventListener("click", function () { setDrawer(!dside.classList.contains("open")); });
    $("deck-backdrop").addEventListener("click", function () { setDrawer(false); });

    bindTips($("pool-grid")); bindTips($("deck-list"));

    syncModeButtons(); syncColorChips(); syncViewButtons(); renderAll(); renderSaved();
  }
  init();
})();
