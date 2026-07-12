# Upcheck — Full UI/UX Audit & Upgrade Report

> **Date:** 2026-07-11
> **Method:** Full-repo investigation across the design-system layer (theme, shared component kit, navigation IA, iconography, loading/empty/error patterns, accessibility) and hands-on review of every major farmer-facing flow (daily logging, decision engines, pond/farm management, daily-routine entry points, reports, disease diagnosis, onboarding, settings). Written from the same farmer-persona lens as `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md`, but focused specifically on visual design, interaction quality, and information architecture rather than backend correctness.
> **Companion doc:** `docs/ONBOARDING_MODULE_PLAN.md` — a dedicated deep-dive and rebuild plan for first-run onboarding, since that surfaced as the single highest-leverage upgrade area.
> **Maintenance:** like the other analysis docs in this repo, re-run this audit after any major screen redesign or design-system refactor — a stale "what's good/bad" snapshot is worse than none.

---

> **Update (2026-07-11, same day):** most of Tier 1 and several Tier 2/3 items below were implemented the same day this audit was written — see the **Status** column in each tier's table for what's done, deferred (with reasoning), or still open. The findings text itself is left as originally written (an accurate record of what was found), not rewritten past-tense, so this remains a readable audit report and not just a changelog.

## Executive summary

Upcheck has a **real, fairly mature design-system intent**: a 16-step typography scale (not a lazy 2-3 sizes), a 4px spacing scale, a 7-step radius scale, a 5-step elevation system, one consistent icon family (`MaterialCommunityIcons`, zero mixing with other icon sets across 106 files), and a component kit (`Button`, `Card`, `EmptyState`, `ErrorState`, `Skeleton`, `ChipGroup`, `ConfidenceChip`, `SelectField`) that is, where used, genuinely well-token-driven and accessible.

But execution has **drifted in several places that read as patchwork rather than a coherent system**, and — more importantly for a farmer-facing product — **the app's information architecture and daily-entry-point design don't yet reflect what a real farmer actually needs first**. The single most valuable "next level" upgrade isn't a visual polish pass; it's fixing the gap between "what the app is capable of" and "what the app puts in front of a farmer at the moment they open it."

**Top 5 findings, ranked by farmer impact:**

1. **The most farmer-critical screen (`DailyRoutineScreen` — the actual "what do I do today" checklist) is buried 3 taps deep** (Home → Farm → Pond → action chip), while the top-level "Morning Briefing" screen that a farmer *would* expect to be that entry point only shows alerts and goes blank ("all clear") on a normal day. Two screens compete for the same "daily" territory with different content models and neither is where it needs to be.
2. **No language selection exists anywhere in the actual first-run experience** (Welcome screen, pond setup) — only a small globe chip on the pre-auth Login/Register screens, easily missed, and otherwise buried 3 taps deep in Settings under a generic "More" menu. For an app whose stated differentiator is 6 Indian languages, this is the single biggest first-impression risk.
3. **Two dead/duplicate systems sit in the codebase pretending to be finished**: a legacy teal color palette (`theme/colors.ts`, zero imports) alongside the real blue palette, and a fully-built-then-abandoned dark mode (self-documented in a code comment as "removed — was exported but never rendered"). Neither breaks anything today, but both are exactly the kind of half-finished implementation that confuses the next person who touches this code.
4. **Three parallel, subtly different "numeric input" components** (`Input`, `ParameterInput`, `NumberField`) with different border widths, radii, and status-color logic — a farmer moving from a daily log screen to a decision-engine screen sees a subtly different-feeling text field for the exact same "enter a number" task, with no shared reason for the difference.
5. **Accessibility debt is real and unaddressed**: `allowFontScaling` appears **zero times** anywhere in the codebase (older farmers on large-font settings will see clipped text), and only ~17% of tappable elements outside the core `ui/` kit carry an `accessibilityLabel` — meaning most icon-only buttons on actual screens (as opposed to the shared component kit, which does this well) are silent to a screen reader.

