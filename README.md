# AvastLuxe True Shield v3 — Website + App + Extension (NEW repo, NEW links)

## 🔴 Links (all new — old repo/links untouched)
| # | What | Link |
|---|------|------|
| 0 | Hub | https://alfinirudayaraj-ux.github.io/avastluxe-true-shield/ |
| 1 | 🌐 True Website | https://alfinirudayaraj-ux.github.io/avastluxe-true-shield/site/ |
| 2 | 📲 True App (installable) | https://alfinirudayaraj-ux.github.io/avastluxe-true-shield/app/ |
| 3 | 🧩 True Extension (install page + .zip) | https://alfinirudayaraj-ux.github.io/avastluxe-true-shield/extension/ |

Repo: https://github.com/alfinirudayaraj-ux/avastluxe-true-shield

## What changed (smarter tester + scanner)
- **hdfc.bank.in is now SAFE ✔** — all `.bank.in` bank domains + `onlinesbi.sbi` added as official homes; restricted-zone (.bank.in/.gov.in) recognized; live **RDAP registrant proof** (“HDFC BANK LIMITED” ⇒ ownership proven, young-age penalty cancelled).
- **manikandan.org is now ⚠️ SITE NOT LOADING — CANNOT VERIFY** — registered-but-unreachable is a new `down` verdict (never SAFE). Parked/for-sale pages get `🅿️ PARKED — NO REAL WEBSITE`.
- Verdicts: `scam / suspicious / safe / dead / down / parked` with evidence lines for DNS, registry owner, domain age, reachability, official-home proof.
- One shared engine: `shared/true-engine.js` (tested: `node shared/test-v3.js` → ALL V3 TESTS PASS).

## The 3 pieces (all background, all fast)
1. **Website** (`site/`): 1s watchers (clipboard/typing/taps/page-text/screen OCR), instant ~1ms + live DNS+registry+site, floating tab + PiP, SW notifications.
2. **App** (`app/`): same guard, `display:standalone` manifest — Add to Home screen for fullscreen app icon + wake lock.
3. **Extension** (`extension-src/`, MV3, Chrome+Edge): content-script shield on every page, `webNavigation` scam/dead interception before load, right-click scan, background SW + notifications + popup. Download at the extension link above → Load unpacked.

The Website + App pages each embed the extension install card linking to the extension page; the extension popup links back to Website + App.

## Push updates
```bash
cd D:\avastluxe-true-shield
git add -A && git commit -m "update" && git push
# Pages redeploys in ~30-60s.
```
