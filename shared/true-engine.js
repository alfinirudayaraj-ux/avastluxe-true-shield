/* AvastLuxe TRUE Engine v3 — shared by website + app + extension.
   Fixes: hdfc.bank.in (real, HDFC-owned .bank.in) must verify SAFE via
   official list + RDAP registrant proof; parked/down domains (DNS resolves
   but no working site, e.g. manikandan.org) must NEVER report SAFE. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TrueEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
"use strict";
const URL_RULES = [
  { re: /(^|[^a-z0-9])(bit\.ly|tinyurl\.com|t\.co|goo\.gl|rebrand\.ly|cutt\.ly|is\.gd|s\.id|ow\.ly|buff\.ly|rb\.gy|tiny\.cc|shorturl\.at|wa\.me|jio\.sh)([^a-z0-9]|$)/i, w: 22, label: "URL shortener hides the final destination" },
  { re: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, w: 25, label: "Raw IP host — no legitimate brand uses this" },
  { re: /https?:\/\/[^\s]*@/i, w: 30, label: "'@' trick — browser ignores everything before @" },
  { re: /[а-яё]|xn--/i, w: 30, label: "Lookalike domain (IDN/punycode homoglyph)" },
  { re: /(hdfc|sbi|icici|axis|paytm|phonepe|amazon|flipkart|apple|microsoft|netflix|paypal|whatsapp|instagram|facebook|google)[-_.]?[a-z0-9]*\.(xyz|top|shop|click|loan|tk|ml|ga|gq|cf|buzz|store|online|sbs|site|live)/i, w: 35, label: "Famous brand on a suspicious cheap domain" },
  { re: /(login|secure|security|verify|update|banking|wallet|alert|kyc|support|account|auth|confirm|netbank|portal|signin|password|otp)[a-z0-9-]*\.[a-z]{2,}/i, w: 22, label: "Domain imitates a login/security page" },
  { re: /https?:\/\/(?!(www\.)?(google|youtube|github|microsoft|apple|amazon)\.com)[\w-]+\.(xyz|top|click|shop|tk|ml|ga|gq|cf|buzz|loan)/i, w: 32, label: "High-risk TLD (xyz/top/click/tk…)" }
];
const MSG_RULES = [
  { re: /prize|won|winner|congratulat|lottery|gift card|reward points|spin (to|and) win|free iphone|free gift/i, w: 25, label: "Claims an unbelievable prize or reward" },
  { re: /pay\s*(rs|₹|\$|fee|deposit|registration|advance)|registration fee|processing fee|claim.*fee|refundable deposit/i, w: 30, label: "Advance-fee demand (pay to receive money)" },
  { re: /urgent|immediately|within 24|last (day|chance|warning)|account (blocked|suspended|deactivated|locked)|verify now|act now|final notice/i, w: 20, label: "Urgency / threats to rush you" },
  { re: /otp|pin number|\bcvv\b|password|login credentials|verify your account|share (your|the) (otp|code)/i, w: 30, label: "Asks for OTP / password / code" },
  { re: /kyc|pan\s*(card)?\s*link|aadhaar\s*update|rbi\s*notice|income\s*tax\s*refund|electricity\s*(bill|disconnection)|cibil/i, w: 22, label: "Impersonates KYC / RBI / tax / utility authority" },
  { re: /guaranteed return|double your money|\b10x\b|pump group|earn\s*\d+.*\/\s*day|part.?time job.*\d{4,}|like (videos?|youtube).*(earn|rs)/i, w: 30, label: "Fake job / guaranteed-returns lure" },
  { re: /parcel|customs (duty|fee)|courier.*held|delivery failed.*fee|package.*pay/i, w: 25, label: "Fake parcel / customs-fee scam" },
  { re: /qr.*scan.*(receive|refund)|upi.*(collect|request)|send ₹?1 (to verify|for verification)/i, w: 30, label: "UPI/QR reversal trick (paying disguised as receiving)" },
  { re: /click this link to (claim|get|verify)|claim.*(reward|cashback|offer).*link/i, w: 22, label: "Classic bait-to-link phrasing" }
];
/* Official homes. .bank.in is RESTRICTED (only verified banks) and .sbi is
   SBI's own brand TLD — both are strong genuineness signals. */