None of this is a "redesign the whole app" problem. It's a **"finish what was started, and re-prioritize the first 60 seconds"** problem — which is good news, because it's fixable incrementally without a rewrite.

---

## Part 1 — Design system audit

### 1.1 Theme layer (`frontend/src/theme/*`)

**What's good:**
- Typography is genuinely strong: 3 font families (Nunito for headings, DM Sans for body/labels, DM Mono with tabular-nums for numeric data like FCR/weight/currency — the right call for a farm-metrics app) across 16 named steps. This is the strongest single piece of the design system.
- Spacing (4px-based, `spacing[1]`→`spacing[24]`), radius (7-step, `xs`→`full`), and shadows (5-step elevation + a dedicated `brandGlow` for CTAs/FAB) are all clean, sensible, and consistently named.
- `tokens.ts` centralizes component-level specs (button/input/card/chip/tabBar geometry) — good practice in principle.

**What's broken or half-finished:**
- **Two competing color systems.** `theme/colors.ts` exports a legacy teal `Colors` object (`primary: '#00897B'`, commented "Design System §2.1"); `theme/colorRoles.ts` exports the actual-in-use blue `light` palette (`primary: '#0D84D6'`). Zero files anywhere import from `theme/colors` or do `import { Colors }` — the entire teal system is dead code left in the tree, not deleted.
- **Dark mode was built and then abandoned**, and the codebase says so directly — a comment in `colorRoles.ts` reads: *"dark palette removed — was exported but never rendered (no useColorScheme hook, all 118 screens hardcode roles.light, StatusBar fixed dark-content). Re-add alongside a real useTheme()/useColorScheme() wire-up if dark mode ships."* Every single screen reads `theme.roles.light.*` directly and hardcodes light-mode assumptions (fixed dark-content status bar, etc.).
- **`tokens.ts` duplicates values instead of referencing them** — e.g. `tokens.input.borderColor: '#E0E8EC'` is a hand-copied literal of `colorRoles.light.borderDefault`, not a reference to it. If one changes, the other silently drifts out of sync.
- **118 raw hex-color matches outside the theme system**, concentrated in `PondDashboardScreen.tsx` (~58 instances alone) using a *third*, unrelated Material/Tailwind-style gray/color palette (`#9CA3AF`, `#111827`, `#4CAF50`, `#2196F3`, `#7C4DFF`) that has nothing to do with the app's actual blue/brand tokens. Other offenders: `ErrorBoundary.tsx`, `TruecallerLoginButton.tsx`, `EnginesHubScreen.tsx`, `FeedLogScreen.tsx`, `MortalityHistoryScreen.tsx`, `WaterQualityHistoryScreen.tsx`, `QuickLogScreen.tsx`, `WelcomeScreen.tsx`. This is the clearest sign that a handful of screens (notably the very high-traffic `PondDashboardScreen`) were built or last touched before the token system matured and never got migrated.

### 1.2 Shared UI component kit (`frontend/src/components/ui/*.tsx`)

**What's good:** The core kit — `Button`, `Card`, `EmptyState`, `ErrorState`, `Skeleton` (+ Card/List/Grid/Avatar/Metric variants), `FAB`, `ChipGroup`, `SelectField`, `ConfidenceChip`, `AlertBanner` — is exclusively theme-token-driven (zero hardcoded hex found in any of them) and mostly well-accessible. `Button` correctly wires `accessibilityRole="button"` + `accessibilityLabel` + `accessibilityState={{disabled, busy}}` across all three variants (primary/outlined/text). `ChipGroup`'s own code comment cites a real internal spec ("UPCHECK_DESIGN_SYSTEM.md — icon + label, theme tokens, ≥44dp targets, a11y"), meaning a real design-system document exists and at least some components genuinely honor it.

