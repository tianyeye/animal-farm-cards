/* ===== 动物庄园查卡站 应用逻辑 ===== */
(function () {
  "use strict";

  // 站点设置来自 config/site.txt → js/config.js（window.SITE）
  var SITE = window.SITE || {};
  // 反馈接收邮箱（FormSubmit）。激活后可换成 FormSubmit 给的哈希串以隐藏邮箱。
  var FEEDBACK_ENDPOINT = "https://formsubmit.co/ajax/" + (SITE.feedback_email || "dogtian@foxmail.com");

  var CARDS = window.CARDS || [];
  var AF = window.AF;
  var byId = {};
  CARDS.forEach(function (c) { byId[c.id] = c; });

  var COLOR_CLASS = AF.COLOR_CLASS;

  // ---------- 工具（共享自 util.js） ----------
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return AF.esc(s); }
  function renderEffect(t) { return AF.renderEffect(t); }

  // ---------- 卡牌网格 ----------
  var grid = document.getElementById("grid");
  var countEl = document.getElementById("count");
  var state = { color: "all", type: "all", q: "" };

  function cardMatches(c) {
    if (state.color !== "all" && c.color !== state.color) return false;
    if (state.type !== "all" && c.type !== state.type) return false;
    if (state.q) {
      var hay = [c.name, c.passive, c.declName, c.declEffect, c.meansName,
        c.meansEffect, c.billName, c.billEffect, c.animal, c.bound]
        .filter(Boolean).join(" ").toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function thumbHtml(c) {
    if (c.image) return '<img src="' + esc(AF.imgUrl(c.image)) + '" alt="' + esc(c.name) + '" loading="lazy">';
    return '<div class="noimg">暂无卡图<br>' + esc(c.name) + "</div>";
  }

  function render() {
    var list = CARDS.filter(cardMatches);
    grid.innerHTML = "";
    list.forEach(function (c) {
      var kind = AF.cardKind(c);
      var node = el(
        '<div class="card" data-color="' + esc(c.color) + '" data-id="' + esc(c.id) + '">' +
        '<div class="thumb">' + thumbHtml(c) + AF.roleRibbon(c) + "</div>" +
        '<div class="meta"><div class="name">' + esc(c.name) + "</div>" +
        '<div class="sub"><span class="badge">' + esc(c.color) + "</span>" +
        '<span class="badge">' + (c.type === "function" ? "副卡·功能" : (c.role === "Leader" ? "主卡·角色" : "副卡·角色")) + "</span>" +
        (c.type === "character" && c.animal ? '<span class="badge">' + esc(c.animal) + "</span>" : "") +
        "</div></div></div>"
      );
      node.addEventListener("click", function () { openModal(c.id); });
      grid.appendChild(node);
    });
    countEl.textContent = "共 " + list.length + " 张" + (state.q || state.color !== "all" || state.type !== "all" ? "（已筛选）" : "");
  }

  // ---------- 筛选交互 ----------
  function bindChips(groupId, key) {
    var group = document.getElementById(groupId);
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      group.querySelectorAll(".chip").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state[key] = btn.dataset[key] || (key === "color" ? btn.dataset.color : btn.dataset.type);
      render();
    });
  }
  bindChips("filter-color", "color");
  bindChips("filter-type", "type");
  document.getElementById("search").addEventListener("input", function (e) {
    state.q = e.target.value.trim(); render();
  });

  // ---------- 详情弹窗 ----------
  var modal = document.getElementById("modal");
  var modalBody = document.getElementById("modal-body");

  function modalHtml(c) {
    var imgHtml = c.image
      ? '<img src="' + esc(AF.imgUrl(c.image)) + '" alt="' + esc(c.name) + '">'
      : '<div class="noimg">暂无卡图</div>';

    var body = AF.cardFieldsHtml(c);

    // 配对卡
    var pair = c.pairId && byId[c.pairId];
    if (pair) {
      body += '<div class="field"><div class="label">配对卡</div><div class="val">' +
        '<span class="pair-link" data-pair="' + esc(pair.id) + '">' + esc(pair.name) + "</span>" +
        '<span class="cost">（主副绑定的另一张牌）</span></div></div>';
    } else if (c.bound) {
      body += '<div class="field"><div class="label">绑定</div><div class="val">' + esc(c.bound) + "</div></div>";
    }

    // 这张卡的常见问题（faq.md 里用「卡牌：名字」关联）
    var cardFaqs = (window.FAQ || []).filter(function (f) {
      return f.cards && f.cards.indexOf(c.name) !== -1;
    });
    if (cardFaqs.length) {
      body += '<div class="field m-faq"><div class="label">这张卡的常见问题</div>' +
        cardFaqs.map(function (f) {
          return '<div class="faq-item"><div class="faq-q"><span class="faq-qtext">' + f.q +
            "</span></div><div class=\"faq-a\">" + f.a + "</div></div>";
        }).join("") + "</div>";
    }

    // 反馈表单
    body += feedbackHtml(c);

    return (
      '<div class="m-img">' + imgHtml + "</div>" +
      '<div class="m-info c-' + esc(c.colorKey || "") + '">' +
      '<div class="m-head"><h2>' + esc(c.name) + "</h2></div>" +
      '<div class="m-tags">' + AF.cardTagsHtml(c) + "</div>" +
      body +
      "</div>"
    );
  }

  function feedbackHtml(c) {
    return (
      '<div class="fb">' +
      '<button class="fb-toggle" type="button">✎ 反馈这张卡的问题</button>' +
      '<form class="fb-form" data-card="' + esc(c.name) + '" data-id="' + esc(c.id) + '">' +
      '<label>问题类型</label>' +
      '<select name="type"><option>卡面描述与规则不符</option><option>文字 / 错别字</option>' +
      '<option>卡图问题</option><option>规则疑问</option><option>其它建议</option></select>' +
      '<label>问题描述 *</label>' +
      '<textarea name="message" required placeholder="请描述你发现的问题…"></textarea>' +
      '<label>你的邮箱（选填，方便作者回复）</label>' +
      '<input type="email" name="email" placeholder="you@example.com">' +
      '<button class="fb-submit" type="submit">提交反馈</button>' +
      '<div class="fb-msg"></div>' +
      "</form></div>"
    );
  }

  function openModal(id) {
    var c = byId[id];
    if (!c) return;
    modalBody.innerHTML = modalHtml(c);
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    // 配对卡跳转
    modalBody.querySelectorAll(".pair-link").forEach(function (a) {
      a.addEventListener("click", function () { openModal(a.dataset.pair); });
    });
    // 卡内 FAQ 折叠
    modalBody.querySelectorAll(".m-faq .faq-q").forEach(function (q) {
      q.addEventListener("click", function () { q.parentElement.classList.toggle("open"); });
    });
    // 反馈展开
    var toggle = modalBody.querySelector(".fb-toggle");
    var form = modalBody.querySelector(".fb-form");
    toggle.addEventListener("click", function () { form.classList.toggle("open"); });
    form.addEventListener("submit", submitFeedback);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  // ---------- 反馈提交（FormSubmit AJAX）----------
  function submitFeedback(e) {
    e.preventDefault();
    var form = e.target;
    var msg = form.querySelector(".fb-msg");
    var btn = form.querySelector(".fb-submit");
    var payload = {
      _subject: "【动物庄园查卡】卡牌反馈：" + form.dataset.card,
      卡牌: form.dataset.card + "（" + form.dataset.id + "）",
      问题类型: form.type.value,
      问题描述: form.message.value,
      反馈者邮箱: form.email.value || "（未填写）"
    };
    btn.disabled = true;
    msg.className = "fb-msg";
    msg.textContent = "提交中…";

    fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function () {
        msg.className = "fb-msg ok";
        msg.textContent = "✓ 反馈已提交，谢谢你！（如果需要更及时的回复，请加官方QQ群：1084138439）";
        form.reset();
        btn.disabled = false;
      })
      .catch(function () {
        msg.className = "fb-msg err";
        msg.innerHTML = "✗ 提交失败，可直接邮件联系：<a href=\"mailto:dogtian@foxmail.com?subject=" +
          encodeURIComponent("动物庄园卡牌反馈：" + form.dataset.card) + "\">dogtian@foxmail.com</a>";
        btn.disabled = false;
      });
  }

  // ---------- 文档（规则书 / FAQ）----------
  function renderRules() {
    var doc = document.getElementById("rules-doc");
    doc.innerHTML = window.RULES_HTML; // 关键词已由 build.py 预先高亮
    // 关键词速查表
    var g = doc.querySelector("#glossary");
    var KW = window.KEYWORDS || {};
    if (g) {
      Object.keys(KW).forEach(function (k) {
        g.appendChild(el('<div class="gi"><b>' + esc(k) + "</b>：" + esc(KW[k]) + "</div>"));
      });
    }
    buildToc(doc);
  }

  // 规则书左侧分级目录
  function buildToc(doc) {
    var toc = document.getElementById("rules-toc");
    if (!toc) return;
    toc.innerHTML = '<div class="toc-title">目录</div>';
    var heads = doc.querySelectorAll("h2, h3, h4");
    var links = [];
    heads.forEach(function (h, i) {
      if (!h.id) h.id = "rule-sec-" + i;
      var lvl = h.tagName.toLowerCase(); // h2/h3/h4
      var a = el('<a class="toc-link toc-' + lvl + '" href="#' + h.id + '">' + esc(h.textContent) + "</a>");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + h.id);
      });
      toc.appendChild(a);
      links.push({ h: h, a: a });
    });
    // 滚动高亮当前章节
    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { l.a.classList.toggle("active", l.h === en.target); });
        });
      }, { rootMargin: "-72px 0px -70% 0px", threshold: 0 });
      links.forEach(function (l) { obs.observe(l.h); });
    }
  }

  // 一条 FAQ 折叠项（q/a 已是 build 生成的 HTML，直接插入，勿再转义）
  function faqItemNode(item) {
    var node = el('<div class="faq-item"><div class="faq-q"><span class="faq-qtext">' + item.q +
      "</span></div><div class=\"faq-a\">" + item.a + "</div></div>");
    node.querySelector(".faq-q").addEventListener("click", function () { node.classList.toggle("open"); });
    return node;
  }

  var faqCat = "all";
  function renderFaq() {
    var doc = document.getElementById("faq-doc");
    var faqs = window.FAQ || [];
    var cats = [];
    faqs.forEach(function (f) { if (f.cat && cats.indexOf(f.cat) === -1) cats.push(f.cat); });
    var chips = '<button class="chip' + (faqCat === "all" ? " active" : "") + '" data-cat="all">全部</button>' +
      cats.map(function (c) {
        return '<button class="chip' + (faqCat === c ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
      }).join("");
    doc.innerHTML = '<h2>常见问题 FAQ</h2>' +
      (cats.length ? '<div class="faq-filter filter-group">' + chips + "</div>" : "") +
      '<div class="faq-list" id="faq-list"></div>';
    var list = doc.querySelector("#faq-list");
    faqs.filter(function (f) { return faqCat === "all" || f.cat === faqCat; })
      .forEach(function (item) { list.appendChild(faqItemNode(item)); });
    var filter = doc.querySelector(".faq-filter");
    if (filter) filter.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      faqCat = b.dataset.cat; renderFaq();
    });
  }

  // ---------- 标签页 ----------
  var tabs = document.getElementById("tabs");
  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    var view = btn.dataset.view;
    tabs.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b === btn); });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    window.scrollTo(0, 0);
  });

  // ---------- 关键词释义气泡（统一 UI 风格，替代浏览器原生 title）----------
  (function setupKwTip() {
    var tip = document.getElementById("kw-tip");
    if (!tip) return;
    var cur = null;
    function show(kw) {
      var d = kw.getAttribute("data-desc");
      if (!d) return;
      tip.textContent = d; tip.hidden = false; cur = kw;
      var r = kw.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, pad = 8;
      var L = r.left + r.width / 2 - w / 2;
      L = Math.max(8, Math.min(L, window.innerWidth - w - 8));
      var T = r.top - h - pad;
      if (T < 8) T = r.bottom + pad;
      tip.style.left = L + "px"; tip.style.top = T + "px";
    }
    function hide() { tip.hidden = true; cur = null; }
    document.addEventListener("mouseover", function (e) {
      var kw = e.target.closest && e.target.closest(".kw[data-desc]");
      if (kw && kw !== cur) show(kw);
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(".kw[data-desc]")) hide();
    });
    document.addEventListener("scroll", hide, true);
  })();

  // ---------- 卡牌引用 [[卡名]] 悬浮：显示整张卡详情（与组卡悬浮一致）----------
  (function setupCardRef() {
    var tip = document.getElementById("card-tip");
    if (!tip) return;
    var byName = {};
    CARDS.forEach(function (c) { byName[c.name] = c; });
    var cur = null;
    function show(elm, x, y) {
      var c = byName[elm.getAttribute("data-card")];
      if (!c) { hide(); return; }
      if (elm !== cur) { tip.innerHTML = AF.cardInfoHtml(c); cur = elm; tip.hidden = false; }
      var pad = 16, w = tip.offsetWidth, h = tip.offsetHeight;
      var L = x + pad, T = y + pad;
      if (L + w > window.innerWidth - 8) L = x - w - pad;
      if (L < 8) L = 8;
      if (T + h > window.innerHeight - 8) T = window.innerHeight - h - 8;
      if (T < 8) T = 8;
      tip.style.left = L + "px"; tip.style.top = T + "px";
    }
    function hide() { if (cur) { tip.hidden = true; cur = null; } }
    document.addEventListener("mousemove", function (e) {
      var el = e.target.closest && e.target.closest(".cardref[data-card]");
      if (el) show(el, e.clientX, e.clientY); else hide();
    });
    document.addEventListener("scroll", hide, true);
  })();

  // ---------- 应用站点设置（来自 config/site.txt）----------
  function applySite() {
    function setText(id, v) { var n = document.getElementById(id); if (n && v) n.textContent = v; }
    if (SITE.title) { document.title = SITE.title; setText("site-title", SITE.title); }
    setText("site-subtitle", SITE.subtitle);
    setText("site-footer-1", SITE.footer1);
    setText("site-footer-2", SITE.footer2);
  }

  // ---------- 启动 ----------
  applySite();
  render();
  renderRules();
  renderFaq();
})();
