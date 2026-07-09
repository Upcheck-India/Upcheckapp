# Upcheck — Farmer's-Eye Product Analysis

**Persona:** Ravi, 42, owns 4 shrimp ponds (~2 acres each) near Bhimavaram, Andhra Pradesh. Grows vannamei, 2–3 crops/year. Runs the farm with his brother and 2 hired workers. Phone: a shared, mid-range Android, patchy signal at the pondside, strong signal at home. Comfortable in Telugu, reads English haltingly. Keeps a paper diary today for feed and expenses; wants to stop.

**Method:** This document walks through Upcheck screen-by-screen as Ravi would actually experience it (onboarding → daily logging → alerts → harvest → money), narrating expectations, friction, and delight in first person/persona voice. It is grounded in the actual screen inventory, data contracts, and backend entities in this repo (`docs/APP_FLOW.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`), cross-checked against the project's own self-reported bug trackers (`LAUNCH_REMEDIATION.md`, `REMEDIATION_STATUS.md`, `AUDIT_FINDINGS_2026-07-08.json`). Where a past-known issue is claimed "fixed," it's flagged as **[claimed fixed — verify]** rather than trusted blindly, per standard practice of not trusting self-reported audit trails without independent check.

The second half of the document is the Product Manager synthesis: a ranked, actionable findings list usable by a human or an AI coding agent.

---

## Part 1 — Walking in Ravi's shoes

### 1. Before I even open the app

I heard about Upcheck from another farmer in my WhatsApp group. He said it does "FCR calculation and disease alerts automatically." My expectations going in:
- It should work with **no signal at the pond** — that's where I actually need it.
- It should be in **Telugu**, not English — I run a farm, I didn't finish engineering college.
- It should replace my paper diary, not add a second one I have to keep in sync.
- It should tell me something I don't already know (feed advice, disease risk) — not just be a fancier notebook.
- My workers will use the same phone sometimes. It has to not mix up who did what, or leak my other farm's numbers to them.

These aren't abstract — they map directly onto features the team already built: offline queue (`frontend/src/sync/recordSync.ts`), 6-language i18n, decision engines (Feed Advisor, Disease Risk), and RBAC (owner/manager/worker/viewer). Good — the product clearly was designed by someone who talked to farmers like me. The question is whether it holds up in daily use.

### 2. Signing up

I register as **owner**, pick a role, set a password. Immediately I hit friction the team has documented themselves: the app told me "min 8 characters" but the server wanted upper+lower+digit+special-character-from-a-restricted-set. I typed `ramukumar123`, it looked fine on the form, then got rejected in English I couldn't parse. **[PWDVAL-1 — claimed fixed]**. If this is really fixed, great — but this is exactly the kind of first-90-seconds failure that makes a farmer delete the app and tell his WhatsApp group "it's confusing," and that reputational damage doesn't undo when a patch ships two weeks later.

I'm then walked into a **mandatory** farm + pond setup wizard before I can do anything else. I have to enter pond geometry, aerator count and horsepower, species/hatchery/strain, stocking date and density — for every one of my 4 ponds, back to back, in one sitting. That's accurate to how a real onboarding would need to work (you can't give feed advice without geometry and density), but it is a lot to ask before I've seen any payoff. I want to see *something* useful — a dashboard, a sample report — before committing 15 minutes of data entry for 4 ponds.

### 3. The daily loop — this is where the app either earns its place in my pocket or doesn't

Every day I want to log: water quality (pH, DO, temp, ammonia...), feed given, and check for dead shrimp. The center **"+" QuickLog** button is the right idea — one obvious place to start any log, and it's the first thing my thumb finds.

But once I'm in a log form, I notice how much is being asked. Water quality alone: pH, temperature, DO, salinity, ammonia, nitrite, nitrate, alkalinity, hardness, transparency, notes — 10 fields, every single day, per pond, potentially twice a day (morning/evening DO is standard practice). Weekly chemistry log is 7 more fields. Plankton log wants **13 separate plankton-type counts**. Microbiology wants 4 CFU/mL readings. None of this is wrong to *track* — it's exactly what a technical advisor would want — but as a farmer typing on a phone at 6am pondside, this is the single biggest gap between "what the product tracks" and "what I will actually keep typing after week 2." Paper diaries win on friction, not on data quality — Upcheck needs to win on both, or farmers quietly go back to paper for anything beyond the quick stuff.

I do like that there's a **Feeding Tray Check** as its own lightweight log (just tray + remaining-feed-status) — that's the right size for what it is. More of the daily-loop should look like that.

### 4. Trusting the numbers enough to act on them

This is the part that worries me most as a farmer, not as a developer. If I log a DO reading of `2.5` mg/L at 2am (real, urgent — I need to run aerators) and the app buckets it under the *previous day* because of a UTC/day-boundary bug, my night alert history looks wrong and any report built on "readings per day" quietly misattributes the exact reading that matters most for night-time DO crashes. **[DATE-1 — claimed fixed]**. I have no way to verify this myself in the field — I just have to trust the number displayed. This is a case where "looks right" and "is right" are invisible to the end user, which is exactly why it's rated a P1 in the team's own tracker.

Similarly: I expect that if I enter `999` for pH by mistake (fat thumb, glare on screen), the app tells me immediately, not lets it silently trip a false "critical DO" alert three screens later that makes me distrust the whole alert system. **[VALID-1 — claimed fixed, range bounds added]**. If a farmer gets burned by one obviously-wrong "URGENT" push notification caused by a typo, they mute notifications forever — that's a much bigger loss than the one bad reading.

### 5. Losing my own data — the thing that would make me stop using this app entirely

Twice a week I have no signal at the pond. The app says "Saved ✓" when I log offline — I trust that message completely, because a farmer has no mental model of "queued vs synced." If that record silently vanishes on reconnect because my login token expired while I was offline, I have lost real work and don't know it — worse, I *think* I have a complete week of readings when I don't, and I make feeding/harvest decisions on a gap I can't see. This exact failure mode (`SYNC-1`) was rated 🔴 BLOCKER by the team's own audit, alongside a related bug where the offline queue isn't tied to which user is logged in — meaning if my worker logs in on my phone after me, his queued readings could get attributed to me, or mine dropped, because **"shared phones are the norm for farm workers in India"** (their words, and they're right — my two hired hands share one phone between them). **[SYNC-1, SYNC-4 — claimed fixed]**.