**What's fragmented:**
- **Three parallel numeric-input components with no shared base and inconsistent specs:**
  | Component | Radius | Border | Status coloring | Where used |
  |---|---|---|---|---|
  | `Input.tsx` | 12 (md) | 1.5 | none | general forms |
  | `ParameterInput.tsx` | 12 (md) | 1.5 | safe/warning/critical + icon | daily water-quality logs |
  | `NumberField.tsx` | 8 (sm) | 1 | none | decision-engine screens |

  A farmer moving from a Water Quality log (`ParameterInput`) to the Feed Advisor engine (`NumberField`) is looking at two visually distinct-feeling text inputs for the identical task of "type a number." There's no product reason for this difference — it's an artifact of three components evolving independently.
- **Inconsistent status vocabulary across the app**: `AlertBanner`'s `type` prop uses `warning|critical|info`; `ConfidenceChip`'s `confidence.band` uses `high|medium|low`; `ParameterInput`'s status uses `safe|warning|critical|none`. Three different words for what is conceptually the same "how worried should I be" signal, scattered across three components with no shared enum.
- **`FAB` defaults its accessibility label to the hardcoded English string `'Add'`** when no explicit label is passed — inconsistent with the rest of the app, which runs everything through `t()`. On a Telugu-language device, a screen reader would announce "Add" in English for any FAB that forgot to pass a translated label explicitly.

### 1.3 Navigation / information architecture (`frontend/src/navigation/*.tsx`)

**What's good:** The top-level shape is sensible — 4 bottom tabs (Dashboard, Farms, Reports, More) plus a center "+" QuickLog action, with everything else (farms/ponds/cycles, 10 logging screens + 10 matching history screens, calculators, simulations, engines, settings, disease library, tasks, news, shop, finance, harvest planning — ~90 screens total) pushed onto one root stack. This matches a farmer's real mental model reasonably well at the top level.

**What's a genuine problem:**
- **"More" is a confirmed junk drawer.** `MoreScreen.tsx` lists **14 unrelated destinations in one flat, ungrouped list**: Profile, Settings, Notifications, Calculators, Simulations, Reports, Disease Encyclopedia, News, Reference, My Farms, Inventory, Shop, Feed Products, Help, About, plus Sign-out. Two of these — **"My Farms" and "Reports"** — are exact duplicates of existing bottom tabs, which is a direct navigational redundancy, not just a density problem.
- Minor cruft: `Terms`/`PrivacyPolicy` appear registered twice in the root stack with no explanatory comment (unlike the deliberate, commented `ResetPassword`/`TwoFactorChallenge` dual-registration for `DEEPLINK-1`), suggesting accidental copy-paste rather than an intentional pattern.

### 1.4 Iconography & the "no emoji" principle

**What's good:** Icon consistency is a real strength — `MaterialCommunityIcons` is used in 106 files, with zero uses of any other icon family (`Ionicons`, `FontAwesome`, `Feather`, etc.) anywhere in the codebase.

**What's a small but real slip:** the app has a deliberate "icon-driven, no emoji" principle (documented in `ShrimpLogo.tsx`'s own comment, which explicitly replaces a former 🦐 emoji brand mark), but two auth screens still render raw emoji as `<Text>` instead of icons: `ForgotPasswordScreen.tsx` (✉️) and `RegisterScreen.tsx` (📧) — both in their "check your email" success state. A past emoji-removal effort clearly happened and simply missed these two.

### 1.5 Loading / empty / error state consistency

Across 89 screen files: `EmptyState` is used in 19, `ErrorState` in 27, the shared `Skeleton` family in only **11** (12% of screens), while a raw `ActivityIndicator` is hand-rolled directly in **35** files (39% of screens). The shared components that exist are well-built — but roughly a third of the app bypasses them for a bare spinner, and the `Skeleton` component itself doesn't even use the shimmer-gradient token that was clearly designed for it (`theme/gradients.ts` defines a shimmer gradient; `Skeleton.tsx` just renders a static `opacity: 0.7` block instead). This is a "good system, partial adoption" problem, same shape as the color-token issue above.

