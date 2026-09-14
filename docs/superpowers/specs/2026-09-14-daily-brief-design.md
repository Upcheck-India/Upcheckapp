# Daily Brief — Design

Date: 2026-09-14 · Status: approved by owner · Ships as backend deploy + OTA (no native build)

## Owner decisions
- **Replaces MorningBriefingScreen** everywhere it is linked, plus a "Your day" card at the top of Home.
- **Reminders**: local notifications ~06:00 "morning brief" and ~19:00 "day wrap"; toggle in Settings.
- **Verdict**: plain verdict sentence **and** a 0–100 Day Score, explained in simple language.
- **Export**: PDF day report **and** a PNG image card. (Plain text share not requested.)
- **Thresholds unified**: one per-species source of truth used by score, alerts and colours.
- All strings in six locales `en hi bn ta te or`.

## Purpose
A farmer wakes up, opens one page, and knows: what carried over from yesterday, what they
are waking up with, what to do today, what is happening/will happen today, whether today is
going well, whether each pond and its shrimp are fine — and at night, how the day went. Any
past day can be opened the same way, exported and shared.
Not a data dump: headline numbers and insights; detail lives on existing dedicated screens
(each block links there).

## Data contract
`frontend/src/api/dailyBrief.ts` is the single contract (types `DailyBrief`, `PondDay`,
`DayScore`, `Reason`, …). Backend must return exactly that shape. Frontend screen and export
both import it. **Do not change the contract without telling the lead.**

`GET /daily-brief?date=YYYY-MM-DD&farmId=<optional>`
- `date` required, IST calendar day, must be ≤ today (IST) and not before 2020-01-01 → else 400.
- `farmId` omitted → all farms the user can READ. Present → assert access.
- Pond scope via `FarmAccessService.getAccessiblePondIds(userId, farmId, 'READ')`.
- Money (`totals.spend/income`) only when the user has VIEW_FINANCIALS on every farm in scope
  (else null) and `canViewFinancials` reflects that.
- Includes ponds with a cycle active on that day (stocking ≤ date ≤ harvest/now) plus ponds
  with any log that day.
- Set-based queries only (a 60-pond account must not fan out per pond). IST day bounds via
  `common/ist-date.ts` (`istDayRangeUtc`); DATE columns compared as dates, timestamptz via range.

## Day Score (approved)
Per pond, per IST day, 100 points from what was logged that day.

| Part | Pts | Rule |
|---|---|---|
| water | 40 | For each parameter logged that day take the worst reading and classify with per-species thresholds: optimal=1, caution=0.5, critical=0. Weights: DO 35%, ammonia 20% (total ammonia zone; free NH3 > 0.3 is critical, > 0.1 caution — worse of the two), pH 20% (min & max; swing > 0.5 in the day ⇒ at least caution), temperature 10%, salinity+alkalinity+nitrite share 15% equally. Only logged parameters count; weights renormalise across logged ones. |
| feeding | 20 | Measured if feed logged OR a tray check logged. 8 pts feed logged; 6 pts tray not `a_lot_left` (tray missing ⇒ those 6 pts unmeasured, renormalise); 6 pts feed ≥ 70% of pond's previous-3-logged-days average (no baseline, or molt peak ⇒ full). |
| health | 25 | Measured if mortality logged, or sampling/harvest/treatment logged. Daily deaths ÷ livePopulation: ≤ 0.1% full; 0.1–0.3% caution (half); > 0.3% critical (0). Spike: deaths > 3× pond's 7-day daily average (and ≥ 10 animals) ⇒ at least caution. Banned-substance treatment ⇒ critical. Sampling/harvest during molt peak ⇒ caution. livePopulation unknown ⇒ judge spike only. |
| care | 15 | Always measured for an active cycle. Water test done 5, feed logged 4, tray checked 2, tasks due that day done ratio 2 (no tasks ⇒ full), no critical alert left open at day end 2. |

Rules:
1. **Not logged ⇒ not counted.** score = round(100 × Σearned / Σpossible over measured parts).
   `basedOn`/`missing` list the parts. **No score** unless water OR feeding is measured.
2. **Cap**: any critical condition (DO < critical low, ammonia/free-NH3 critical, pH critical,
   mortality > 0.3%, banned treatment) ⇒ value = min(value, 59), `capped`, `capReasons`.
3. **Bands**: ≥ 80 good, 60–79 watch, < 60 attention.
4. **Farm score** = pond scores weighted by `areaM2` (missing area ⇒ weight 1). Weakest pond named.
5. **previousScore** = same computation for date − 1 (per pond and farm).
6. `reasons` = the deductions, worst first, max 5; codes from `ReasonCode`.
Pure function `computeDayScore(input) → DayScore` with exhaustive unit tests and mutation
checks on the cap and on "not logged ⇒ not counted".

