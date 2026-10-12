const E = require("../shared/true-engine.js");
let fail = 0;
function eq(name, got, want) {
  const ok = got === want;
  console.log((ok ? "PASS" : "FAIL"), name, "->", JSON.stringify(got), ok ? "" : ("(want " + JSON.stringify(want) + ")"));
  if (!ok) fail++;
}
// 1. hdfc.bank.in must be instant-SAFE (official home, restricted zone)
let r = E.instantAnalyze("https://hdfc.bank.in");
eq("hdfc.bank.in instant verdict", r.verdict, "safe");
eq("hdfc.bank.in trusted", r.trusted, true);
eq("hdfc.bank.in not impersonated", r.impersonated, false);
console.log("   hits:", r.hits.slice(0, 3).join(" | "), "|", r.ms + "ms");
// 2. other bank.in officials
for (const u of ["https://icici.bank.in", "https://sbi.bank.in", "https://www.onlinesbi.sbi"]) {
  const x = E.instantAnalyze(u);
  eq(u + " safe", x.verdict, "safe");
}
// 3. fake paypal still scam
r = E.instantAnalyze("https://paypalsecurity.com/login");
eq("paypalsecurity scam", r.verdict, "scam");
// 4. orgMatches ownership proof
eq("org HDFC match", E.orgMatches("HDFC BANK LIMITED", { name: "HDFC Bank", official: ["hdfcbank.com"], org: ["HDFC"] }), true);
eq("org mismatch", E.orgMatches("GO DADDY PARKING", { name: "HDFC Bank", official: ["hdfcbank.com"], org: ["HDFC"] }), false);
// 5. fuse: hdfc.bank.in + live (owned) => SAFE VERIFIED even though young
{
  const inst = E.instantAnalyze("https://hdfc.bank.in/login");
  const deep = { dns: { ok: true, n: 2 }, rd: { ok: true, age: 0.4, org: "HDFC BANK LIMITED", registrar: "X" }, rc: { ok: true, ms: 400, parked: false, page: "" }, host: "hdfc.bank.in", rp: "hdfc.bank.in" };
  const f = E.fuse(inst, deep, 800);
  eq("hdfc.bank.in fused verdict", f.verdict, "safe");
  console.log("   title:", f.title);
}
// 6. fuse: manikandan.org down (resolves, server dead) => DOWN, never safe
{
  const inst = E.instantAnalyze("https://manikandan.org");
  const deep = { dns: { ok: true, n: 1 }, rd: { ok: true, age: 5, org: "", registrar: "" }, rc: { ok: false, ms: 3000, parked: false, page: "" }, host: "manikandan.org", rp: "manikandan.org" };
  const f = E.fuse(inst, deep, 3200);
  eq("manikandan.org down verdict", f.verdict, "down");
  console.log("   title:", f.title, "| score:", f.score);
}
// 7. fuse: parked domain => PARKED
{
  const inst = E.instantAnalyze("https://some-parked-domain123.com");
  const deep = { dns: { ok: true, n: 1 }, rd: { ok: true, age: 3, org: "", registrar: "" }, rc: { ok: true, ms: 300, parked: true, page: "buy this domain" }, host: "x", rp: "x" };
  const f = E.fuse(inst, deep, 900);
  eq("parked verdict", f.verdict, "parked");
}
// 8. fuse: nonexistent => DEAD
{
  const inst = E.instantAnalyze("https://this-link-definitely-does-not-exist-xyz12345.com/login");
  const deep = { dns: { ok: false, nx: true, n: 0 }, rd: { ok: false }, rc: { ok: false, ms: 100 }, host: "x", rp: "x" };
  const f = E.fuse(inst, deep, 500);
  eq("dead verdict", f.verdict, "dead");
}
// 9. speed
const t0 = Date.now();
for (let i = 0; i < 100; i++) E.instantAnalyze("https://hdfc.bank.in/login");
console.log("x100:", (Date.now() - t0) + "ms");
if (fail) { console.error(fail + " FAILURES"); process.exit(1); }
console.log("ALL V3 TESTS PASS");