### 1.6 Accessibility posture

- `accessibilityLabel`: 35 occurrences app-wide. `accessibilityRole`: 33. `accessibilityState`: 8.
- `<TouchableOpacity`: 205 occurrences.
- `allowFontScaling`: **0 occurrences anywhere in the codebase.**

Even generously assuming every accessibility prop maps to a distinct touchable, at most ~17% of tappable elements carry a label — and that's before accounting for `FAB`s, custom `Pressable`s, and modals that also need labeling. The pattern is consistent with everything above: **the shared `ui/` kit does accessibility well; screens that reach past it for a raw `TouchableOpacity` mostly don't.** Given this app explicitly targets a market where TalkBack usage and large system font sizes are more common (older farmers, varying literacy), this is real, currently-unaddressed debt — not a nice-to-have polish item.

---

## Part 2 — Screen-by-screen UX audit (farmer's-eye view)

*Screens already covered in depth by prior work this session (Water Quality log, Feed log, Home dashboard, Inventory, Harvest Plans, and the 4 decision-engine screens) are summarized briefly here for completeness; full detail lives in `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` and `docs/LATEST_TASKLIST.md` §5/§11–§14.*

### Pond Dashboard — the per-pond hub
**What's good:** The DOC (days-of-culture) ring is the single biggest visual element on the screen and correctly color-codes green→amber→red as the cycle ages — exactly matching its real importance to a farmer. The core-vs-"show more" action-chip split (6 daily actions visible, 8 occasional-clinical ones collapsed) is the single clearest anti-clutter decision in the whole app and should be the model for other dense screens.
**What's clunky:** A Log/History toggle silently changes what all 14 action chips do, with the only indicator being the tab bar well above the chip grid — easy to tap the wrong mode after scrolling. The 4 headline metrics (MBW, survival, biomass, FCR) all render at identical visual weight despite having very different farmer urgency (a lagging calculated ratio vs. a direct actionable sampling result) — nothing signals "this one needs attention now."
**What's missing:** The stale-water-quality alert banner has no direct "log now" button inside it — a farmer has to scroll down to find the same action manually.

### Farms List / Farm Detail — the farm→pond hierarchy
**What's good:** A clean, conventional two-level drill-down with the right at-a-glance numbers on cards (pond count, area, active-cycle presence).
**What's missing:** Pond cards inside Farm Detail show only "Active Cycle" / "No Active Cycle" as bare text — no DOC or stocking-date preview. A farmer managing 5+ ponds has to open each one individually to know how far along any cycle is, which is exactly the summary data that matters most at this list level.
**What's clunky:** Farm Detail's header packs up to 4 unlabeled icon buttons (tasks, add member, transactions, add pond) right next to a name that can already be truncated — a real tap-target guessing game for an icon-recognition-dependent audience.

### Morning Briefing / Daily Routine — the daily entry point (see Executive Summary #1)
**Daily Routine is genuinely the best screen in the app for its purpose** — an `n/3` progress counter and per-step done/undone badges create a real, scannable daily to-do that mirrors the actual operational sequence (check water → get feed advice → log feed → tray check). **But it's buried 3 taps deep** (Home → Farm → Pond → action chip) rather than being a top-level destination. Meanwhile **Morning Briefing**, which sounds like it should be the "open app, see what to do" screen, only shows a cross-pond severity feed and renders a blank "all clear" empty state on any normal day with no routine content at all. Two screens with overlapping names and purpose, neither positioned where a farmer would actually look first thing in the morning.