## Threshold unification (approved)
- Backend `backend/src/common/wq-thresholds.ts`: port `frontend/src/features/waterQualityThresholds.ts`
  (defaults + per-species overrides + classify). Values identical; add a backend spec that reads
  the frontend file's numeric tables and asserts equality (parity guard).
- `water-quality.service.ts` `CRITICAL_THRESHOLDS` and `engine-alert.service.ts` DO/ammonia/pH
  rules read the shared module (DO critical 3 / caution 4; total ammonia critical 0.5 /
  caution 0.1; free NH3 critical 0.3 / caution 0.1 unchanged; pH critical < 7.0 or > 9.0).
  Update their specs deliberately; note changed behaviour in the commit.

## Screen (DailyBriefScreen)
Route `DailyBrief: { date?: string; farmId?: string }`; `MorningBriefing` route renders the same
screen (old links keep working); all links updated to `DailyBrief`. Remote flag `dailyBrief`
(`app-daily-brief`, default on) gates route + Home card.

Modes (by date/time): today before 15:00 = **Morning brief**; today from 15:00 = **Day so far**,
from 19:00 = **Day wrap**; past date = **Day report**. Same blocks, order/emphasis shifts.

Blocks (top → bottom):
1. **Header**: date switcher (‹ previous day · date · next day ›, next disabled on today;
   tap date → CalendarPicker), farm switcher (All farms / each farm), mode title.
2. **Verdict + Day Score**: one plain sentence built from verdict counts
   (e.g. "Most ponds are steady — Pond 3 needs attention"), score number with band colour,
   ↑/↓ vs previous day, "Based on water, feeding · health not logged", link
   "How is my score worked out?" → bottom sheet with the approved plain-language explanation
   and this day's part breakdown.
3. **Day ribbon (signature element)**: a single 24-hour horizontal strip (react-native-svg).
   Shaded 02:00–06:00 band = pre-dawn low-oxygen hours. Ticks for feed sessions, dots for water
   tests (coloured by worst zone), triangles for alerts/deaths, a "now" marker on today. Tap →
   list of that hour's events. The one bold visual on the page; everything else calm.
4. **Carried over / Woke up with** (today) or **From the day before** (past): open alerts,
   overdue tasks, worst reading of previous day, pending molt items. Empty ⇒ one reassuring line.
5. **To do today**: tasks due (tick state), missing logs per pond (water/feed/tray/mortality)
   with a button to the right log screen, molt checklist items. Past day ⇒ done vs missed.
6. **Happening today**: molt phase with dates, planned harvests, DOC milestones, low stock,
   attendance present/total.
7. **Ponds at a glance**: one compact row per pond — name, DOC, score chip (or "no score"),
   3 key numbers (min DO, feed kg vs 3-day avg arrow, deaths), tap → PondDashboard.
8. **Numbers of the day**: feed kg (Δ vs previous day), deaths (Δ), water tests, samplings,
   harvest kg, treatments; spend/income only if canViewFinancials.
9. **Actions**: Export PDF, Share image.

States: loading skeleton; error with retry; offline cache (useAppQuery); no ponds ⇒ invitation to
set up; no data that day ⇒ "Nothing was logged on <date>" + what to log.
Design: use the app theme (`theme.roles.light`, `typeScale`, `spacing`, `radius`); numbers in
numeric type scale; no generic card-kit for everything — vary hierarchy; sentence case; no
ALL-CAPS eyebrows; accessible labels; works at small widths.

Home: "Your day" card at top — mode title, score + band, verdict sentence, top 1 to-do. Tap → DailyBrief.

Notifications: local daily 06:00 (morning brief) and 19:00 (day wrap) via `utils/notifications.ts`
patterns; tapping opens DailyBrief; Settings toggle (default on once notification permission is
granted; never prompts on its own); reschedule idempotently; respects language.

## Export
- **PDF day report**: new export dataset `dayReport` in `features/export` using the same brief
  data (one `GET /daily-brief`), rendered with the existing localized HTML template pipeline:
  verdict + score + parts, ponds table, numbers of the day, to-dos done/missed, carried-over,
  happening. Money only if canViewFinancials.
- **Image card**: PNG built by drawing an SVG card with react-native-svg (Rect/Text/G) offscreen
  and `toDataURL` (same technique as `utils/shareQrImage.ts`), 1080×1350, then share via
  expo-sharing. Contents: farm name, date, score + band, verdict, 3–4 headline numbers, weakest pond,
  app name. Must render all six scripts; fall back to PDF if conversion fails.
- Strings for export in namespace `dayReport`.

