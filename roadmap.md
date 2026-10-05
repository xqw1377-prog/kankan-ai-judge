# Roadmap

## Phase 1 — G0-R2B Truth Closure (UI changes frozen)
- [x] A1 Close the unchecked /audit AI path (route now redirects home)
- [x] A2 Edited dish name sent to server re-estimate and kept as the dish name
- [x] A3 Cooking method sent to server re-estimate
- [x] A4 Stale re-estimate replies discarded after newer edits
- [x] A5 Remove fake learning / +0.5% / EXP copy from edit flow
- [x] A6 Signed-out: browse home; AI analysis requires a real account (no anonymous sign-in)
- [x] A7 Profile loading race (auth ready != profile resolved)
- [ ] A8 Privacy / AI consent matches the real data flow — needs review of AI providers and retention
- [ ] A9/A10 Rebase latest main + full CI — done from GitHub side

## Frozen until user notifies (PR #5 merged)
While GitHub draft PR #5 (G0-R2B Truth Closure) is open — Cursor is fixing merge blockers and UX/Consent — do NOT edit main, deploy, or run SQL in this thread. After the merge notice, execute in order:
1. Apply the 4 migration SQL statements they paste (in order)
2. Redeploy the six edge functions: analyze-food, audit-confirm, audit-standalone, re-infer-dish, save-profile, day-summary
3. Publish

Then product backlog (post-merge only, avoid Cursor conflicts): profile page not blocking, login-page KK gold butterfly icon, minimum font sizes, Consent versioning, app centered shell.

## Phase 2 — G0-UX1 Mobile Product Closure (after Phase 1 passes)
- UX1-01..12 per the uploaded plan