### Reports / Cycle Analysis — data visualization
**What's good:** Real charts exist (`react-native-chart-kit` bar and line charts, not just number tiles) — important for a partially low-literacy audience. Cycle Analysis's headline-metrics-then-growth-curve layout has the right top-to-bottom priority.
**What's inconsistent:** The core revenue/expense/profit card on Reports is **not** permission-gated the same way the Transactions drill-down row is — a worker without financial-viewing permission still sees full farm P&L on the Reports tab. The farm picker is a plain expand/collapse list with no scroll lock, which pushes all page content down when opened. Feed usage over time — a very natural farmer question — isn't charted anywhere; only FCR/growth-curve exists, and only after already knowing which cycle to drill into.

### Disease List / Diagnose — the encyclopedia and symptom tool
**What's good:** The diagnosis flow is genuinely well-suited to low literacy — chip-based multi-select symptom picking avoids free-text entirely, and results show a plain confidence percentage rather than clinical prose.
**What's missing:** Zero visual aids anywhere in the symptom picker — no icons or illustrations for what a symptom like "gills discolored" actually looks like, which matters most for exactly the low-literacy audience this flow is designed for. Every match renders with identical card treatment regardless of confidence — a 12%-confidence result looks as credible as an 80%-confidence one, differentiated only by a small number in the corner. The diagnosis entry point is only reachable from inside the Disease List search bar, not from the Pond Dashboard's Disease Log chip (which goes straight to logging, not diagnosing) or from Daily Routine — exactly the moment a farmer would want it.

### Welcome screen — the first impression (see Executive Summary #2 and companion onboarding doc)
**What's good:** Deliberately minimal — one screen, no swiper, one clear CTA, one skip. That restraint is the right instinct.
**What's the single biggest gap in the whole app:** **no language selection exists on this screen at all.** A brand-new farmer sees three feature sentences in whatever locale the device resolves to, with zero opportunity to switch before reading them. See `docs/ONBOARDING_MODULE_PLAN.md` for the full treatment of this.

### Settings — language picker prominence
**What's good:** Once you reach Settings, the language picker is correctly the very first section on the page.
**What's the problem:** Getting there requires Home → "More" tab → "Settings" row — 3 taps into a generic catch-all menu, for the single most important accessibility affordance this app has for its actual target market. Language chips also show only the native-script label with no English gloss, so a farmer currently in English trying to find "తెలుగు" by shape alone (rather than by recognizing the word "Telugu") faces a small but real friction point — for exactly the audience this selector serves.

---

## Part 3 — Ranked findings & upgrade roadmap

*Ranked by (farmer impact) × (how cheap/contained the fix is), consistent with the ranking method used in `docs/USER_PERSPECTIVE_PRODUCT_ANALYSIS.md` and `docs/LATEST_TASKLIST.md`.*

### Tier 1 — Do first (high impact, contained scope)

