/*!
 * منارة — Manara Embed v1.0  (HN Group)
 * سكريبت مستقل 100% — بدون React ولا أي مكتبة خارجية.
 * يعمل في أي موقع (HTML عادي / WordPress / Vue / Angular / React ...)
 *
 * الاستخدام الأسرع (خلفية كاملة الشاشة + كرة):
 *   <script src="https://www.hn-driver.com/manara-embed.js"
 *           data-auto="true" data-color="45 93% 55%" data-height="100"></script>
 *
 * الاستخدام داخل حاوية محددة:
 *   <div id="manara"></div>
 *   <script src=".../manara-embed.js"></script>
 *   <script>
 *     Manara.mount('#manara', {
 *       color: '45 93% 55%',   // HSL بدون hsl()
 *       height: 70,            // نسبة من ارتفاع الشاشة (vh)
 *       speed: 24,             // ثواني للدورة الكاملة
 *       background: true,      // خلفية ثلاثية الأبعاد
 *       hueCycle: 18,          // ثواني لدورة تغيّر الألوان (0 = تعطيل)
 *       labels: ['admin','driver','client'] // تسميات مدارية (اختياري)
 *     });
 *   </script>
 *
 * الإزالة: Manara.destroy()
 */
(function (global) {
  "use strict";

  var STYLE_ID = "manara-embed-style";
  var RING_COUNT = 14;
  var PARTICLE_COUNT = 24;
  var instances = [];

  var CSS = [
    "@keyframes manara-spin{from{transform:rotateX(-18deg) rotateY(0)}to{transform:rotateX(-18deg) rotateY(360deg)}}",
    "@keyframes manara-orbit{from{transform:rotateZ(0)}to{transform:rotateZ(360deg)}}",
    "@keyframes manara-pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}",
    "@keyframes manara-core{0%,100%{opacity:.95;transform:scale(1);filter:brightness(1.3)}50%{opacity:1;transform:scale(1.15);filter:brightness(2)}}",
    "@keyframes manara-rays{from{transform:rotate(0)}to{transform:rotate(360deg)}}",
    "@keyframes manara-ray-pulse{0%,100%{opacity:.25}50%{opacity:.7}}",
    "@keyframes manara-spark{0%{opacity:0;transform:rotate(var(--a)) translateX(30%) scale(.4)}40%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateX(var(--r)) scale(1.3)}}",
    "@keyframes manara-hue{from{filter:hue-rotate(0) saturate(1.3)}to{filter:hue-rotate(360deg) saturate(1.3)}}",
    "@keyframes manara-grid{from{background-position-y:0}to{background-position-y:80px}}",
    "@keyframes manara-orb{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,-30px,0) scale(1.08)}}",
    "@keyframes manara-star{0%,100%{opacity:.1;transform:scale(.8)}50%{opacity:.9;transform:scale(1.2)}}",
    ".manara-stage{position:relative;display:flex;width:100%;align-items:center;justify-content:center;overflow:hidden}",
    ".manara-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}",
    ".manara-globe-wrap{position:relative;height:86%;aspect-ratio:1/1;max-width:100%;perspective:1200px}",
    ".manara-globe{position:relative;width:100%;height:100%;transform-style:preserve-3d}",
    ".manara-ring{position:absolute;inset:0;border-radius:9999px;transform-style:preserve-3d}",
    ".manara-bg{position:fixed;inset:0;z-index:-10;overflow:hidden;pointer-events:none}",
    "@media (prefers-reduced-motion:reduce){.manara-stage *,.manara-bg *{animation:none !important}}"
  ].join("\n");

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, style, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (style) n.setAttribute("style", style);
    return n;
  }

  /** الخلفية ثلاثية الأبعاد: شبكة أرضية بمنظور + كرات ضوئية + نجوم */
  function buildBackground(c) {
    var root = el("div", "", "manara-bg");
    root.setAttribute("aria-hidden", "true");

    root.appendChild(el("div",
      "position:absolute;inset:0;background:" +
      "radial-gradient(ellipse at top, hsl(" + c + "/0.12), transparent 55%)," +
      "radial-gradient(ellipse at bottom, hsl(" + c + "/0.08), transparent 50%)"));

    var floor = el("div", "position:absolute;left:0;right:0;bottom:0;height:55%;perspective:600px;perspective-origin:50% 0%");
    floor.appendChild(el("div",
      "position:absolute;inset:-50%;transform-origin:top;transform:rotateX(64deg);" +
      "background-image:linear-gradient(hsl(" + c + "/0.16) 1px,transparent 1px)," +
      "linear-gradient(90deg,hsl(" + c + "/0.16) 1px,transparent 1px);background-size:80px 80px;" +
      "animation:manara-grid 4s linear infinite;" +
      "-webkit-mask-image:linear-gradient(to bottom,transparent,#000 35%,#000 90%,transparent);" +
      "mask-image:linear-gradient(to bottom,transparent,#000 35%,#000 90%,transparent)"));
    root.appendChild(floor);

    var orbs = [
      [220, "8%", "12%", 0.6, 0, 0.22], [120, "82%", "8%", 1, 1.4, 0.3],
      [160, "70%", "62%", 0.8, 2.6, 0.2], [90, "18%", "70%", 1.1, 0.8, 0.28],
      [140, "45%", "30%", 0.5, 3.4, 0.16]
    ];
    orbs.forEach(function (o) {
      root.appendChild(el("div",
        "position:absolute;border-radius:9999px;filter:blur(64px);background:hsl(" + c + ");" +
        "width:" + o[0] + "px;height:" + o[0] + "px;left:" + o[1] + ";top:" + o[2] + ";opacity:" + o[5] + ";" +
        "animation:manara-orb " + Math.round(9 * o[3] + 6) + "s ease-in-out " + o[4] + "s infinite"));
    });

    for (var i = 0; i < 40; i++) {
      var size = 1 + (i % 3);
      root.appendChild(el("span",
        "position:absolute;border-radius:9999px;background:hsl(" + c + ");" +
        "left:" + ((i * 37 + 13) % 100) + "%;top:" + ((i * 53 + 7) % 100) + "%;" +
        "width:" + size + "px;height:" + size + "px;box-shadow:0 0 6px 1px hsl(" + c + "/0.6);" +
        "animation:manara-star " + (3 + (i % 5)) + "s ease-in-out " + ((i % 10) * 0.5) + "s infinite"));
    }
    return root;
  }

  /** الكرة المضيئة ثلاثية الأبعاد */
  function buildSphere(o) {
    var c = o.color, stage = el("div", "height:" + o.height + "vh", "manara-stage");
    stage.setAttribute("aria-hidden", "true");

    var scene = el("div",
      o.hueCycle ? "animation:manara-hue " + o.hueCycle + "s linear infinite" : "", "manara-scene");

    // أشعة ضوئية دوّارة
    var rays = el("div", "position:absolute;inset:0;pointer-events:none;animation:manara-rays 60s linear infinite");
    for (var r = 0; r < 12; r++) {
      rays.appendChild(el("div",
        "position:absolute;left:50%;top:50%;height:150%;width:4px;transform-origin:center;" +
        "transform:translate(-50%,-50%) rotate(" + (180 / 12) * r + "deg);filter:blur(3px);" +
        "background:linear-gradient(to bottom,transparent,hsl(" + c + "/0.55) 30%,hsl(" + c + "/0.55) 70%,transparent);" +
        "animation:manara-ray-pulse " + (4 + r * 0.5) + "s ease-in-out infinite"));
    }
    scene.appendChild(rays);

    // هالات محيطة
    scene.appendChild(el("div", "position:absolute;width:95%;height:95%;border-radius:9999px;filter:blur(64px);background:hsl(" + c + "/0.35);animation:manara-pulse 6s ease-in-out infinite"));
    scene.appendChild(el("div", "position:absolute;width:60%;height:60%;border-radius:9999px;filter:blur(40px);background:hsl(" + c + "/0.55);animation:manara-pulse 4s ease-in-out infinite reverse"));

    var wrap = el("div", "", "manara-globe-wrap");

    // قلب متوهّج
    wrap.appendChild(el("div",
      "position:absolute;inset:15%;border-radius:9999px;pointer-events:none;" +
      "background:radial-gradient(circle,hsl(" + c + ") 0%,hsl(" + c + "/0.65) 35%,hsl(" + c + "/0.2) 65%,transparent 100%);" +
      "box-shadow:0 0 80px 30px hsl(" + c + "/0.65),0 0 180px 70px hsl(" + c + "/0.35);" +
      "animation:manara-core 5s ease-in-out infinite"));

    var globe = el("div", "animation:manara-spin " + o.speed + "s linear infinite", "manara-globe");

    // حلقات الطول
    for (var m = 0; m < RING_COUNT; m++) {
      globe.appendChild(el("div",
        "transform:rotateY(" + (180 / RING_COUNT) * m + "deg);border:2px solid hsl(" + c + "/0.7);" +
        "box-shadow:0 0 20px hsl(" + c + "/0.8),inset 0 0 20px hsl(" + c + "/0.5)", "manara-ring"));
    }
    // حلقات العرض
    for (var l = 0; l < 7; l++) {
      var t = (l + 1) / 8, sc = Math.sin(Math.PI * t), off = Math.cos(Math.PI * t);
      globe.appendChild(el("div",
        "transform:rotateX(90deg) translateZ(" + (off * -50) + "%) scale(" + sc + ");" +
        "border:2px solid hsl(" + c + "/0.6);box-shadow:0 0 16px hsl(" + c + "/0.7)", "manara-ring"));
    }
    // المركز المتوهّج
    globe.appendChild(el("div", "position:absolute;inset:30%;border-radius:9999px;filter:blur(4px);background:linear-gradient(135deg,hsl(" + c + "),hsl(" + c + "/0.3))"));
    globe.appendChild(el("div", "position:absolute;inset:40%;border-radius:9999px;filter:blur(12px);background:hsl(" + c + ")"));
    globe.appendChild(el("div", "position:absolute;inset:46%;border-radius:9999px;filter:blur(4px);background:rgba(255,255,255,.8)"));
    wrap.appendChild(globe);

    // شرارات
    for (var p = 0; p < PARTICLE_COUNT; p++) {
      var sp = el("span",
        "position:absolute;left:50%;top:50%;border-radius:9999px;pointer-events:none;background:hsl(" + c + ");" +
        "width:" + (4 + (p % 3) * 2) + "px;height:" + (4 + (p % 3) * 2) + "px;" +
        "box-shadow:0 0 14px 3px hsl(" + c + "/0.9);" +
        "animation:manara-spark " + (3.5 + (p % 5)) + "s linear " + ((p % 6) * 0.7) + "s infinite");
      sp.style.setProperty("--a", (360 / PARTICLE_COUNT) * p + "deg");
      sp.style.setProperty("--r", (54 + (p % 4) * 10) + "%");
      wrap.appendChild(sp);
    }

    // تسميات مدارية (أسماء مواقع المجموعة)
    if (o.labels && o.labels.length) {
      var orbit = el("div", "position:absolute;inset:0;pointer-events:none;animation:manara-orbit " + Math.round(o.speed * 1.8) + "s linear infinite");
      o.labels.slice(0, 6).forEach(function (label, i) {
        var a = (360 / Math.min(o.labels.length, 6)) * i;
        var slot = el("div", "position:absolute;inset:0;transform:rotate(" + a + "deg)");
        var tag = el("span",
          "position:absolute;left:50%;top:0;white-space:nowrap;border-radius:9999px;padding:4px 12px;" +
          "font-size:11px;font-weight:500;border:1px solid hsl(" + c + "/0.5);color:#fff;" +
          "background:rgba(0,0,0,.45);backdrop-filter:blur(6px);box-shadow:0 0 14px hsl(" + c + "/0.5);" +
          "transform:translate(-50%,-50%) rotate(" + (-a) + "deg)");
        tag.textContent = label;
        slot.appendChild(tag);
        orbit.appendChild(slot);
      });
      wrap.appendChild(orbit);
    }

    scene.appendChild(wrap);
    stage.appendChild(scene);
    return stage;
  }

  var Manara = {
    version: "1.0.0",
    /** يركّب المنارة داخل عنصر (سيليكتور أو DOM node) */
    mount: function (target, options) {
      injectStyle();
      var o = Object.assign({
        color: "45 93% 55%",  // ذهبي HN — أي HSL بدون hsl()
        height: 70,
        speed: 24,
        background: true,
        hueCycle: 18,
        labels: []
      }, options || {});
      o.height = Math.min(Math.max(o.height, 20), 100);

      var host = typeof target === "string" ? document.querySelector(target) : target;
      if (!host) { console.warn("[Manara] target not found:", target); return null; }

      var nodes = [];
      if (o.background) { var bg = buildBackground(o.color); document.body.appendChild(bg); nodes.push(bg); }
      var sphere = buildSphere(o); host.appendChild(sphere); nodes.push(sphere);

      var inst = { nodes: nodes, options: o, destroy: function () { nodes.forEach(function (n) { n.remove(); }); } };
      instances.push(inst);
      return inst;
    },
    /** يزيل كل النسخ المركّبة */
    destroy: function () {
      instances.forEach(function (i) { i.destroy(); });
      instances = [];
    }
  };

  global.Manara = Manara;

  // التركيب التلقائي عبر data-auto على وسم السكريبت
  var self = document.currentScript;
  if (self && self.dataset.auto === "true") {
    var run = function () {
      var holder = document.createElement("div");
      holder.id = "manara-auto";
      holder.setAttribute("style", "position:relative;width:100%");
      document.body.appendChild(holder);
      Manara.mount(holder, {
        color: self.dataset.color || "45 93% 55%",
        height: parseFloat(self.dataset.height || "100"),
        speed: parseFloat(self.dataset.speed || "24"),
        hueCycle: parseFloat(self.dataset.hue || "18"),
        background: self.dataset.background !== "false",
        labels: (self.dataset.labels || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean)
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  }
})(window);