const BRANDS = [
  { pat: /icici/i, name: "ICICI Bank", official: ["icicibank.com", "icici.bank.in"], org: ["ICICI"] },
  { pat: /hdfc/i, name: "HDFC Bank", official: ["hdfcbank.com", "hdfc.bank.in"], org: ["HDFC"] },
  { pat: /(^|[^a-z])sbi([^a-z]|$)/i, name: "SBI", official: ["onlinesbi.com", "sbi.co.in", "sbi.bank.in", "onlinesbi.sbi"], org: ["STATE BANK", "SBI"] },
  { pat: /(^|[^a-z])axis([^a-z]|$)/i, name: "Axis Bank", official: ["axisbank.com", "axis.bank.in"], org: ["AXIS"] },
  { pat: /kotak/i, name: "Kotak Bank", official: ["kotak.com", "kotak.bank.in"], org: ["KOTAK"] },
  { pat: /(^|[^a-z])pnb([^a-z]|$)/i, name: "PNB", official: ["pnb.co.in", "pnb.bank.in"], org: ["PUNJAB NATIONAL"] },
  { pat: /bankofbaroda|(^|[^a-z])bob([^a-z]|$)/i, name: "Bank of Baroda", official: ["bankofbaroda.in", "bankofbaroda.bank.in"], org: ["BANK OF BARODA", "BARODA"] },
  { pat: /canara/i, name: "Canara Bank", official: ["canarabank.com", "canara.bank.in"], org: ["CANARA"] },
  { pat: /union bank|(^|[^a-z])ubi([^a-z]|$)/i, name: "Union Bank", official: ["unionbankofindia.co.in", "union.bank.in"], org: ["UNION BANK"] },
  { pat: /idbi/i, name: "IDBI Bank", official: ["idbibank.in", "idbi.bank.in"], org: ["IDBI"] },
  { pat: /yes bank|(^|[^a-z])yesbank/i, name: "Yes Bank", official: ["yesbank.in", "yes.bank.in"], org: ["YES BANK"] },
  { pat: /paytm/i, name: "Paytm", official: ["paytm.com"], org: ["PAYTM", "ONE97"] },
  { pat: /phonepe/i, name: "PhonePe", official: ["phonepe.com"], org: ["PHONEPE"] },
  { pat: /paypal/i, name: "PayPal", official: ["paypal.com"], org: ["PAYPAL"] },
  { pat: /amazon/i, name: "Amazon", official: ["amazon.com", "amazon.in"], org: ["AMAZON"] },
  { pat: /flipkart/i, name: "Flipkart", official: ["flipkart.com"], org: ["FLIPKART"] },
  { pat: /(^|[^a-z])apple([^a-z]|$)/i, name: "Apple", official: ["apple.com", "icloud.com"], org: ["APPLE"] },
  { pat: /microsoft|outlook|office365/i, name: "Microsoft", official: ["microsoft.com", "office.com", "outlook.com"], org: ["MICROSOFT"] },
  { pat: /netflix/i, name: "Netflix", official: ["netflix.com"], org: ["NETFLIX"] },
  { pat: /instagram/i, name: "Instagram", official: ["instagram.com"], org: ["INSTAGRAM", "META"] },
  { pat: /facebook|(^|[^a-z0-9])fb([^a-z0-9]|$)/i, name: "Facebook", official: ["facebook.com"], org: ["META", "FACEBOOK"] },
  { pat: /whatsapp/i, name: "WhatsApp", official: ["whatsapp.com", "whatsapp.net"], org: ["WHATSAPP", "META"] },
  { pat: /google/i, name: "Google", official: ["google.com", "google.co.in"], org: ["GOOGLE"] },
  { pat: /youtube|youtu\.be/i, name: "YouTube", official: ["youtube.com", "youtu.be"], org: ["GOOGLE", "YOUTUBE"] },
  { pat: /telegram/i, name: "Telegram", official: ["telegram.org"], org: ["TELEGRAM"] },
  { pat: /swiggy/i, name: "Swiggy", official: ["swiggy.com"], org: ["SWIGGY"] },
  { pat: /zomato/i, name: "Zomato", official: ["zomato.com"], org: ["ZOMATO"] },
  { pat: /irctc/i, name: "IRCTC", official: ["irctc.co.in"], org: ["IRCTC", "RAILWAY"] },
  { pat: /(^|[^a-z])jio([^a-z]|$)/i, name: "Jio", official: ["jio.com"], org: ["JIO", "RELIANCE"] },
  { pat: /airtel/i, name: "Airtel", official: ["airtel.in", "airtel.com"], org: ["AIRTEL", "BHARTI"] },
  { pat: /(^|[^a-z])dhl([^a-z]|$)/i, name: "DHL", official: ["dhl.com"], org: ["DHL"] }
];
const TRUSTED = ["google.com", "youtube.com", "github.com", "microsoft.com", "apple.com", "amazon.in", "amazon.com", "hdfcbank.com", "hdfc.bank.in", "icicibank.com", "icici.bank.in", "axisbank.com", "axis.bank.in", "kotak.com", "kotak.bank.in", "sbi.co.in", "sbi.bank.in", "onlinesbi.com", "onlinesbi.sbi", "pnb.co.in", "bankofbaroda.in", "canarabank.com", "unionbankofindia.co.in", "paypal.com", "netflix.com", "phonepe.com", "paytm.com", "npci.org.in", "cybercrime.gov.in", "reddit.com", "whatsapp.com", "facebook.com", "instagram.com", "flipkart.com", "irctc.co.in"];
const RISKY_TLDS = /^(io|xyz|top|tk|ml|ga|gq|cf|buzz|sbs|loan|click|shop|store|online|site|live|vip|rest)$/;
const RESTRICTED_TLD = /(\.bank\.in|\.sbi|\.gov\.in|\.nic\.in|\.ac\.in|\.edu\.in|\.res\.in)$/;
const OFFICIALS = [...new Set(TRUSTED.concat(BRANDS.flatMap(b => b.official)))];
const PARKED_RE = /this domain is (parked|for sale)|buy this domain|domain (is parked|for sale|available|may be for sale)|parked (free|by|domain)|sedo|afternic|hugedomains|dan\.com|godaddy.*(auction|parked|domain)|default (plesk|cpanel|web site) page|server (default|not found)|coming soon|website is (under construction|coming soon)|error 522|origin (is unreachable|down)|connection timed out/i;

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}
function brandCheck(uh, path) {
  const b = BRANDS.find(x => x.pat.test(uh + " " + (path || "")));
  if (!b) return null;
  return { b, home: b.official.some(o => uh === o || uh.endsWith("." + o)) };
}
function extractUrls(text) {
  if (!text) return [];
  const out = [];
  for (const m of (String(text).match(/https?:\/\/[^\s"'<>)\]]+/gi) || [])) {
    try { out.push(new URL(m.replace(/[.,;!?]+$/, "")).href); } catch {}
  }
  for (const m of (String(text).match(/(^|[\s"'(\[])(www\.[^\s"'<>)\]]+)/gi) || [])) {
    const t = m.trim().replace(/^[("'\[]/, "").replace(/[.,;!?]+$/, "");
    try { out.push(new URL("https://" + t).href); } catch {}
  }
  return [...new Set(out)].slice(0, 4);
}
function registrableDomain(host) {
  if (!host || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  const p = host.split("."); if (p.length <= 2) return host;
  const MULTI = ["bank.in", "co.in", "org.in", "net.in", "com.in", "ac.in", "edu.in", "gov.in", "res.in", "co.uk", "org.uk", "com.au", "co.jp", "com.br", "co.za", "co.nz"];
  const l2 = p.slice(-2).join(".");
  if (MULTI.indexOf(l2) >= 0 && p.length >= 3) return p.slice(-3).join(".");
  return l2;
}
/* ---- instant (offline, <5ms) ---- */
function instantAnalyze(input) {
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (!input || !String(input).trim()) return { score: 0, verdict: "safe", hits: [], trusted: false, kind: "empty", host: "", ms: 0, alleged: null, impersonated: false };
  const t = String(input).trim();
  let score = 0; const hits = [];
  const isUrl = /https?:\/\/|www\.|\.(com|in|net|org|xyz|top|click|shop|tk|io|co)\b/i.test(t);
  for (const r of (isUrl ? URL_RULES.concat(MSG_RULES) : MSG_RULES)) {
    if (r.re.test(t)) { score += r.w; hits.push(r.label); }
  }
  let trusted = false, host = "", impersonated = false, alleged = null;
  try {
    const first = (t.match(/https?:\/\/[^\s"'<>]+/i) || [t.split(/\s/)[0]])[0];
    const u = new URL(/^https?:\/\//i.test(first) ? first : "https://" + first);
    host = u.hostname.toLowerCase();
    trusted = TRUSTED.some(x => host === x || host.endsWith("." + x));
    if (u.protocol === "http:") { score += 10; hits.push("Not encrypted (http) — logins can be stolen"); }
    if ((host.match(/-/g) || []).length >= 3) { score += 12; hits.push("Excessive hyphens — typosquat pattern"); }
    if (host.split(".").length > 3) { score += 10; hits.push("Deep subdomain hides the true brand"); }
    if (/whatsapp/i.test(t) && !host.endsWith("whatsapp.com") && !host.endsWith("whatsapp.net")) { score += 28; hits.push("Impersonates WhatsApp on a foreign domain"); }
    const bc = brandCheck(host, u.pathname || "");
    if (bc && !bc.home) {
      impersonated = true; alleged = { name: bc.b.name, official: bc.b.official, org: bc.b.org || [] };
      score += 40; hits.push("Uses " + bc.b.name + "'s name but is NOT " + bc.b.official[0] + " — the real " + bc.b.name + " never operates from here");
      const tld = (host.split(".").pop() || "");
      if (RISKY_TLDS.test(tld)) { score += 15; hits.push("Bank/brand lure parked on risky suffix (." + tld + ")"); }
      if (/(login|secure|security|verify|update|banking|wallet|alert|kyc|support|account|auth|confirm|netbank|portal|signin|password|otp)([-_.\/?&]|$)/i.test(u.pathname || "")) { score += 15; hits.push("Banking-action page on a non-official domain — credential-harvest layout"); }
    } else if (bc && bc.home) {
      score = Math.max(0, score - 25); hits.push("Official home of " + bc.b.name + " (" + bc.b.official.join(", ") + ")");
      if (RESTRICTED_TLD.test(host)) { score = 0; hits.push("Restricted bank/government zone (.bank.in/.gov.in) — only verified owners get these"); }
    }
    if (t.length > 140) { score += 8; hits.push("Abnormally long text/URL — obfuscation"); }
    if (host && !trusted && /^[\w.-]+$/.test(host)) {
      let near = null, nd = 99;
      for (const o of OFFICIALS) {
        if (host === o || host.endsWith("." + o)) continue;
        const d = lev(host, o), lim = o.length >= 10 ? 2 : 1;
        if (d <= lim && d < nd) { nd = d; near = o; }
      }
      if (near) { score += 25; hits.push("Typosquat of " + near + " — only " + nd + " edit(s) away from the real one"); }
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 15; hits.push("Host is a raw IP — no verified brand operates from one"); }
  } catch {}
  const seen = new Set([host]);
  for (const m of (t.match(/https?:\/\/[^\s"'<>]+/gi) || []).slice(0, 4)) {
    let uh = ""; try { uh = new URL(m).hostname.toLowerCase(); } catch { continue; }
    if (!uh || seen.has(uh)) continue; seen.add(uh);
    const eb = brandCheck(uh, "");
    if (eb && !eb.home) { score += 40; impersonated = true; if (!alleged) alleged = { name: eb.b.name, official: eb.b.official, org: eb.b.org || [] }; hits.push("Links to " + eb.b.name + " impostor " + uh + " — real home: " + eb.b.official.join(", ")); }
  }
  if (trusted) score = Math.max(0, score - 60);
  if (impersonated) {
    const tld = (host.split(".").pop() || "");
    const riskyCtx = RISKY_TLDS.test(tld)
      || /(login|secure|security|verify|update|banking|wallet|alert|kyc|support|account|auth|confirm|netbank|portal|signin|password|otp)/i.test(host)
      || (host.match(/-/g) || []).length >= 2
      || /(login|verify|account|secure|update|kyc|bank|otp|password)([-_.\/?&]|$)/i.test(t);
    if (riskyCtx && score < 60) { score = 60; hits.push("Brand impersonation + scam context — auto-classified SCAM"); }
  }
  score = Math.min(100, Math.round(score));
  const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  return { score, verdict: score >= 60 ? "scam" : score > 20 ? "suspicious" : "safe", hits: [...new Set(hits)], trusted, host, kind: isUrl ? "url" : "message", ms: Math.round((t1 - t0) * 10) / 10, alleged, impersonated };
}
/* ---- live helpers ---- */
function timeout(p, ms) { return Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), ms))]); }
async function dohGoogle(host) {
  try {
    const r = await timeout(fetch("https://dns.google/resolve?name=" + encodeURIComponent(host) + "&type=A").then(r => r.json()), 6000);
    if (r.Status === 0 && r.Answer && r.Answer.length) return { ok: true, n: r.Answer.length };
    if (r.Status === 3) return { ok: false, nx: true, n: 0 };
    return { ok: false, n: 0 };
  } catch { return { ok: null }; }
}
function parseRegistrant(j) {
  let org = "", registrar = "";
  try {
    for (const e of (j.entities || [])) {
      const roles = (e.roles || []).join(",");
      let fn = "", o = "";
      for (const x of ((e.vcardArray || [])[1] || [])) {
        if (x[0] === "fn") fn = String(x[3] || "");
        if (x[0] === "org") o = String(x[3] || "");
      }
      if (/registrant/i.test(roles)) org = o || fn || org;
      if (/registrar/i.test(roles)) registrar = fn || o || registrar;
    }
  } catch {}
  let created = null;
  try { for (const e of (j.events || [])) if (e.eventAction === "registration") created = e.eventDate; } catch {}
  return { org: org, registrar: registrar, created: created };
}
async function rdapFetch(rp) {
  try {
    const r = await timeout(fetch("https://rdap.org/domain/" + encodeURIComponent(rp)), 7000);
    if (r.status === 404) return { ok: false };
    const j = await r.json();
    const p = parseRegistrant(j);
    let age = null;
    if (p.created) age = (Date.now() - new Date(p.created).getTime()) / 31557600000;
    return { ok: true, age: age, org: p.org, registrar: p.registrar, created: p.created };
  } catch (e) { return { ok: e && e.message === "nx" ? false : null }; }
}
async function reachFetch(url, httpsPage) {
  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const ms = () => Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0));
  const isHttp = /^http:\/\//i.test(url);
  if (!(httpsPage && isHttp)) {
    try { await timeout(fetch(url, { mode: "no-cors" }), 3000); return { ok: true, ms: ms(), parked: false, page: "" }; } catch {}
  }
  try {
    const r = await timeout(fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(url)), 4500);
    const j = await r.json();
    const code = j && j.status && j.status.http_code;
    const page = String((j && j.contents) || "").slice(0, 4000);
    const parked = PARKED_RE.test(page) || (page.length < 300 && /domain|parked|error|coming soon/i.test(page));
    return { ok: !!(code >= 200 && code < 500), ms: ms(), parked: parked, page: page.slice(0, 600), code: code };
  } catch { return { ok: false, ms: ms(), parked: false, page: "" }; }
}
function orgMatches(org, alleged) {
  if (!org || !alleged || !alleged.org) return false;
  const O = String(org).toUpperCase();
  return alleged.org.some(k => O.includes(String(k).toUpperCase()) || String(k).toUpperCase().includes(O.split(" ")[0]));
}
async function deepCheck(raw, onPartial, onEarly, httpsPage) {
  let host = "";
  try { host = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw).hostname.toLowerCase(); } catch { host = raw; }
  const full = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
  const rp = registrableDomain(host);
  const mark = (k, v) => { try { onPartial && onPartial(k, v, host, rp); } catch {} };
  const p1 = dohGoogle(host).then(r => (mark("dns", r), r));
  const p2 = rdapFetch(rp).then(r => (mark("rd", r), r));
  const p3 = reachFetch(full, !!httpsPage).then(r => (mark("rc", r), r));
  Promise.all([p1, p2]).then(([d, r]) => {
    try { onEarly && onEarly({ dns: d, rd: r, rc: null, host: host, rp: rp }); } catch {}
  }).catch(() => {});
  const [dns, rd, rc] = await Promise.all([p1, p2, p3]);
  return { dns: dns, rd: rd, rc: rc, host: host, rp: rp };
}
/* ---- fusion: instant + live → final verdict ---- */
function fuse(instant, deep, msTotal) {
  const ev = []; let score = instant.score; const chips = [];
  chips.push(["⚡", "#F6E27A", "instant " + instant.ms + "ms"]);
  const dnsAlive = deep.dns.ok === true && deep.dns.n > 0;
  const dnsGone = deep.dns.ok === false && (deep.dns.nx || deep.dns.n === 0);
  // Ownership proof: RDAP registrant carries the claimed brand's name.
  let owned = false;
  if (instant.alleged && deep.rd.ok === true && deep.rd.org && orgMatches(deep.rd.org, instant.alleged)) {
    owned = true;
    score = Math.min(score, instant.impersonated ? 60 : 15);
  }
  // 1) DNS
  if (dnsAlive) { ev.push("✅ <b>Live DNS:</b> resolves publicly (" + deep.dns.n + " record(s)) — domain exists"); chips.push(["🌐", "#00E5A0", "DNS live"]); }
  else if (dnsGone) { ev.push("🔌 <b>Live DNS:</b> no records — domain does not resolve"); chips.push(["🌐", "#FF4D6D", "DNS dead"]); }
  else { ev.push("➖ <b>Live DNS:</b> unreachable"); chips.push(["🌐", "#9A94A6", "DNS ?"]); }
  // 2) Registry / age / ownership
  if (deep.rd.ok === true) {
    if (deep.rd.org) ev.push((owned ? "✅" : "ℹ️") + " <b>Owner:</b> registered to “" + String(deep.rd.org).slice(0, 60) + "”" + (owned ? " — matches " + instant.alleged.name + ", ownership proven" : ""));
    if (deep.rd.age != null) {
      const a = deep.rd.age;
      const ageTxt = a < 1 / 12 ? Math.round(a * 365) + " days" : a < 1 ? (a * 12).toFixed(1) + " months" : a.toFixed(1) + " year(s)";
      if (owned) { ev.push("✅ <b>Domain age:</b> " + ageTxt + " — young but owner-verified, no penalty"); chips.push(["📅", "#00E5A0", "owner ✓"]); }
      else { ev.push((a < 1 ? "⚠️" : "✅") + " <b>Domain age:</b> " + ageTxt); chips.push(["📅", a < 1 ? "#FF4D6D" : "#00E5A0", a < 1 ? "new" : "aged"]); if (a < 0.5) score += 18; else if (a < 1) score += 10; }
    } else { ev.push("✅ <b>Registry:</b> domain is registered"); chips.push(["📅", "#00E5A0", "registered"]); }
  }
  else if (deep.rd.ok === false) {
    if (dnsAlive) { ev.push("➖ <b>Registry:</b> no record for this exact host (subdomain of " + (deep.rp || "?") + ") — parent exists"); chips.push(["📅", "#FFB020", "subdomain"]); }
    else { ev.push("🔌 <b>Registry:</b> not registered — this domain does not exist"); chips.push(["📅", "#FF4D6D", "unregistered"]); }
  }
  else { ev.push("➖ <b>Registry:</b> unreachable"); chips.push(["📅", "#9A94A6", "age ?"]); }
  // Official-home fast lane (covers hdfc.bank.in even if RDAP is throttled)
  if (instant.trusted && !instant.impersonated) {
    score = Math.min(score, 10);
    if (!owned) { ev.push("✅ <b>Official home:</b> on the brand's verified domain list"); chips.push(["🏦", "#00E5A0", "official"]); }
  }
  // 3) Reachability / parked
  const probing = !deep.rc;
  if (probing) { ev.push("⏳ <b>Reachability:</b> checking if the server answers…"); chips.push(["📡", "#F6E27A", "checking"]); }
  else if (deep.rc.parked) { ev.push("🅿️ <b>Website:</b> parked/for-sale page — registered but NO real website"); chips.push(["📡", "#FFB020", "parked"]); score = Math.max(score, 50); }
  else if (deep.rc.ok === true) {
    if (dnsGone) { ev.push("🔌 <b>Reachability:</b> probe answered, but DNS has no records — a proxy/error page is answering. The link still cannot open."); chips.push(["📡", "#FF4D6D", "probe fake"]); }
    else { ev.push("✅ <b>Reachability:</b> server answers (page loads, ~" + deep.rc.ms + "ms)"); chips.push(["📡", "#00E5A0", "loads"]); }
  }
  else { ev.push("🔌 <b>Reachability:</b> server does not answer — website not loading"); chips.push(["📡", "#FF4D6D", "down"]); }
  for (const h of instant.hits.slice(0, 6)) ev.push("• " + h);
  score = Math.min(100, Math.round(score));
  const live = deep.rc ? "instant + DNS + registry + reachability" : "instant + DNS + registry (reachability running…)";
  // DEAD: nothing owns this name.
  if (!dnsAlive && (dnsGone || deep.rd.ok === false)) {
    return { verdict: "dead", score: 100, title: "🔌 DEAD — DOES NOT EXIST", why: "This link/URL <b>does not work</b>. DNS has no records + registry has no such domain. Do not pay, share OTPs, or retry on lookalike domains.<br><br>" + ev.join("<br>"), chips: chips, sources: live + " (" + (msTotal / 1000).toFixed(1) + "s)" };
  }
  // DOWN / PARKED: name exists but there is NO working real site — never call it SAFE.
  if (deep.rc && (!deep.rc.ok || deep.rc.parked || dnsGone)) {
    if (instant.impersonated || instant.score >= 40) {
      return { verdict: "scam", score: Math.max(score, 70), title: "⛔ SCAM — DO NOT ENTER", why: "DANGER: scam signals PLUS the site itself does not load properly. Do NOT open, pay, or share codes. Delete it from chat.<br><br>" + ev.join("<br>"), chips: chips, sources: live + " (" + (msTotal / 1000).toFixed(1) + "s)" };
    }
    const parked = deep.rc.parked;
    return { verdict: parked ? "parked" : "down", score: Math.max(score, 55), title: parked ? "🅿️ PARKED — NO REAL WEBSITE" : "⚠️ SITE NOT LOADING — CANNOT VERIFY", why: (parked ? "This domain is <b>registered but parked</b> — there is no real website behind it. It is NOT a genuine working site. Do not trust it or enter any details.<br><br>" : "This domain is registered but its <b>website does not load, so genuineness cannot be verified</b>. It is NOT confirmed safe — do not enter logins, OTPs or payments here.<br><br>") + ev.join("<br>"), chips: chips, sources: live + " (" + (msTotal / 1000).toFixed(1) + "s)" };
  }
  const v = owned ? "safe" : (score >= 60 ? "scam" : score > 20 ? "suspicious" : "safe");
  if (owned) score = Math.min(score, 15);
  return {
    verdict: v, score: score,
    title: v === "scam" ? "⛔ SCAM — DO NOT ENTER" : v === "suspicious" ? "⚠️ SUSPICIOUS — BE CAREFUL" : "✅ SAFE — VERIFIED GENUINE",
    why: (v === "scam" ? "DANGER: do NOT open, pay, scan or share codes. Delete it from chat.<br><br>" : v === "suspicious" ? "NOT SAFE. Warning signs found — open the official app directly instead.<br><br>" : (owned ? "Ownership verified against the live registry — this is the real brand's own domain. Still never share OTPs.<br><br>" : "Looks genuine: live DNS + registry + site all check out. Still never share OTPs.<br><br>")) + ev.join("<br>"),
    chips: chips, sources: live + " (" + (msTotal / 1000).toFixed(1) + "s)"
  };
}
return { instantAnalyze: instantAnalyze, extractUrls: extractUrls, registrableDomain: registrableDomain, deepCheck: deepCheck, fuse: fuse, BRANDS: BRANDS, TRUSTED: TRUSTED, orgMatches: orgMatches, parseRegistrant: parseRegistrant };
});