| # | Finding | Recommended upgrade | Effort | Status |
|---|---|---|---|---|
| 1 | No language selection on Welcome/first-run | Add a language picker as the *first* interactive element on `WelcomeScreen.tsx`, before the value-prop copy renders in a possibly-wrong language. See `docs/ONBOARDING_MODULE_PLAN.md` for full design. | S–M | ✅ Done (2026-07-11, onboarding-plan Phase 1) |
| 2 | Morning Briefing vs. Daily Routine — two competing "daily" screens | Merge conceptually: make Morning Briefing surface a per-pond mini-checklist (not just alerts) OR promote Daily Routine itself to a top-level Home destination for the farmer's single active/most-urgent pond, with Morning Briefing becoming the cross-pond alert layer *within* it. Needs a product decision on which screen "wins" the daily-entry-point role — flagging as a decision point, not silently picking one. | M | ✅ Done (2026-07-11, onboarding-plan Phase 2) — merged functionally: alerts still show on a bad day, routine checklist shows on a good day; also discovered and fixed that `MorningBriefingScreen` had **zero navigation entry points anywhere in the app** before this — added a "Today" quick-action on Home |
| 3 | "More" tab duplicates existing tabs (My Farms, Reports) | Remove the two duplicate entries from `MoreScreen.tsx`; group the remaining 12 into 3–4 labeled sections (Farm Tools, Reference, Account) instead of one flat list. | S | ✅ Done (2026-07-11) — the duplicate "My Farms"/"Reports" entries removed; the screen was already sectioned into 4 groups (Account/Tools/Farm/Help) contrary to the original "one flat list" finding, so no further grouping work was needed |
| 4 | `allowFontScaling` never handled anywhere | Add a project-wide default (a themed `Text` wrapper component that sets `allowFontScaling` sensibly, or an app-wide `maxFontSizeMultiplier`) rather than patching per-screen — this is the kind of fix worth doing once, centrally. | M | ✅ Done (2026-07-11) — `frontend/src/theme/fontScaling.ts` sets a global `Text`/`TextInput` default (`allowFontScaling: true`, `maxFontSizeMultiplier: 1.3`), imported once in `App.tsx`; real accessibility scaling preserved, capped so fixed-size chips/badges don't overflow at extreme OS settings |
| 5 | Icon-only touchables outside the `ui/` kit mostly lack `accessibilityLabel` | Sweep screen-level `TouchableOpacity`/icon-button usages (start with the highest-traffic screens: Pond Dashboard, Farm Detail, Home) and add labels; consider a lint rule flagging an icon-only `TouchableOpacity` with no `accessibilityLabel`. | M (ongoing) | Not started — still open, genuinely ongoing work (205 `TouchableOpacity` usages app-wide); do incrementally per high-traffic screen rather than in one pass |

### Tier 2 — Do next (real quality wins, still contained)

| # | Finding | Recommended upgrade | Effort | Status |
|---|---|---|---|---|
| 6 | Three divergent numeric-input components | Consolidate `NumberField` to reuse `ParameterInput`'s visual spec (or vice versa) so the "enter a number" experience is visually identical everywhere; keep the status-coloring logic optional via a prop rather than a fully separate component. | M | **Deferred** — this is a pure visual-appearance change (border width/radius/status coloring) that needs actual on-device or screenshot visual QA to verify it doesn't regress either screen's look; that verification wasn't available in this pass (no build/screenshot capability used this session). Flagging as ready-to-do once visual QA is possible, not silently skipped. |
| 7 | Dead teal color system + abandoned dark-mode code | Delete `theme/colors.ts`'s unused `Colors` export entirely (it has zero importers) rather than leaving it as a trap for a future contributor; either commit to shipping dark mode properly (wire a real `useColorScheme()`/`useTheme()` hook) or delete the dark palette comment/scaffolding so it stops looking like unfinished work. | S (delete) / L (ship dark mode) | ✅ **Delete half done** (2026-07-11) — `theme/colors.ts` deleted along with its one dead import in `theme/index.ts` (confirmed zero other importers first). Shipping real dark mode is still open — correctly a much larger (L) effort requiring a `useColorScheme()`/`useTheme()` wiring pass across all screens, not attempted here. |
| 8 | Inconsistent status vocabulary (`warning/critical/info` vs `high/medium/low` vs `safe/warning/critical/none`) | Define one shared `Severity` type (e.g. `'ok' | 'watch' | 'warning' | 'critical'`) in the theme/tokens layer and have `AlertBanner`, `ConfidenceChip`, and `ParameterInput` all consume it, rather than three parallel enums. | M | Not started — a real refactor touching 3 components' public prop types and every call site; deferred to keep this pass's changes independently reviewable and low-risk rather than bundling a type-signature change with everything else here. |
| 9 | Disease diagnosis: no confidence threshold, no symptom visuals | Add a minimum-confidence cutoff (or explicit "weak match" visual treatment) before showing a result as a real candidate; consider small icon glyphs per symptom category even without full illustrations, as a first step toward visual symptom recognition. | M | ✅ **Confidence-threshold half done** (2026-07-11) — matches below 40% confidence are now visually de-emphasized and labeled "Weak match" in `DiagnoseScreen.tsx` rather than rendered with identical weight to a strong match; they're still shown, never hidden, since a weak lead can still be useful. Per-symptom icon glyphs in the picker itself are still open (a content/illustration task, not a logic change). |
| 10 | Reports' P&L card visible to workers without financial permission | Gate the top-level revenue/expense/profit card the same way the Transactions row already is — a straightforward permission-consistency fix, not a design change. | S | ✅ Done (2026-07-11) — also found and fixed a related correctness bug while implementing this: `getFinancialReport` (owner/manager-only server-side) was called in the same `Promise.all` as the always-visible dashboard summary, so a worker's 403 there was rejecting the *entire* fetch and could show an error state on Reports for a role that should just never see that card. Now caught independently. |
| 11 | `PondDashboardScreen.tsx`'s ~58 hardcoded hex colors from an unrelated palette | Migrate to `theme.roles.light.*` tokens — this is the single highest-value "finish the migration" screen given its traffic. | M | **Deferred** — same reasoning as #6: many of the 61 hex values are legitimate per-category accent tints (matching the established pattern in `EnginesHubScreen.tsx` of a broader categorical color wheel), not all theme-token violations; a correct migration requires distinguishing real duplicates (grayscale/surface colors that should be `textPrimary`/`borderDefault`/etc.) from intentional tints, then visually verifying the result — neither safely done as a blind mechanical pass without on-device QA. |

