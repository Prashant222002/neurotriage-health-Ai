/* NeuroTriage: "Download Android app" banner for website visitors.
   Shows only in an Android browser. Never inside the Android app,
   never on iPhone/desktop, and stays hidden for 7 days after Close.

   Pops up on every new visit (Close hides it only until the tab/browser session ends).
   Edit only the line in CONFIG below. */
(function () {
  "use strict";

  var CONFIG = {
    DOWNLOAD_PAGE: "download.html"    // page with the Download button (or direct APK link)
  };

  try {
    var ua = navigator.userAgent || "";

    // 1) Only Android browsers
    if (!/Android/i.test(ua)) return;

    // 2) Not inside the app (Median / GoNative wrapper) or an installed web app
    if (/gonative|median/i.test(ua)) return;
    if (window.median || window.gonative || window.AndroidBridge) return;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;

    // 2b) Separate "Download app" section inside every Support area
    //     (Settings sheet, About > Contact support, support popups).
    //     Always shown on Android browsers, even after the banner is closed.
    (function supportSection() {
      var hi = function () { return !(typeof st !== "undefined" && st.lang); };
      var css = document.createElement("style");
      css.textContent =
        ".ntdl{display:block;margin:14px 0 0;padding:14px;border-radius:16px;text-align:left;color:#fff!important;" +
        "background:linear-gradient(135deg,#1d4ed8,#7c3aed 60%,#0d9488)!important;" +
        "border:1.5px solid rgba(255,255,255,.4);box-shadow:0 8px 22px rgba(0,0,0,.4),0 0 18px rgba(124,58,237,.45)}" +
        ".ntdl .r{display:flex;align-items:center;gap:12px}" +
        ".ntdl img{width:50px;height:50px;border-radius:13px;flex:none;background:#fff;border:2px solid #fff;" +
        "box-shadow:0 0 14px rgba(255,255,255,.6)}" +
        ".ntdl .h{font:700 12px/1 system-ui,sans-serif;letter-spacing:.8px;text-transform:uppercase;opacity:.9;margin:0 0 5px}" +
        ".ntdl b{display:block;font:700 15px/1.25 system-ui,sans-serif;color:#fff}" +
        ".ntdl small{display:block;font:12.5px/1.3 system-ui,sans-serif;color:#fff;opacity:.9;margin-top:2px}" +
        ".ntdl a.ntdlb{display:flex;align-items:center;justify-content:center;min-height:48px;margin:12px 0 0;border-radius:13px;" +
        "background:linear-gradient(135deg,#ffe259,#ffa751)!important;color:#2a1500!important;font:800 16px system-ui,sans-serif;" +
        "text-decoration:none!important;animation:ntGlow 1.4s ease-in-out infinite}" +
        "@keyframes ntGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,214,10,.75),0 0 12px 2px rgba(255,214,10,.6)}" +
        "50%{box-shadow:0 0 0 9px rgba(255,214,10,0),0 0 26px 7px rgba(255,214,10,.95)}}" +
        "@media (prefers-reduced-motion:reduce){.ntdl a.ntdlb{animation:none}}";
      document.head.appendChild(css);

      function build() {
        var d = document.createElement("div");
        d.className = "ntdl";
        d.setAttribute("data-ntdl", "1");
        d.innerHTML =
          '<div class="h">' + (hi() ? "App download karein" : "Download app") + "</div>" +
          '<div class="r"><img src="icon_512_playstore.png" alt="" onerror="this.style.display=\'none\'">' +
          "<div><b>NeuroTriage for Android</b><small>" +
          (hi() ? "Free app \u2022 1 tap me install" : "Free app \u2022 Install in 1 tap") + "</small></div></div>" +
          '<a class="ntdlb" href="' + CONFIG.DOWNLOAD_PAGE + '">' + (hi() ? "Download APK" : "Download APK") + "</a>";
        return d;
      }

      var busy = false;
      function inject() {
        if (busy) return; busy = true;
        try {
          var gs = document.querySelectorAll("a.ntsg");
          for (var i = 0; i < gs.length; i++) {
            var p = gs[i].parentNode;
            if (!p || p.getAttribute("data-ntdl-done")) continue;
            p.setAttribute("data-ntdl-done", "1");
            if (p.classList.contains("opts")) p.parentNode.insertBefore(build(), p.nextSibling); // Settings sheet
            else p.appendChild(build());                                                       // About / popups
          }
        } catch (e) {}
        busy = false;
      }
      new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
      inject();
    })();

    // 3) Not if the visitor closed it recently
    var KEY = "nt_apk_banner_closed_session";
    try { if (sessionStorage.getItem(KEY)) return; } catch (e) {}

    function show() {
      if (document.getElementById("ntApkBanner")) return;

      var css = document.createElement("style");
      css.textContent =
        "#ntApkBanner{position:fixed!important;left:12px;right:12px;" +
        "bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:2147483000;" +
        "max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;" +
        "padding:14px 12px 14px 14px;border-radius:20px;opacity:1!important;" +
        "background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 55%,#0d9488 100%)!important;" +
        "color:#fff!important;border:1.5px solid rgba(255,255,255,.45);" +
        "box-shadow:0 12px 34px rgba(0,0,0,.55),0 0 22px rgba(124,58,237,.55);" +
        "font:14px/1.35 system-ui,-apple-system,Roboto,'Noto Sans',sans-serif;" +
        "animation:ntPop .45s cubic-bezier(.2,1.3,.4,1)}" +
        "@keyframes ntPop{from{transform:translateY(40px) scale(.92);opacity:0}to{transform:none;opacity:1}}" +
        "@keyframes ntGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,214,10,.75),0 0 12px 2px rgba(255,214,10,.6)}" +
        "50%{box-shadow:0 0 0 9px rgba(255,214,10,0),0 0 26px 7px rgba(255,214,10,.95)}}" +
        "#ntApkBanner img{width:52px;height:52px;border-radius:13px;flex:none;background:#fff;" +
        "border:2px solid #fff;box-shadow:0 0 14px rgba(255,255,255,.65)}" +
        "#ntApkBanner .t{flex:1;min-width:0}" +
        "#ntApkBanner .t b{display:block;font-size:15px;color:#fff}" +
        "#ntApkBanner .t span{color:#fff;opacity:.92;font-size:12.5px}" +
        "#ntApkBanner a.go{flex:none;padding:10px 16px;border-radius:13px;" +
        "background:linear-gradient(135deg,#ffe259,#ffa751)!important;color:#2a1500!important;" +
        "font-weight:800;text-decoration:none;animation:ntGlow 1.4s ease-in-out infinite}" +
        "#ntApkBanner button{flex:none;width:30px;height:30px;border-radius:50%;" +
        "border:0;background:rgba(0,0,0,.35)!important;color:#fff!important;font-size:14px}" +
        "@media (prefers-reduced-motion:reduce){#ntApkBanner,#ntApkBanner a.go{animation:none}}" +
        "#ntApkBanner a:focus-visible,#ntApkBanner button:focus-visible{outline:3px solid #fff;outline-offset:2px}";
      document.head.appendChild(css);

      var box = document.createElement("div");
      box.id = "ntApkBanner";
      box.setAttribute("role", "region");
      box.setAttribute("aria-label", "Download the Android app");

      var icon = document.createElement("img");
      icon.src = "icon_512_playstore.png";
      icon.alt = "";
      icon.onerror = function () { icon.style.display = "none"; };

      var txt = document.createElement("div");
      txt.className = "t";
      txt.innerHTML = "<b>NeuroTriage for Android</b><span>Free app \u2022 Install in 1 tap</span>";

      var go = document.createElement("a");
      go.className = "go";
      go.href = CONFIG.DOWNLOAD_PAGE;
      go.textContent = "Download APK";

      var x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Close");
      x.textContent = "\u2715";
      x.onclick = function () {
        try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
        box.remove();
      };

      box.appendChild(icon);
      box.appendChild(txt);
      box.appendChild(go);
      box.appendChild(x);
      document.body.appendChild(box);
    }

    // Wait a moment so it does not compete with the app's own loading screen
    function start() { setTimeout(show, 2500); }
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);
  } catch (err) { /* never break the website */ }
})();
