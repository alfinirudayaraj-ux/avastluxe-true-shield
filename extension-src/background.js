/* True Shield background worker — MV3 service worker. Always on: intercepts
   scam/dead taps browser-wide, runs deep live checks, raises notifications. */
importScripts("true-engine.js");
const E = self.TrueEngine;
const cache = new Map();

async function deep(url) {
  if (cache.has(url)) return cache.get(url);
  const inst = E.instantAnalyze(url);
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { inst, deep: null, final: { verdict: inst.verdict, score: inst.score, title: "instant", why: inst.hits.join("<br>"), chips: [], sources: "instant" } }; }
  const d = await E.deepCheck(url, null, null, true);
  const dnsAlive = d.dns.ok === true && d.dns.n > 0;
  const dnsGone = d.dns.ok === false && (d.dns.nx || d.dns.n === 0);
  d.dead = !dnsAlive && (dnsGone || d.rd.ok === false);
  const f = E.fuse(inst, d, 1000);
  const out = { inst, deep: d, final: f };
  cache.set(url, out);
  return out;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "true-shield-scan", title: "Scan link with True Shield", contexts: ["link"] });
  chrome.alarms.create("keepalive", { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(() => { /* keeps SW warm; 1s watchers live in content script */ });
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "true-shield-scan" && info.linkUrl) {
    const r = await deep(info.linkUrl);
    chrome.storage.local.set({ lastVerdict: { url: info.linkUrl, verdict: r.final.verdict, score: r.final.score, title: r.final.title, at: Date.now() } });
    chrome.notifications.create({ type: "basic", iconUrl: "icon-128.png", title: r.final.title, message: info.linkUrl.slice(0, 120) });
    if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: "SHOW_VERDICT", url: info.linkUrl, verdict: r.final.verdict, score: r.final.score, title: r.final.title, why: r.final.why }).catch(() => {});
  }
});

// Real-life interception: check every navigation BEFORE it commits.
chrome.webNavigation.onBeforeNavigate.addListener(async (d) => {
  if (d.frameId !== 0 || !/^https?:\/\//i.test(d.url)) return;
  if (/\.github\.io\/avastluxe-true-shield\//.test(d.url)) return; // our own pages do their own UI
  try {
    const r = await deep(d.url);
    const v = r.final.verdict;
    await chrome.storage.local.set({ lastVerdict: { url: d.url, verdict: v, score: r.final.score, title: r.final.title, at: Date.now() } });
    if (v === "scam" || v === "dead") {
      chrome.notifications.create({ type: "basic", iconUrl: "icon-128.png", title: r.final.title, message: d.url.slice(0, 120) });
      // Hand the tab an interstitial instead of the scam page.
      const html = encodeURIComponent(`<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Blocked</title></head><body style="background:#06070B;color:#F5F1E6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="max-width:420px;padding:28px;text-align:center;border:1.5px solid #FF4D6D;border-radius:20px;background:#141021"><div style="font-size:52px">${v === "dead" ? "🔌" : "⛔"}</div><h1>${r.final.title}</h1><p style="color:#9A94A6;word-break:break-all">${d.url.replace(/</g, "&lt;")}</p><p>${(r.final.why || "").replace(/</g, "&lt;").slice(0, 500)}</p><p><a href="${d.url.replace(/"/g, "")}" style="color:#F6E27A;font-weight:800">Proceed anyway (not recommended)</a></p><p style="color:#9A94A6;font-size:12px">Blocked by AvastLuxe True Shield extension • background worker</p></div></body></html>`);
      chrome.tabs.update(d.tabId, { url: "data:text/html;charset=utf-8," + html }).catch(() => {});
    }
  } catch {}
});

// Messages from content script + popup.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg && msg.type === "DEEP_CHECK") {
      const r = await deep(msg.url);
      reply({ verdict: r.final.verdict, score: r.final.score, title: r.final.title, why: r.final.why, chips: r.final.chips, sources: r.final.sources });
    } else if (msg && msg.type === "NOTIFY") {
      chrome.notifications.create({ type: "basic", iconUrl: "icon-128.png", title: msg.title || "True Shield", message: (msg.body || "").slice(0, 150) });
      reply({ ok: true });
    }
  })();
  return true;
});
