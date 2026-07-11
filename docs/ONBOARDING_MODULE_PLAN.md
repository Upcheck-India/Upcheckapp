# Upcheck — User Onboarding Module: Research, Ideation & Plan

> **Date:** 2026-07-11
> **Companion doc:** `docs/UI_UX_AUDIT.md` — the broader UI/UX audit this was spun out of; onboarding surfaced as the single highest-leverage upgrade area during that audit.
> **Scope note:** this covers the *user*-facing onboarding module (a new farmer's first experience). `docs/ONBOARDING.md` is a *developer* onboarding doc (fresh clone → running the codebase) — unrelated, not touched here.
> **Maintenance:** re-run the "current state" research below after any onboarding-related change lands, so this plan doesn't drift from reality the way a couple of other docs in this repo already had (see the Plankton field-count correction in `docs/LATEST_TASKLIST.md` §11.1 — stale docs describing onboarding are exactly the kind of thing that should get fixed here, not repeated elsewhere).

---

## Part 1 — Research: what onboarding actually is today

### 1.1 The full current flow, step by step

1. **Signup (`RegisterScreen.tsx`)** — email/password, first/last name, and a **required accountType choice: Owner vs. Worker**, shown as two cards with a one-sentence description each. A small `LanguagePill` (globe icon) sits top-right, opening a language-picker modal — the *only* place language is offered before a farmer is fully inside the app.
2. **Email verification** — a "check your email" interstitial (no onboarding content).
3. **Owner path:** on first login, `pendingFarmSetup` is `true` (set at signup from `accountType==='owner'`), which forces the app to open on **CreateFarm** instead of Home, via a check in `RootNavigator.tsx`. This applies **regardless of how they signed in** — email/password, Google, Truecaller, or OTP all funnel through the same gate.
4. **CreateFarm** — name, planned pond count (required during this forced first-run), address, area, water source, GPS. On submit, `pendingFarmSetup` is cleared **immediately** (not after pond setup finishes) and the app navigates into `PondSetup` with `MainApp` already sitting underneath it in the stack.
5. **PondSetup** — a per-pond wizard (geometry, dimensions, aerator count/HP, species/strain/hatchery, stocking date/density), repeated once per planned pond, with a "Finish Later" link on every step that jumps straight to `MainApp`.
6. **Worker path:** an invited worker (added by an owner via `AddWorkerScreen`, which assumes the worker **already has an account** — there's no invite-link/pre-registration flow) never sees any of steps 3–5. `pendingFarmSetup` is never set for `accountType==='worker'`, so they land straight on Home with **zero explanation of their role, zero task guidance, zero gate of any kind.**
7. **First Home visit (any account type):** if the user has zero farms and hasn't seen `WelcomeScreen` yet, Home force-navigates there. `WelcomeScreen` is a single static screen (deliberately not a swiper) — logo, 3 icon+text value props, "Create farm" CTA, "Skip" (which just `goBack()`s to an empty Home — it doesn't route anywhere forward). **No language picker exists on this screen.**
8. **Ongoing guidance on Home**, and this is genuinely all that exists: a dismissible "finish setting up your ponds" nudge (added in this session, `docs/LATEST_TASKLIST.md` §13) if fewer ponds exist than planned, and a "Log now" card shown only to workers. No checklist, no progress indicator, no tips.
9. **Help/About**, reachable via More → Help: a static 6-topic "quick guide" (one title + one sentence each, no expandable content, no images/video, no FAQ) plus a mailto contact link. About is pure version/legal boilerplate.

### 1.2 What genuinely doesn't exist today

- **No product tour, tooltip/coachmark library, or interactive walkthrough anywhere** (confirmed: zero matches for "tour/walkthrough/coach/spotlight/tooltip/shepherd" across `package.json` dependencies and the onboarding screen files).
- **No sample/demo data** a new farmer could explore before committing real farm data.
- **No role explanation for workers** — a worker literally never sees any copy explaining what the app expects of them, what "logging" means, or how their view differs from an owner's.
- **No language choice at the moment it matters most** (Welcome screen, first thing a new user reads).
- **No "getting started" checklist or activation-progress indicator** beyond the single pond-count nudge.
- **No PRD or activation-strategy document exists anywhere in this repo** — the closest thing is `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md`'s persona narrative, which already flagged the pond-setup-gating problem (now fixed) but didn't scope a full onboarding redesign.

### 1.3 What's already good and should be preserved

- The deliberate restraint on Welcome (one screen, no swiper, "for robustness") is a correct instinct for a low-connectivity, possibly-low-literacy audience — a multi-page tour with lots of imagery would cost load time and reading effort for uncertain payoff. Any redesign should keep this restraint, not undo it.
- The "Finish Later" escape hatch and the fact that `MainApp` always sits underneath onboarding screens in the navigation stack (so backing out never dead-ends) is exactly the right architectural pattern — extend it, don't replace it.
- Owner/worker being a first-class distinction at signup is the right foundation for role-specific onboarding — it just isn't used for anything beyond routing yet.

---

## Part 2 — Ideation: what could this become

Below are distinct concepts, not a single locked design — the point of ideation is to lay out real options with honest tradeoffs before committing to a plan.

### Concept A — "Language-first Welcome"
Make language selection the literal first interaction, before any value-prop copy renders. A full-screen language grid (native-script labels, large touch targets, no reading required to recognize your own script) appears before the current Welcome content, with the chosen language persisting immediately (not just for this screen). This directly fixes the single biggest gap found in the audit and requires no new content — just resequencing what already exists (the `LanguagePill` modal's picker UI can likely be reused/adapted).
*Tradeoff:* one extra screen before Welcome's CTA — but it's a near-zero-reading tap-to-select, not a form, so the cost is low relative to the payoff.

### Concept B — "Role-aware first run"
Split the first-run experience explicitly by `accountType`, since the data model already distinguishes them:
- **Owner:** current Welcome → CreateFarm → PondSetup flow, unchanged in substance, but each step gets one added sentence of "why" (e.g., PondSetup's header could say "This helps us calculate feed and stocking advice for you" rather than presenting a bare form).
- **Worker:** a **new, short (2–3 screen) worker-specific first-run** — "You've been added to [Farm Name] by [Owner Name] as a [Role]," a one-screen explanation of what daily logging looks like for their role (with a screenshot/preview of the actual Log screen, not just text), and a direct CTA into `QuickLog`. This closes the "worker gets zero onboarding" gap identified in research.
*Tradeoff:* real net-new screens and copy to write (in 6 languages) — the highest-effort concept here, but it directly addresses a currently-total gap (workers get *nothing* today), not just a suboptimal experience.

### Concept C — "Getting Started checklist on Home"
Replace/extend the single pond-setup nudge with a small, dismissible, multi-item checklist card that tracks real activation milestones: "Create your first farm" ✓ → "Add your first pond" ✓ → "Log your first water quality reading" ○ → "Invite a worker" ○. Each item is a real, checkable action, not just a reminder. This gives new owners a sense of progress and surfaces the *next* useful action without a forced tour.
*Tradeoff:* needs a small amount of new state-tracking (has this farm logged anything yet? has it invited anyone?) — moderate backend/frontend work, but reuses data that mostly already exists (farm/pond/log counts).

### Concept D — "Preview before commit" (sample pond)
Let a brand-new owner explore one **pre-populated example pond** (fake but realistic data — a sample water-quality history, a sample Feed Advisor recommendation) *before* being asked to fill in their own real pond's geometry/species/stocking details — so they see the payoff (decision-engine output, dashboards) before paying the setup cost. The example pond is clearly labeled as a demo and easy to dismiss/replace.
*Tradeoff:* meaningfully more engineering than the others (a demo-data seeding path, careful UI labeling so a farmer never mistakes demo data for their own) — highest payoff on "show value before asking for setup effort" but the most novel build.

### Concept E — "Contextual, not upfront, tours"
Instead of any traditional walk-through, embed small **one-time, dismissible inline hints** the first time a farmer reaches a genuinely new concept — e.g. the first time they open Feed Advisor, a single dismissible line: "This uses your last water quality reading — no need to search for it." The first time they see a `ConfidenceChip`, a one-time tooltip explaining what the score means. This spreads "teaching" across the first week of real use instead of front-loading it into a tour nobody reads carefully on day one.
*Tradeoff:* requires a small first-use-per-feature tracking mechanism (AsyncStorage flags per hint, similar to the existing `ONBOARDING_FLAG` pattern) — cheap per-hint, but many hints add up in content-authoring effort (6 languages each).

### How these compose
These are not mutually exclusive — the recommended plan below combines **A** (cheap, highest first-impression payoff, do it first), **B**'s worker half (closes a total gap, not just a rough edge), **C** (extends work already done this session), and treats **D** and **E** as valuable but larger follow-on investments once the cheaper wins are shipped and measurable.

---

## Part 3 — Recommended plan

### Phase 1 (do first — small, high-impact, no new infrastructure)

1. **Add language selection to the true first screen.** Insert a language-choice step before `WelcomeScreen`'s value-prop content renders (or make it the first visible element on Welcome itself, above the fold, not a corner chip). Persist the choice through the existing i18n mechanism immediately. This is the single highest-leverage, lowest-effort fix identified in the entire audit.
2. **Give the worker path *something*.** At minimum: when a worker logs in for the first time (detectable — no prior session, `accountType==='worker'`, has at least one farm membership), show a single, short interstitial: "You're part of [Farm Name]'s team as a [Role]. Tap 'Log now' anytime to record today's readings." This is a one-screen, low-effort version of Concept B's worker half — closes the "zero onboarding" gap without yet building the fuller 2–3 screen version.
3. **One added sentence of "why" per PondSetup step.** No new screens — just a header subtitle on each step explaining what the data enables (e.g., "Aerator info helps the Aeration engine calculate power cost and adequacy"). Cheap, and directly counters the "wall of unexplained fields" friction noted in `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md`.

### Phase 2 (do next — moderate effort, extends what Phase 1 and this session's Task 7 work already built)

4. **Build the "Getting Started" checklist** (Concept C) as a direct evolution of the finish-setup nudge already shipped this session (`docs/LATEST_TASKLIST.md` §13) — same dismissible-card pattern, same "reappears until resolved" persistence model, just with more milestones tracked (first pond, first log, first worker invited) instead of only pond count.
5. **Fix Morning Briefing / Daily Routine's overlapping role** (flagged in `docs/UI_UX_AUDIT.md` Tier 1 #2) as part of this phase, since a redesigned onboarding that successfully gets a farmer to Day 2 needs a coherent "what do I do today" landing spot to hand them off to — these two efforts should land together, not independently.

### Phase 3 (bigger bets — plan, don't build yet, without a product-owner decision)

6. **Evaluate Concept D (sample/preview pond)** — the highest-payoff, highest-effort option. Needs an explicit decision from whoever owns product direction: is showing decision-engine value *before* setup worth the engineering cost of a safe, clearly-labeled demo-data path? Flagging as a real option, not silently building it.
7. **Evaluate Concept E (contextual first-use hints)** as an ongoing content investment once Phases 1-2 are live and there's real usage data to know which features actually confuse new users enough to warrant a hint.

### What this plan deliberately does NOT include
- No multi-page swiper tour — the existing single-screen Welcome restraint is correct for this audience and connectivity profile; don't undo it.
- No mandatory tutorial that blocks reaching the app — every existing escape hatch ("Finish Later," `MainApp` always underneath) must be preserved in any new onboarding screens added.
- No redesign of the actual signup form fields — the accountType-first structure is sound; the gap is entirely in *what happens after* the choice is made, not the choice itself.

---

## Part 4 — How to know it worked

Since no analytics/activation-metrics infrastructure was found during research, before building Phase 1 it's worth deciding (even informally) what "better onboarding" should move:
- % of new owners who log at least one reading within 24 hours of farm creation (the real activation moment — not "created a farm," but "used the app for its actual purpose").
- % of invited workers who complete their first log within their first session (currently likely very low given zero guidance exists).
- % of owners who complete pond setup for *all* planned ponds within a week (directly measurable via the same `plannedPondCount` vs. actual-pond-count comparison the Phase-1/Task-7 nudge already computes).

None of these require new backend infrastructure to start tracking manually (a one-off query against existing farm/pond/log timestamps could answer all three today) — worth doing before and after Phase 1 ships to actually confirm the fix helped, rather than assuming it did.