### Tier 3 — Backlog / polish

- ✅ Done (2026-07-11): Fixed the two remaining emoji regressions in `ForgotPasswordScreen.tsx` / `RegisterScreen.tsx` (replaced with `MaterialCommunityIcons` `email-check-outline`).
- ✅ Done (2026-07-11, via onboarding-plan Phase 1): Added an English gloss under each native-script language chip — done for the new prominent Welcome language selector; the existing `LanguagePill`/Settings picker already showed both native label and English label per option.
- Wire `Skeleton.tsx` to actually use the shimmer gradient token that already exists in `theme/gradients.ts` — still open (visual/animation change, same visual-QA caveat as #6/#11).
- Sweep the 35 screens that hand-roll a raw `ActivityIndicator` toward the shared `Skeleton` family for a more consistent perceived-performance feel — still open.
- Add a "last updated" timestamp affordance to Farms/FarmDetail's 30-second in-memory cache, so a farmer returning from background doesn't see silently-stale data with no cue — still open.
- Chart feed usage over time on the Reports screen (a natural farmer question currently unanswered anywhere) — still open.

### A note on what wasn't attempted, and why

Several Tier 2/3 items (numeric-input consolidation, the PondDashboard color migration, the Skeleton shimmer wiring) are **pure visual-appearance changes** — deferred in this pass specifically because verifying they don't regress a screen's actual look requires on-device rendering or a screenshot tool, which wasn't used this session (consistent with "no local builds"). Everything implemented instead was chosen because it's **verifiable through behavior** — a test can assert a permission gate holds, a duplicate menu entry is gone, a weak match is labeled, dead code has zero importers before deletion — without needing eyes on the rendered screen. This is a deliberate scoping principle, not an oversight: don't ship an unverified visual change and call it done.

---

## What NOT to do

Given how much of the underlying system (typography, spacing, icon family, several core components) is already strong, **this should not become a ground-up visual redesign.** The risk with a UI audit like this is over-correcting into a full rewrite when the actual problem is: (a) a handful of screens never got migrated to the token system, (b) two systems were half-built and abandoned, (c) the information architecture puts the wrong screen first for a farmer's actual daily habit, and (d) accessibility was addressed well in the shared kit but not carried through to screen-level code. All four of those are finishable in place, incrementally, without touching the (good) foundation.