I want to flag: these are the single highest-consequence findings in the whole product from a farmer's point of view — more damaging to trust than any UI polish issue — precisely because they're invisible until the moment they cost you real money or a wrong disease call, and by then you don't trust anything the app told you all season.

### 6. The decision engines — the actual reason I'd pay for this

Feed Advisor, Harvest Timing, Disease Risk, Aeration adequacy, Lunar molt-risk — this is genuinely differentiated. No paper diary tells me "your ammonia trend + this lunar phase means elevated molt-risk, watch for soft shells." If these engines are accurate, this is the feature that justifies the whole app to a skeptical farmer. My one worry: if the underlying data (water quality, feed, sampling) is incomplete because logging fatigue set in (see §3), these engines are running on gappy inputs and I won't know it — a wrong-but-confident recommendation is worse than no recommendation, because I'll act on it.

### 7. Disease and treatment — where "advice" becomes regulatory

The disease encyclopedia + symptom-based diagnose tool + treatment log with **banned-substance warnings** matters a lot in my world — export markets reject shipments over banned antibiotic residue, and a warning at the point of choosing a treatment is genuinely valuable. But I noticed (and the team's own audit confirms) the banned-substance check was **client-only** — meaning it's a warning built into the app version I happen to have installed, not a live authoritative list, and technically bypassable. If MPEDA/CAA update the banned list mid-season, an un-updated app gives me false confidence. **[BANNED-1 — server list added, write-time flag explicitly deferred]**. For a compliance-adjacent feature, I'd want to know this is airtight before I rely on it for something that could get my shipment rejected.

### 8. Money — this is what convinces my brother to keep paying for the subscription

Per-cycle expenses, farm transactions ledger, crop P&L with CoP/kg and ROI — this is the feature that turns "nice logging tool" into "I can see whether this crop actually made money," which is the single question every farmer actually cares about at day 90. Two things stood out from the audit trail as previously *completely broken*, not just buggy: the Inventory "add item"/stock-adjustment button used to be a literal do-nothing stub (`Alert.alert`), and the harvest "mark complete" flow was broken. **[both claimed fixed in REMEDIATION_STATUS.md]**. If either of these regresses, it's catastrophic for trust — a farmer who taps "add item" and gets a toast that does nothing assumes the whole app is fake, and a broken harvest-completion flow means the single most important event of the season (getting paid) doesn't record correctly.

### 9. Language — this is not a nice-to-have, it's the product

I switch to Telugu. Some screens are still in English: diagnose, finance break-even, reports, pond dimension history, feeding-tray, password reset, the "add a worker" prompt on Home, member roles, tasks (`docs/I18N_TELUGU_TODO.md`). For a farmer who picked Telugu specifically *because* they can't read English fluently, hitting an English wall on **finance** and **diagnose** — arguably the two highest-stakes screens in the app — is worse than if the whole app were English-only and consistent about it. Partial translation reads as broken, not as in-progress.

### 10. Sharing the app with my workers

My workers get the "worker" role — they should log data but not see money or manage the team. I like that this exists as a real permission model (owner/manager/worker/viewer capabilities), not just a UI toggle. It also quietly implies a fourth persona the team clearly designed for: a **viewer** role for "banks/insurers/consultants" — external stakeholders who might want read-only visibility into my farm for a loan or insurance claim. That's a smart, under-marketed feature if it works — verifiable farm records are exactly what a bank wants before financing a crop.

---

## Part 2 — Product Manager synthesis

*Perspective: reviewing the above farmer narrative plus the app's own self-reported audit trail as a PM with technical fluency. Findings are ranked by (impact to farmer trust/retention) × (likelihood of recurrence), not by engineering neatness. Each includes a recommended action sized for either a human dev or an AI coding agent to pick up directly.*

### How to read this list
- **Impact** = what happens to the farmer if this goes wrong, in their terms, not ours.
- **Confidence** = is this a fresh finding from the persona walkthrough, or a re-flag of an item the repo's own audit already claims is fixed (in which case the action is "verify," not "fix").
- **Effort** = rough sizing for a single focused work session.

| # | Finding | Impact on farmer | Confidence | Effort | Recommended action |
|---|---|---|---|---|---|
| 1 | Offline sync data-loss / mis-attribution on shared devices (`SYNC-1`, `SYNC-4`) | Silently loses logged readings or misattributes them between workers sharing one phone — corrupts the exact trust the app is built on | Re-flag, claimed fixed — **needs independent verification**, not just self-report | M — write an integration test that force-fails a token refresh mid-drain with a non-empty queue and asserts zero data loss and correct user attribution | Run/extend `offlineLifecycle.test.ts` against real field conditions (airplane-mode toggling, user-switch mid-queue) before trusting the ✅. This is the single highest-leverage QA pass available — everything else in the app is downstream of "did my reading actually save." |
| 2 | Daily logging field burden (10-field water quality, 13-field plankton, 7-field chemistry, every day, per pond) | Farmers who felt this friction quietly regress to paper for anything beyond the quickest logs; app becomes a "sometimes" tool instead of a daily habit | New finding | M–L | Add a "quick mode" per log type: 2–3 headline fields visible by default (e.g. pH/DO/temp for water quality) with an "add more" expander for the rest. Consider smart defaults/last-value pre-fill for fields that change slowly (alkalinity, hardness). Track completion rate per field to find the ones nobody fills in and cut them from the default view. |
| 3 | Partial i18n coverage, concentrated on high-stakes screens (finance, diagnose) | A Telugu-selecting farmer hits English on the two screens where a misread number/word has real money or health consequences | Re-flag from `docs/I18N_TELUGU_TODO.md` — appears genuinely still open, not claimed fixed | S per screen, but needs a real bilingual reviewer, not machine translation (the repo's own TODO doc says this explicitly) | Prioritize finance + diagnose + auth-reset translation completion before any other locale work; these are the screens where partial translation does the most trust damage per english string. |
| 4 | Onboarding requires full multi-field setup (geometry, aerators, species, stocking) for every pond before any payoff is shown | Owner drops off mid-setup on pond 2 of 4, especially with a shared/slow phone, before ever seeing the value the app promised | New finding | M | Let a new owner complete just pond #1 in the wizard and land on a real (if sparse) Home dashboard immediately; queue "finish setting up your other ponds" as a persistent but dismissible nudge rather than a gate. |
| 5 | Banned-substance guardrail write-time enforcement deferred (`BANNED-1`) | A treatment record that should carry a compliance warning may not, if the client's cached list is stale — farmer has false confidence going into an export-market shipment | Re-flag, explicitly deferred by the team, not fixed | M — needs a schema migration on the treatment/chemical/disease record services (team's own note) | Prioritize this above other P1/P2 backlog items given the actual regulatory blast radius (shipment rejection) versus most other findings' blast radius (bad UX). |
| 6 | Password / signup validation mismatch between client and server (`PWDVAL-1`) | First-90-seconds failure in a language the farmer may not read fluently; directly costs signups | Re-flag, claimed fixed | S — verify with a parity test (any password client accepts, server accepts, and vice versa) across all 6 locale error strings | Add the parity test the team's own acceptance criteria describes if it doesn't already exist; this is cheap insurance against the highest-visibility possible bug (can't even sign up). |
| 7 | UTC vs. IST day-boundary bucketing for night-time readings (`DATE-1`) | Misattributes exactly the readings that matter most (pre-dawn DO crashes) to the wrong day in reports/harvest plans — invisible to the farmer, corrodes report trust silently | Re-flag, claimed fixed | S — a fixed-clock test around the 00:00–05:30 IST window is cheap and exactly what would have caught this originally | Verify test coverage exists and actually exercises the boundary, not just "code path was touched." |
| 8 | Decision engines (Feed Advisor, Disease Risk, Harvest Timing) run on whatever data completeness the farmer actually achieved, with no visible confidence/data-completeness indicator | A confident-looking recommendation built on 40%-complete logging is more dangerous than no recommendation, because farmers act on confident UI | New finding | M | Surface a lightweight "based on N of last 7 days logged" or similar completeness qualifier on engine outputs, so the farmer calibrates trust instead of assuming full confidence. This directly compounds finding #2 — fixing logging friction improves engine trustworthiness for free. |
| 9 | Inventory "add item" and harvest "mark complete" were previously non-functional stubs | Tapping a core action and having nothing happen (silently, or a fake success toast) is the single fastest way to make a farmer conclude "this app is fake" | Re-flag, claimed fixed | S — targeted regression test per flow (add-item persists a real row; harvest-complete transitions cycle state and appears in Reports) | These are exactly the two flows I'd manually click-test on every release going forward — they're both terminal, high-stakes actions (stocking a purchase, closing out a season) where silent failure is worst. |
| 10 | Accessibility: sparse labels, no large-font handling (`A11Y-1`) | Older farmers on OS-level large-font settings may have core controls clipped or unusable with screen readers | Re-flag, partially deferred (large-font QA explicitly noted as manual-pass-pending) | M — requires actual device QA pass, not just code review | Schedule a real device pass at 150%/200% OS font scale on the 5 daily-loop screens (Home, QuickLog picker, Water Quality log, Feed log, Alerts) before next release; this is precisely the persona ("older farmer's phone") the team already named but hasn't closed. |
| 11 | Brand/terminology inconsistency: "crop" vs "cycle" used interchangeably in code/UI; brand name spelled two ways (audit-noted) | Small, but it's the kind of inconsistency a literate but non-technical farmer notices and reads as "not a serious product" | Re-flag, claimed fixed | S | Grep for both terms across frontend strings and settle on one (recommend "crop" — matches farmer vocabulary better than "cycle") as a lint-enforced convention. |
| 12 | Redis in-memory fallback = per-instance 2FA/nonce state (`INFRA-1`) | Invisible to the farmer today (single-instance), but silently breaks 2FA/OTP correctness the moment the backend scales horizontally — a growth-triggered outage, not a launch-day one | Re-flag, claimed fixed as a startup warning only | S now, but revisit before any horizontal-scaling decision | Track as a scaling gate, not a closed item — the "fix" so far is a warning, not a real fix (needs a shared Redis instance before scaling backend replicas). |

### Cross-cutting theme (the one thing to fix first if only one thing gets fixed)

Every top-ranked item traces back to one root tension: **the app's differentiators (decision engines, financial reports, disease tracking) are only as good as the daily logging discipline of a farmer standing at a pond with a phone that sometimes has no signal.** The offline-sync integrity findings (#1) and the logging-friction findings (#2, #8) are the same problem seen from two angles — data reliably getting *in*, and data being *worth entering*. Fix those two, and the rest of the product (which is otherwise well-scoped and clearly built with real farmer constraints in mind — offline-first, 6 languages, shared-device awareness, RBAC for owner/worker/viewer) has room to actually prove its value. Fix UI polish first and skip these, and the app is a beautiful tool nobody trusts with their season's data.

### What this product already gets right (don't lose this in the rush to fix bugs)
- Offline-first was a design *intent*, not an afterthought — the write-queue architecture is the correct shape even where its edge cases needed hardening.
- RBAC with a named external "viewer" persona (bank/insurer/consultant) is a genuinely underused growth lever — verifiable farm records could be marketed directly to input suppliers or lenders as a trust product, not just an internal logging tool.
- The decision-engine layer (Feed Advisor, Lunar molt-risk, Aeration adequacy, Disease early-warning) is real differentiation versus "just a form app" — competitors that are pure data-entry tools don't have this.
- The team's own remediation discipline (structured severity tiers, acceptance criteria, allow/deny test pairs for every security-adjacent fix) is a healthy engineering culture signal — the findings above are best read as "verify the self-report," not "the team doesn't know what they're doing."

---

## How to use this document

- **Human PM/eng lead:** use Part 2's table as a sprint-planning input directly — each row has enough context to write a ticket without re-deriving the "why."
- **AI coding agent:** each Part 2 row names concrete files/services from the existing `LAUNCH_REMEDIATION.md`/`REMEDIATION_STATUS.md` trail where applicable; start any fix by re-reading those files' cited paths before writing code, since several rows are "verify a claimed fix," not "build new."
- **Re-running this analysis:** re-walk Part 1 after any release that touches onboarding, logging forms, sync, or the finance/disease screens — those are the four areas where farmer trust is won or lost fastest.
