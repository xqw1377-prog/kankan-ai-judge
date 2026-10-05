# Roadmap

Updated 2026-10-05. Scope freeze lifted by commander's UX-CORE-1 and 大桌多菜 orders.

## Done
- G0-R2B Truth Closure (PR #5) + G0-R2B-FIX merged to main (e340699), synced
- All migrations 090000–180000 applied; 7 edge functions deployed (verify_jwt on); published
- UX-CORE-1 Golden Path Closure: /scan single capture flow, unified entries, Result "最大问题/怎么吃", removed old modules (MealSequenceCoach, InvestmentReport, DietRing, sequence score), minTimer removed, 最近记录 from meals, "先免费试一次" copy. Published.
- 大桌多菜 + 同餐续拍: 5-photo cap with limit prompt, 同餐再拍 merge via re-infer-dish. Published.
- Bottom camera entry fixed (capture flow).

## Open — product backlog (post-merge, not blocking)
- [ ] Login page KK gold butterfly icon
- [ ] Minimum font-size baseline (audit findings)
- [ ] Consent versioning (store version with consent)
- [ ] App centered shell (desktop width cap)
- [ ] A8: privacy/AI consent wording matches real data flow (AI provider + retention review)

## Open — Phase 2 G0-UX1 Mobile Product Closure
- [ ] UX1-01..12 per the uploaded plan (unify all camera entries to /scan, home camera dual-role, min analysis delay UX)

## Waiting on user
- [ ] SEQ-1 Meal Sequence Engine — spec approved (DESIGN PASS), waits for 开工信号
- [ ] Security re-scan recommended before wide sharing