## i18n namespaces
- `dailyBrief` (screen, reasons, score explanation, notifications, settings toggle) — screen agent.
- `dayReport` (PDF + image card) — export agent. Reads reason text via `dailyBrief.reasons.*`.

## Testing
Backend: score engine (exhaustive), threshold parity, service integration with fake repos /
DataSource for scoping + VIEW_FINANCIALS + date validation + IST boundaries, updated alert specs.
Frontend: screen renders from fixture brief (each mode, empty, no score), verdict sentence builder,
ribbon event placement (IST hour), notification scheduling idempotence, export collector, image
card builder fallback. localeParity + `bash frontend/scripts/check-calculator-i18n.sh`.
Full suites + tsc both sides before commit.

## Addendum — coverage and unwatched ponds (founder, 2026-09-14)

Reported: "One of my ponds was logged 7 days before. My morning brief shows most ponds are
steady with a score of 82 Good." Verified on production data: 2 of the stocked ponds were
scored (1 good, 1 watch); IND06 (stocked) had nothing logged since 5–7 Sep and was invisible
except a small "too little logged" line; P01 scored Good with no feed logged for 9 days.
"Not logged = not counted" held per pond but let unlogged ponds vanish at farm level.

Decisions:
1. **Denominator = stocked ponds** (cycle on the date). Every farm-level sentence counts them.
   "Most ponds are steady" only when good ponds > half of stocked ponds. "All N ponds are doing
   well" only when every stocked pond was scored good; otherwise "The N ponds logged today…".
2. **Coverage shown with the farm score**: "based on X of Y stocked ponds". If scored stocked
   ponds < 50% of stocked ponds ⇒ `verdict.band = 'incomplete'`: grey "Incomplete", no
   Good/Watch/Attention colour or word (score number may still show, muted). Applies to screen,
   Home card, PDF and image card.
3. **Unwatched stocked pond** (`carriedOver.stalePonds`, reason `pond_not_logged`): watch at ≥ 2
   days without a water test OR ≥ 3 days with no log of any kind; critical at ≥ 7 days (either).
   Never logged ⇒ days since stocking. Shown FIRST in "Woke up with"/"From the day before",
   naming the pond and the days; counts toward the Home card's top to-do.
4. **Pond rows** show "feed not logged for N days" (and water, if stale) when ≥ 2 days, so a
   Good score from water alone can't hide missing feeding.

## Addendum 2 — "What we did", day story, greeting, floating actions, better ribbon (founder, 2026-09-14)

Founder: "there is no insights like what we did today in the daily glance... so farmer knows what
they and the team did at the farms." Answers: visible to **everyone on the farm** (like Activity;
shift times only for owners/managers). Include **per person**, **per pond work**, **tasks completed
with who**, **farm-level highlights**, plus: "a short summary of the things done today, carried over
from past days, important things that happened and whether they resolved. Add a friendly greeting at
the top. The export and share buttons can float at the bottom as we scroll. Improve the 'The day,
hour by hour' component."

Contract (frontend/src/api/dailyBrief.ts): `TimelineEvent.actorId/actorName`, `DailyBrief.story:
StoryItem[]`, `DailyBrief.done: { people: PersonDay[], ponds: PondWork[], tasksDone[] }`.

Story rules (backend, codes only; frontend phrases):
- `issue_open` / `issue_resolved`: a watch/critical water reading (per-species zones) on the day;
  resolved when a later reading of the same parameter that day is back to optimal (resolvedAt = that
  reading). One item per pond+parameter, worst first.
- `carried_resolved` / `carried_open`: items open at the start of the day — overdue tasks (resolved if
  completed on the day), stale ponds from the day before (resolved if logged on the day), the previous
  day's worst reading (resolved if the same parameter was logged optimal on the day), open alerts
  (resolved if read/closed on the day).
- Coverage: `all_ponds_fed` / `ponds_not_fed` (count), `all_ponds_tested` / `ponds_not_tested`,
  `tasks_all_done` / `tasks_left` — stocked ponds only; for today these read "so far".
- Events: `mortality_spike` (per score rule), `harvest_done` (kg), `sampling_done` / `first_sampling`
  (g), `treatment_given`, `stale_pond`, `molt_phase`, `team_in` (count, owners/managers only).
- Ordered: critical → watch → good resolutions → info; max 8.

Screen: friendly greeting by IST time of day with the user's first name ("Good morning, Ravi");
new blocks "The day in short" (story) and "What we did" (people → ponds → tasks done); Export PDF /
Share image as a floating bar pinned to the bottom while scrolling (safe-area aware, doesn't cover the
last content); redesigned hour-by-hour ribbon. PDF and image card include the story (top 3 on the card)
and the people summary (PDF).
