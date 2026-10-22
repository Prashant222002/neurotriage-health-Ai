/* NeuroTriage: "Download Android app" banner for website visitors.
   Shows only in an Android browser. Never inside the Android app,
   never on iPhone/desktop, and stays hidden for 7 days after Close.

   Edit only the two lines in CONFIG below. */
(function () {
  "use strict";

  var CONFIG = {
    DOWNLOAD_PAGE: "download.html",   // page with the Download button (or direct APK link)
    HIDE_DAYS: 7                      // how long to hide after the visitor taps Close
  };

  try {
    var ua = navigator.userAgent || "";

    // 1) Only Android browsers
    if (!/Android/i.test(ua)) return;

    // 2) Not inside the app (Median / GoNative wrapper) or an installed web app
    if (/gonative|median/i.test(ua)) return;
    if (window.median || window.gonative || window.AndroidBridge) return;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;

    // 3) Not if the visitor closed it recently
    var KEY = "nt_apk_banner_hide_until";
    try {
      var until = parseInt(localStorage.getItem(KEY) || "0", 10);
      if (until && Date.now() < until) return;
    } catch (e) {}

    function show() {
      if (document.getElementById("ntApkBanner")) return;

      var css = document.createElement("style");
      css.textContent =
        "#ntApkBanner{position:fixed;left:12px;right:12px;" +
        "bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:2147483000;" +
        "max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;" +
        "padding:12px 12px 12px 14px;border-radius:18px;" +
        "background:#0e1b2c;color:#e8f1f5;border:1px solid #2b4264;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.35);" +
        "font:14px/1.35 system-ui,-apple-system,Roboto,'Noto Sans',sans-serif}" +
        "#ntApkBanner img{width:42px;height:42px;border-radius:10px;flex:none}" +
        "#ntApkBanner .t{flex:1;min-width:0}" +
        "#ntApkBanner .t b{display:block;font-size:14.5px}" +
        "#ntApkBanner .t span{opacity:.8;font-size:12.5px}" +
        "#ntApkBanner a.go{flex:none;padding:9px 14px;border-radius:12px;" +
        "background:#3fc4b5;color:#04201c;font-weight:700;text-decoration:none}" +
        "#ntApkBanner button{flex:none;width:32px;height:32px;border-radius:10px;" +
        "border:1px solid #2b4264;background:transparent;color:inherit;font-size:15px}" +
        "#ntApkBanner a:focus-visible,#ntApkBanner button:focus-visible{outline:3px solid #3fc4b5;outline-offset:2px}";
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
      txt.innerHTML = "<b>NeuroTriage for Android</b><span>Get the free app on your phone</span>";

      var go = document.createElement("a");
      go.className = "go";
      go.href = CONFIG.DOWNLOAD_PAGE;
      go.textContent = "Download";

      var x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", "Close");
      x.textContent = "\u2715";
      x.onclick = function () {
        try {
          localStorage.setItem(KEY, String(Date.now() + CONFIG.HIDE_DAYS * 864e5));
        } catch (e) {}
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
