/* =====================================================================
   柠柒. 的个人主页 —— 渲染逻辑

   这个文件负责「把 data.js 里的内容画成页面」，以及那几处动效。
   改内容请改 data.js；这里一般不用动。
   ===================================================================== */

(function () {
  "use strict";

  var app = document.getElementById("app");
  var root = document.documentElement;
  var D = window.SITE;

  /* ---------------- 动效开关 ---------------- */

  function mediaOk(query) {
    try {
      return window.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  }

  // 三个条件同时满足才开动效：data.js 里没关、系统没要求减少动效、支持需要的 API
  var MOTION = !(D && D.motion === false) && !mediaOk("(prefers-reduced-motion: reduce)");

  /* ---------------- 小工具 ---------------- */

  // 把文字里的特殊符号转义，防止用户输入打坏页面结构
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 只放行 http/https/mailto/tel 和站内相对路径，挡掉 javascript: 之类
  function safeUrl(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^(\/|\.\/)[^\s]*$/.test(u)) return u;
    return "";
  }

  function arr(v) {
    return Array.isArray(v) ? v : [];
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list || [], fn);
  }

  function errorBox(title, hint) {
    return (
      '<div class="error">' +
        '<p class="error__title">' + esc(title) + "</p>" +
        "<p>" + esc(hint) + "</p>" +
        "<p>最常见的原因是 <code>data.js</code> 里用了中文标点：" +
        "引号要英文的 <code>\"</code>，逗号要英文的 <code>,</code>。</p>" +
      "</div>"
    );
  }

  /* ---------------- 图标（内联 SVG，不依赖图标库） ---------------- */

  var ICON = {
    blocks:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2.6 21 7.4v9.2L12 21.4 3 16.6V7.4z"/><path d="m3 7.4 9 4.8 9-4.8"/><path d="M12 12.2v9.2"/></svg>',
    crosshair:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="7.6"/><path d="M12 1.8v4.3M12 17.9v4.3M1.8 12h4.3M17.9 12h4.3"/>' +
      '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l.9.9.9-.9a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5z"/></svg>',
    dot:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/></svg>',
    link:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2"/>' +
      '<path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2"/></svg>'
  };

  function icon(name) {
    return ICON[name] || ICON.dot;
  }

  /* ---------------- 区块拼装 ---------------- */

  // 名字拆成单字，好做「逐字浮现」。遇到 emoji 这类不能拆的直接整句输出。
  function nameMarkup(name) {
    var s = String(name == null ? "" : name);
    if (!s || /[\uD800-\uDFFF]/.test(s)) return esc(s);

    var out = "";
    for (var i = 0; i < s.length; i++) {
      out += '<span class="char" style="--i:' + i + '" aria-hidden="true">' + esc(s.charAt(i)) + "</span>";
    }
    return out;
  }

  function hero() {
    var tags = arr(D.tags).filter(Boolean);
    return (
      '<header class="hero">' +
        '<div class="avatar">' +
          '<img src="' + esc(D.avatar || "img/avatar.jpg") + '"' +
          ' alt="' + esc(D.name) + ' 的头像" width="176" height="176"' +
          ' fetchpriority="high" decoding="async">' +
        "</div>" +
        '<h1 class="name" aria-label="' + esc(D.name) + '">' + nameMarkup(D.name) + "</h1>" +
        (D.signature ? '<p class="signature">' + esc(D.signature) + "</p>" : "") +
        (tags.length
          ? '<ul class="tags">' +
            tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
            "</ul>"
          : "") +
      "</header>"
    );
  }

  function section(title, body) {
    // __INDEX__ 是占位符，最后按各分区出现的顺序统一填 01 / 02 / 03
    return (
      '<section class="block">' +
        '<div class="block__head">' +
          '<span class="block__index">__INDEX__</span>' +
          '<h2 class="block__title">' + esc(title) + "</h2>" +
        "</div>" +
        body +
      "</section>"
    );
  }

  function sectionFacts() {
    var items = arr(D.facts).filter(function (f) { return f && (f.label || f.value); });
    if (!items.length) return "";
    return section("关于", '<div class="stats">' + items.map(function (f) {
      return (
        '<div class="stat">' +
          '<span class="stat__value">' + esc(f.value) + "</span>" +
          '<span class="stat__label">' + esc(f.label) + "</span>" +
        "</div>"
      );
    }).join("") + "</div>");
  }

  function sectionHobbies() {
    var items = arr(D.hobbies).filter(function (h) { return h && h.name; });
    if (!items.length) return "";
    return section("爱好", '<ul class="hobbies">' + items.map(function (h) {
      return (
        '<li class="hobby">' +
          '<span class="hobby__icon">' + icon(h.icon) + "</span>" +
          "<div>" +
            '<h3 class="hobby__name">' + esc(h.name) + "</h3>" +
            (h.en ? '<p class="hobby__en">' + esc(h.en) + "</p>" : "") +
            (h.desc ? '<p class="hobby__desc">' + esc(h.desc) + "</p>" : "") +
          "</div>" +
        "</li>"
      );
    }).join("") + "</ul>");
  }

  function sectionLinks() {
    var items = arr(D.links).filter(function (l) { return l && l.name && safeUrl(l.url); });
    if (!items.length) return "";
    return section("找我", '<ul class="links">' + items.map(function (l) {
      return (
        "<li>" +
          '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener noreferrer">' +
            icon("link") + "<span>" + esc(l.name) + "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("") + "</ul>");
  }

  function footer() {
    return (
      '<footer class="footer">' +
        "<span>© " + new Date().getFullYear() + " " + esc(D.name) + "</span>" +
        "<span>手工编写 · 无追踪脚本</span>" +
      "</footer>"
    );
  }

  /* ---------------- 动效：滚动浮现 ---------------- */

  function initReveal() {
    var blocks = document.querySelectorAll(".block");
    if (!blocks.length) return;

    function reveal(block, baseDelay) {
      each(block.querySelectorAll(".block__head"), function (head) {
        head.style.transitionDelay = baseDelay + "ms";
      });
      each(block.querySelectorAll(".stat, .hobby, .links > li"), function (item, i) {
        item.style.transitionDelay = (baseDelay + i * 70) + "ms";
      });
      block.classList.add("in");
    }

    // 系统关了动效、或者浏览器太老：直接全部显示，不做任何延迟
    if (!MOTION || !("IntersectionObserver" in window)) {
      each(blocks, function (b) { reveal(b, 0); });
      return;
    }

    var vh = window.innerHeight || 800;

    var observer = new IntersectionObserver(function (entries) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target, 0);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    each(blocks, function (b) {
      if (b.getBoundingClientRect().top < vh) {
        // 一打开就在屏幕里的区块：等顶部的入场演完再出现，别抢戏
        window.setTimeout(function () { reveal(b, 0); }, 700);
      } else {
        observer.observe(b);
      }
    });
  }

  /* ---------------- 动效：卡片聚光 + 鼠标视差 ---------------- */

  function initSpotlight() {
    if (!mediaOk("(hover: hover) and (pointer: fine)")) return;

    each(document.querySelectorAll(".stat, .hobby"), function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      }, { passive: true });
    });
  }

  function initParallax() {
    if (!mediaOk("(hover: hover) and (pointer: fine)")) return;

    var raf = 0;
    var nx = 0;
    var ny = 0;

    window.addEventListener("pointermove", function (e) {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;

      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        root.style.setProperty("--px", (nx * 7).toFixed(1) + "px");
        root.style.setProperty("--py", (ny * 7).toFixed(1) + "px");
        root.style.setProperty("--bx", (nx * -16).toFixed(1) + "px");
        root.style.setProperty("--by", (ny * -16).toFixed(1) + "px");
      });
    }, { passive: true });
  }

  /* ---------------- 开始渲染 ---------------- */

  if (!app) return;

  if (!D || typeof D !== "object") {
    app.innerHTML = errorBox("没有读到内容", "data.js 没加载成功，或者里面的 window.SITE 写错了。");
    return;
  }

  try {
    // 只有真的有内容的区块才会出现；编号按实际出现的顺序重排
    var blocks = [sectionFacts(), sectionHobbies(), sectionLinks()].filter(Boolean);
    var parts = [hero()];

    for (var i = 0; i < blocks.length; i++) {
      var no = i + 1;
      parts.push(blocks[i].replace("__INDEX__", (no < 10 ? "0" : "") + no));
    }

    parts.push(footer());

    // 动效的初始隐藏状态只在这个 class 存在时生效 —— 这样禁用了 JS 也不会白屏
    if (MOTION) root.classList.add("js-anim");

    app.innerHTML = parts.join("");
    document.title = D.name || document.title;

    if (MOTION) {
      initReveal();
      initSpotlight();
      initParallax();
    }
  } catch (err) {
    app.innerHTML = errorBox("页面渲染出错", String((err && err.message) || err));
    if (window.console) console.error(err);
  }
})();
