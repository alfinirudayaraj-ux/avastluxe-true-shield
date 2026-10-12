/* True Shield content script — floating guard inside EVERY page (real life).
   1s watchers: tapped links, typed URLs, new page links. Instant verdict in
   ~1ms, deep live check via background worker, premium floating tab. */
(function () {
  if (window.__trueShieldOn) return;
  window.__trueShieldOn = true;
  const E = window.TrueEngine;
  if (!E) return;
  const seen = new Set();
  let lastCheck = 0;

  const CSS = "#tsh{position:fixed;z-index:2147483647;right:14px;bottom:16px;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:radial-gradient(circle at 32% 28%,#232842,#07080D 70%);border:2.5px solid #D4AF37;box-shadow:0 10px 30px rgba(0,0,0,.7),0 0 22px rgba(212,175,55,.4);font-size:26px;user-select:none}#tsh.scam,#tsh.dead{border-color:#FF4D6D;box-shadow:0 0 26px rgba(255,77,109,.7)}#tsh.safe{border-color:#00E5A0}#tsh.warn{border-color:#FFB020}#tsp{position:fixed;z-index:2147483646;width:300px;max-width:calc(100vw - 20px);background:rgba(10,12,19,.97);border:1.5px solid #D4AF37;border-radius:16px;padding:12px;color:#F5F1E6;font:13px/1.55 sans-serif;display:none;box-shadow:0 24px 70px rgba(0,0,0,.85)}#tsp.show{display:block}#tsp .tt{font-weight:900;font-size:13px}#tsp .th{font-size:10.5px;color:#9A94A6;font-family:monospace;word-break:break-all}#tsp .tw{font-size:11.5px;max-height:130px;overflow:auto;margin-top:6px}#tsp .ta{display:flex;gap:6px;margin-top:8px}#tsp button{flex:1;border:0;border-radius:8px;padding:8px;font-weight:800;font-size:11px;cursor:pointer}#tsp .g{background:linear-gradient(135deg,#F6E27A,#8A6D1B)}#tsp .s{background:#222;color:#fff}";
  const st = document.createElement("style");
  st.textContent = CSS;
  document.documentElement.appendChild(st);
  const fab = document.createElement("div");
  fab.id = "tsh";
  fab.textContent = "🛡️";
  fab.title = "True Shield — tap for verdict";
  const panel = document.createElement("div");
  panel.id = "tsp";
  panel.innerHTML = '<div class="tt" id="tst">SHIELD ACTIVE — watching this page</div><div class="th" id="tsh2">taps • typing • new links • 1s</div><div class="tw" id="tsw">Copy, type or tap any link — the verdict lands here in milliseconds.</div><div class="ta"><button class="s" id="tsx">✕</button><button class="g" id="tsgo">OPEN ✓</button></div>';
  document.documentElement.appendChild(fab);
  document.documentElement.appendChild(panel);
  let px = null;
  fab.addEventListener("click", () => {
    const r = fab.getBoundingClientRect();
    panel.style.left = Math.max(8, Math.min(innerWidth - 316, r.left - 250)) + "px";
    panel.style.top = Math.max(8, r.top - 230) + "px";
    panel.classList.toggle("show");
  });
  panel.querySelector("#tsx").onclick = () => panel.classList.remove("show");
  panel.querySelector("#tsgo").onclick = () => { if (px && px.safe) window.open(px.url, "_blank", "noopener"); else if (px && confirm("Open " + px.verdict + " link anyway?")) window.open(px.url, "_blank", "noopener"); };

  function paint(v, score, title, why, url) {
    fab.className = v === "scam" ? "scam" : v === "dead" ? "dead" : (v === "suspicious" || v === "down" || v === "parked") ? "warn" : v === "checking" ? "" : "safe";
    fab.textContent = v === "scam" ? "⛔" : v === "dead" ? "🔌" : v === "parked" ? "🅿️" : (v === "suspicious" || v === "down") ? "⚠️" : v === "checking" ? "🔬" : "🛡️";
    document.getElementById("tst").textContent = title;
    document.getElementById("tsh2").textContent = (url || "").slice(0, 80);
    document.getElementById("tsw").innerHTML = why;
    panel.classList.add("show");
    const r = fab.getBoundingClientRect();
    panel.style.left = Math.max(8, Math.min(innerWidth - 316, r.left - 250)) + "px";
    panel.style.top = Math.max(8, r.top - 230) + "px";
  }

  async function check(raw, origin) {
    if (!raw || Date.now() - lastCheck < 300) return;
    lastCheck = Date.now();
    const target = (E.extractUrls(raw)[0] || raw).trim();
    const inst = E.instantAnalyze(raw);
    paint(inst.verdict === "safe" ? "safe" : inst.verdict === "suspicious" ? "suspicious" : "scam", inst.score, "Instant: " + inst.verdict.toUpperCase() + " (" + inst.ms + "ms)", (inst.hits[0] || "checking live…") + "<br>Deep live check running…", inst.host || target);
    px = { url: target, safe: inst.verdict === "safe", verdict: inst.verdict };
    try {
      const d = await chrome.runtime.sendMessage({ type: "DEEP_CHECK", url: target });
      if (!d) return;
      paint(d.verdict, d.score, d.title, d.why, inst.host || target);
      px = { url: target, safe: d.verdict === "safe", verdict: d.verdict };
      window.__shieldVerdict = { verdict: d.verdict, score: d.score, host: inst.host };
      if (["scam", "dead", "down", "parked"].includes(d.verdict)) {
        try { chrome.runtime.sendMessage({ type: "NOTIFY", title: d.title, body: target }); } catch {}
      }
    } catch {}
  }

  // tapped links: hold before the page loads
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a");
    if (!a || !a.href || !/^https?:\/\//i.test(a.href)) return;
    const k = a.href.slice(0, 120);
    if (seen.has(k)) return;
    seen.add(k);
    check(a.href, "tap");
  }, true);
  // typed URLs
  let tt = null;
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
    clearTimeout(tt);
    const v = el.value || "";
    if (v.trim().length < 6) return;
    tt = setTimeout(() => check(v, "typing"), 500);
  });
  // new links appearing on the page, every 1s
  setInterval(() => {
    if (document.hidden) return;
    const links = document.querySelectorAll("a[href^='http']");
    for (let i = 0; i < Math.min(links.length, 30); i++) {
      const h = links[i].href;
      const k = h.slice(0, 120);
      if (!seen.has(k) && !h.includes(location.hostname)) {
        if (seen.size > 60) return;
        // only auto-check suspicious-looking ones to avoid noise
        if (/login|verify|secure|bank|kyc|gift|prize|free|claim|wallet|pay|\.tk|\.top|\.xyz|\.click/i.test(h)) {
          seen.add(k);
          check(h, "page-link");
          break;
        }
        seen.add(k);
      }
    }
  }, 1000);

  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "SHOW_VERDICT") paint(m.verdict, m.score, m.title, m.why, m.url);
  });
})();
