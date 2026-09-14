# Attendance states and molt alert fixes — design

Date: 2026-09-14 · Status: **spec approved (all founder decisions answered, §7), not implemented** · Follows: `2026-09-14-molt-flags-account-qr-design.md` §1 (shipped in `c1fcc4d`)

---

## Part 0 — For the founder (plain words)

### Molt alerts

| You saw | What is actually happening | Fix |
|---|---|---|
| "Post-molt — 5 actions pending", but only 2 actions listed | The number counts **every** unfinished important task since the window opened on 8 Sep: 2 pre-molt tasks, 2 peak tasks and 1 post-molt task. The Morning Briefing screen then prints only the **first 2** of those 5 lines. The pond checklist in the Lunar screen shows all 9 items, including ones that are already done or optional. The count, the list and the checklist each use a different rule. | The number counts only what is shown. It counts only tasks you can still do today. |
| "Cut feed 15–30% on peak days" during post-molt | **You are right.** Today, 14 Sep, is the last post-molt day of the new-moon window (the new moon was 11 Sep, 08:58 IST; peak was 10–12 Sep; post-molt is 13–14 Sep). The advice is correct for peak days. It is a **left-over peak task** that the app still counts as pending, and it sorts to the top because it is marked critical. The app is not telling you to cut feed today. It is telling you, badly, that it did not see a feed cut two days ago. | Past-phase tasks stop showing as "to do" once their days are over. Post-molt shows post-molt advice: restore feed, check soft shells, sample. |
| The alert didn't go away after I did what it said | 4 of the 5 tasks can **only** be satisfied by logs dated inside their own phase. Minerals and alkalinity had to be logged 8–12 Sep. Night DO and the feed cut had to be logged 10–12 Sep. Nothing you log on 13–14 Sep can satisfy them. The feature shipped at 09:36 on 14 Sep, after those days had passed, so nobody could have done them "in time". The one task you could still do, "Restore feed", is a manual tick. That tick exists only inside the Lunar checklist, and the Home "Mark done" button doesn't open it (it opens Quick Log). | Tasks whose days are over leave the count. The alert gets a "tick" action and opens the pond's checklist directly. |

The alert disappears on its own tomorrow (15 Sep), when the window closes. Without the fix, the same thing will happen again on 28–29 Sep (post-molt of the 26 Sep full moon) for any pond that missed a peak task.

### Team / attendance

| You asked for | Where it stands today |
|---|---|
| See at a glance: just checked in / on shift / checkout due soon / should have checked out / checked out | Only "Checked in at 09:12 · 6h 27m" or "Not checked in" exists. The app has **no concept of shift end**: no working hours on the farm or the member. |
| All-farms view: show which farm I'm checking out of | The Team tab's shift card (with "All farms" selected) shows the time but **no farm name**. If you have an old open check-in (you forgot to check out on another day or at another farm), the button checks out the **oldest** one, not today's. Attendance has no pond; check-in is per farm only. |
| Who checked in today, how many, who is still in | The "Attendance 3/8" row counts **every open check-in in the farm's whole history** (forgotten ones from last week included), and doesn't limit it to today. Home's "on duty" count uses UTC dates, so anyone who checks in before 05:30 IST is missed. There is no per-farm or per-state breakdown with names. |
| Owner can check out other members | The **server already allows it** (owner/manager), but there's no button anywhere in the app. It also records no trace of who did it or why, and it doesn't stop a check-out time earlier than the check-in. |
| PDF export of attendance | An "Attendance" PDF/Excel/CSV export already exists under Settings → Export. It isn't linked from Team or the attendance log (the log shares plain CSV text). It has no totals per person, no farm or role column, and it fails for workers. |

Your decisions are recorded at the end (§7) — all answered on 2026-09-14.

---

## Part A — Molt: root causes (engineering)

### A.0 Phase on 2026-09-14 (verified by running the code)

`upcomingWindows` / `currentMoltWindow` in `backend/src/molt/molt-window.ts:60-86`, run locally via ts-node:

| Input | Output |
|---|---|
| `nextPhase(2026-09-05, new)` | `2026-09-11T03:28:07Z` = 08:58 IST 11 Sep |
| window `2026-09-11-new` | pre 09-08..09-09 · peak 09-10..09-12 · post 09-13..09-14 |
| now = 2026-09-13 / 09-14 | `phase: 'post'` |
| now = 2026-09-15 | `phase: 'inter'`, next = `2026-09-26-full` (pre 09-23, post-end 09-29) |

The legacy mean-phase playbook (`LunarService.buildPlaybook`, `backend/src/lunar/lunar.service.ts:295-301`) also returns "Post-molt — recover & grow" for 13 and 14 Sep, so it is not the source of the feed-cut text. But the legacy `computeMoltRisk` (`lunar.service.ts:265-267`) returns `phaseRel: 'pre'` on 13 Sep, because it can only return pre or peak. That is a third phase model, and it is wrong on post days.

### A.1 Bug 1 — "5 actions pending" vs 2 shown

**Count** (`backend/src/molt/molt.service.ts`):

| Step | Code | Effect |
|---|---|---|
| Items in scope | `deriveItems` `:93` `PHASE_ORDER[d.phase] <= PHASE_ORDER[phase]` | In post, **all 9 items** (pre + peak + post) |
| Counted | `moltAlertFor` `:138-139` `status !== 'done' && priority !== 'routine'` | Pending **and** violated, any phase, routine excluded |
| Title | `:142-149` | `Post-molt — ${n} actions pending` |
| Steps | `:151` | One English line per counted item, **critical first** |

**Concrete pond** (eligible, nothing logged 08–14 Sep, no ticks):

| key | phase | priority | status | counted |
|---|---|---|---|---|
| minerals | pre | important | pending | ✔ |
| alkalinity_check | pre | important | pending | ✔ |
| aerator_service | pre | routine | pending | — |
| feed_cut | peak | critical | pending (or manual if no baseline) | ✔ |
| no_handling | peak | critical | done (no sampling/harvest) | — |
| night_do_check | peak | critical | pending | ✔ |
| restore_feed | post | important | pending (manual) | ✔ |
| post_sampling | post | routine | pending | — |
| soft_shell_check | post | routine | pending (manual) | — |

→ **n = 5**, which matches the report exactly. `steps` = `[Cut feed 15–30% on peak days, Check and log night/pre-dawn DO, Dose minerals…, Check and log alkalinity…, Restore feed…]`.

**What each surface renders:**

| Surface | Code | Renders |
|---|---|---|
| Morning Briefing | `frontend/src/screens/engines/MorningBriefingScreen.tsx:198` `it.steps.slice(0, 2)` | **2 lines**: "Cut feed…", "Check night DO…" ← the "only 2 actions" |
| Morning Briefing merge | same file `:45-58` `mergeByPond` | If the pond also has a water alert of equal or higher severity, that alert's title/steps win and the molt alert only adds to `alertCount` |
| Home hero | `components/dashboard/NextActionCard.tsx:77` `why: item.steps?.[0]` | Title + **1 line**: "Cut feed 15–30% on peak days" |
| Home "Then" row | `components/dashboard/ThenList.tsx:205` | Title + steps[0] |
| Home grouping | `NextActionCard.tsx:68` key = source+title+severity | Ponds with different counts ("4 pending" / "5 pending") never group, so one farm-wide window becomes N cards |
| Pond dashboard banner | `screens/ponds/PondDashboardScreen.tsx:681-700` | Title only; "Mark done" → Lunar (correct) |
| Lunar checklist | `components/molt/MoltPanels.tsx:135` (`pm.items.map`) | **All 9 items**, including done and routine |
| Lunar pond list | `molt.service.ts:369-370` | "done/total" over all 9 |

**Root cause:** three different rules. The alert count covers non-routine items not done in any phase so far. Briefing and Home show a slice of 1–2 steps. The checklist shows every item.

### A.2 Bug 2 — "Cut feed 15–30%" on a post-molt day

| Candidate source | Verdict |
|---|---|
| `molt.service.ts:76` `MOLT_ITEMS.feed_cut.text` = "Cut feed 15–30% on peak days" → alert `steps` | **Source.** An exact string match with the report. Sorted first because it is critical (`:139`). |
| `frontend/src/i18n/locales/*/engines.ts` `item_feed_cut` (6 locales) | Same text on the Lunar checklist row, status "pending" |
| `lunar.service.ts:376` "Reduce feed 15–30% — shrimp go off-feed…" | Legacy playbook, **peak only**. On 13–14 Sep it outputs post text. Not the source today, but it can disagree with the window model at the edges (mean phase is ±14 h) |
| Persisted `alerts` rows | No backend code writes `type='lunar'`. The only writer is `POST /alert-center/emit` (`alert-center.controller.ts:56`), and nothing in the frontend calls `alertCenterApi.emit`. Verify with SQL V4. |
| Feed advisor | `FeedAdvisorScreen.tsx:70` defaults the −25% cut only when `phase === 'peak'`. Correct. |

**Why the phase "disagrees":** the alert does not disagree about the phase. The title says Post-molt correctly. It lists a peak item as still to do, because `deriveItems` never lets past-phase items expire. The screen also still runs a second, mean-phase model (`LunarScreen.tsx:94-110, 211-230` → `/lunar/risk` → `buildPlaybook` + `computeMoltRisk`) beside the true-phase window. Two phase models are live on one screen.

**Founder is right.** On 14 Sep the correct instruction is "restore feed / watch soft shells / sample once hardened", not "cut feed".

### A.3 Bug 3 — alert doesn't clear after acting

Ranked by likelihood:

| # | Cause | Evidence | Likelihood |
|---|---|---|---|
| 1 | **Evidence windows are closed.** Pre and peak items only accept logs dated inside their windows. A log made in post can never satisfy them. | `molt.service.ts:231` chemical_data `BETWEEN preStart AND peakEnd`; `:235` treatments same; `:247-249` WQ alk pre..peakEnd, DO `>= peakStart` and `<= peakEnd`; `:289` feed peak days only | **Certain** for anything logged 13–14 Sep. Window opened 5 days before the feature shipped (`c1fcc4d` 09:36 IST 14 Sep). |
| 2 | **The one post item that counts (`restore_feed`) is manual.** You can tick it only from the Lunar checklist. | `:79` `manual: true`; `setAction` `:390` manual only; ticking UI only at `MoltPanels.tsx:146` | High |
| 3 | **Home "Mark done" opens Quick Log, not the checklist**, and just hides the card in component state | `HomeScreen.tsx` (HEAD) `:913-925` `goRoot('QuickLog')`; `:220` `deferred` is `useState` → returns on remount/restart | High (this is the "it came back" part) |
| 4 | Morning Briefing has no action at all on a card | `MorningBriefingScreen.tsx:186-209` | Medium |
| 5 | `feed_cut` with no baseline (no feed logged 05–07 Sep) becomes **manual**, so feed logs never auto-satisfy it | `:119` `if (!ev.feedBaselineKg) return manual()` | Medium (new users) |
| 6 | Crop linkage: minerals and alkalinity (chemical) match `crop_id = pond.active_cycle_id`. A ChemicalLog opened from Lunar before the pond context loaded sends `cropId: undefined` | `molt.service.ts:229-236`; `MoltPanels.tsx` `params.cropId = ctx?.cropId` (LunarScreen `:169`); `chemical-data.entity.ts:19` crop_id NOT NULL | Low |
| 7 | Log still in the offline queue (not synced) | `sync/recordSync.ts` | Low |
| 8 | Stale cache | Ruled out: writes invalidate `['briefing']` and `['pond']` by prefix (`query/client.ts:187-199`); Home key is `['briefing','home']`; checklist key `['pond','molt',id]`; tick invalidates `['briefing']` (`MoltPanels.tsx:111`) | Very low |
| 9 | Persisted alerts merged by `mergeBriefings` never resolve | `utils/pondHealth.ts:442-463` merges `/alert-center/briefing`; no lunar rows are written (V4) | Very low |

### A.4 "Any open important item from any phase" — right behaviour?

The shipped spec (§1 Backend) says: *"pre/post with pending important items → watch; all current-phase items done → no alert"*. The code (`:93`, `:138`) alerts on items from **every** phase so far. That breaks the spec's own last clause, and it produces bugs 1–3.

**Recommendation:** each item gets an `actionableUntil` date. It counts toward the alert only while today ≤ that date. After that it becomes `missed`, which is shown greyed in the checklist as history and never counted.

| key | actionable from | actionable until | Why |
|---|---|---|---|
| minerals, alkalinity_check | preStart | **peakEnd** | Evidence window already runs to peak end, and dosing at peak still helps |
| aerator_service | preStart | peakStart − 1 | Pre-work |
| feed_cut, night_do_check | peakStart | peakEnd | Peak only |
| no_handling | peakStart | peakEnd | `violated` shown as history in post, not counted |
| restore_feed, post_sampling, soft_shell_check | peakEnd + 1 | postEnd | Post only |

In post, the example pond goes from **5 → 1** (restore_feed).

---

## Part A — Fix design

### A.5 Backend

| Change | Where |
|---|---|
| `MoltItemStatus` adds `'missed'`. `deriveItems(phase, ev, manual, today, window)` sets `missed` for pending items past `actionableUntil`, and keeps `violated` as is | `molt.service.ts:17, 88-131` |
| `moltAlertFor` counts `status ∈ {pending, violated}` **and** `actionable` **and** `priority !== 'routine'`. Title count = `steps.length` by construction | `:134-153` |
| Add `actionableUntil: string` to `MoltItem` (IST date) so clients never re-derive | `MoltItem` `:20-27` |
| Phase-appropriate step text. Rename `feed_cut` text to "Cut feed 15–30% today (molt peak)". Post items: "Restore feed as trays clear (+5–10% over 2–3 days)", "Check for soft shells and cannibalism", "Sample once shells harden". Update i18n `item_*` in 6 locales to match | `:73-82`, `locales/*/engines.ts` |
| Alert `data` carries `pondId`, `windowKey` and `items: [{key, source, route}]` for counted items, so a client can tick or route without another fetch. `BriefingItem` gains optional `actions` | `engine-alert.service.ts` lunar push; `alert-center.service.ts` `buildBriefing` passes `data.actions` through |
| **One phase model.** `LunarService.buildPlaybook` takes `phaseRel` from `currentMoltWindow(now).phase` (and target from `window.kind`) instead of mean-phase `signedDaysToSpringTide`. `computeMoltRisk.phaseRel` does the same (fixes `'pre'` on post days). Mean phase stays only for illumination / moon drawing | `lunar.service.ts:265-267, 295-301` |
| **Decided (Q2):** `restore_feed` becomes auto + manual: done when any post day's feed total > the max peak-day total for that pond (no peak feed logged ⇒ manual only). Manual tick stays available and wins. Add evidence query + tests (auto done; no peak baseline ⇒ pending; manual tick still works) | `molt.service.ts` evidence + `deriveItems` |

### A.6 Frontend

| Change | Where |
|---|---|
| Morning Briefing prints **all** steps for `source === 'lunar'` (max 3 after the fix), otherwise keeps `slice(0,2)` + "+N more" | `MorningBriefingScreen.tsx:198` |
| Home hero: for lunar, `onDone` → `Lunar { pondId }` when one pond, or Lunar pond list when several. Not QuickLog | `HomeScreen.tsx` onDone |
| Hero/Then/Briefing: for a lunar item with exactly one **manual** action, show an inline "Done" that POSTs `/molt/ponds/:id/actions` and invalidates `['briefing']`, `['pond','molt',pondId]` and `['briefing','molt','ponds']`. Auto items show "Log it" → route with `pondId` + `cropId` | NextActionCard/HeroCard secondary action; MorningBriefing card footer |
| Home grouping key for lunar = `lunar:<phase>:<severity>` (not the title with its count), so a window is one hero "Post-molt · 4 ponds" | `NextActionCard.tsx:68` |
| Checklist: `missed` items render greyed under a "Earlier in this window" divider, with no buttons. Pond list `done/total` counts only actionable items | `MoltPanels.tsx:135-170`; `molt.service.ts:369-370` |
| Add `/molt` to `URL_ENTITY_MAP` → `[['pond'],['briefing'],['home']]` so the manual call in MoltPanels isn't the only invalidation | `query/client.ts:240` |
| LunarScreen playbook card reads the backend-rebased phase. No client change beyond removing the risk card's phase label if it disagrees | `LunarScreen.tsx:211-230` |
| ChemicalLog from checklist: disable "Log it" until `ctx.cropId` is known | `MoltPanels.tsx:158` |

### A.7 Tests (regression first)

| Test | File | Asserts |
|---|---|---|
| R1 count = shown | `backend/src/molt/molt.service.spec.ts` | `deriveItems('post', emptyEvidence, ∅, '2026-09-14', w)` → `moltAlertFor` title "1 action pending", `steps.length === 1`. **Fails today (5).** |
| R2 no peak advice in post | same | No step contains "Cut feed" when phase = post; `feed_cut.status === 'missed'` |
| R3 post log clears | same | Post, manual `restore_feed` ticked → `moltAlertFor === null`. **Fails today (4 remain).** |
| R4 peak still critical | same | Peak with nothing logged → critical, steps = feed_cut, night_do, minerals, alkalinity (minerals still actionable to peakEnd) |
| R5 legacy phase | `lunar.service.spec.ts` | 2026-09-13T06:00Z → `buildPlaybook.phaseRel === 'post'` and `computeMoltRisk.phaseRel !== 'pre'` |
| R6 briefing shows all lunar steps | `MorningBriefingScreen.test.tsx` | 3 lunar steps → 3 rendered |
| R7 Home done routes to Lunar | `HomeScreen.test.tsx` | lunar group onDone → `navigate('Lunar', {pondId})` |
| R8 grouping | `NextActionCard.test.tsx` | "4 pending" + "5 pending" lunar items → one group, 2 ponds |
| Window edge | `molt-window.spec.ts` | postEnd day is `post`, postEnd+1 is `inter` (exists; keep) |

### A.8 Verification SQL (read-only; run against production by a human)

Window constants: `pre 2026-09-08`, `peakStart 2026-09-10`, `peakEnd 2026-09-12`, `postEnd 2026-09-14`, baseline `2026-09-05..07`. IST day D starts at `(D - 1) 18:30 UTC`. Set `:uid` = the founder's user id.

```sql
-- V1 eligible ponds of the founder with evidence per item
WITH p AS (
  SELECT po.id pond_id, po.active_cycle_id crop_id, COALESCE(po.display_name, po.name) pond
  FROM ponds po JOIN farms f ON f.id = po.farm_id
  WHERE f.user_id = :uid AND po.active_cycle_id IS NOT NULL
)
SELECT p.pond,
  (SELECT mbw_g FROM sampling_data s WHERE s.crop_id = p.crop_id ORDER BY sampling_date DESC LIMIT 1) AS abw_g,
  EXISTS (SELECT 1 FROM chemical_data c WHERE c.crop_id = p.crop_id AND c.measurement_date BETWEEN '2026-09-08' AND '2026-09-12')
   OR EXISTS (SELECT 1 FROM treatments t WHERE t.crop_id = p.crop_id AND t.treatment_date BETWEEN '2026-09-08' AND '2026-09-12') AS minerals,
  EXISTS (SELECT 1 FROM water_quality_records w WHERE w.pond_id = p.pond_id AND w.alkalinity IS NOT NULL
          AND w.recorded_at BETWEEN '2026-09-07 18:30Z' AND '2026-09-12 18:29:59Z') AS alk_wq,
  EXISTS (SELECT 1 FROM water_quality_records w WHERE w.pond_id = p.pond_id AND w.dissolved_oxygen IS NOT NULL
          AND w.recorded_at BETWEEN '2026-09-09 18:30Z' AND '2026-09-12 18:29:59Z') AS peak_do,
  EXISTS (SELECT 1 FROM sampling_data s WHERE s.pond_id = p.pond_id AND s.sampling_date BETWEEN '2026-09-10' AND '2026-09-12') AS sampled_in_peak
FROM p;

-- V2 feed per IST day (baseline + peak + post) per pond
SELECT pond_id, (recorded_at AT TIME ZONE 'Asia/Kolkata')::date AS ist_day, SUM(quantity_kg) kg, COUNT(*) n
FROM feed_records
WHERE pond_id IN (SELECT po.id FROM ponds po JOIN farms f ON f.id = po.farm_id WHERE f.user_id = :uid)
  AND recorded_at BETWEEN '2026-09-04 18:30Z' AND '2026-09-14 18:29:59Z'
GROUP BY 1, 2 ORDER BY 1, 2;

-- V3 what the founder logged in POST (13–14 Sep) that the checklist ignores
SELECT 'wq' src, pond_id, recorded_at, alkalinity, dissolved_oxygen FROM water_quality_records
 WHERE recorded_at >= '2026-09-12 18:30Z' AND pond_id IN (SELECT po.id FROM ponds po JOIN farms f ON f.id=po.farm_id WHERE f.user_id=:uid)
UNION ALL
SELECT 'chem', NULL, measurement_date::timestamptz, alkalinity_ppm, NULL FROM chemical_data
 WHERE measurement_date >= '2026-09-13' AND crop_id IN (SELECT po.active_cycle_id FROM ponds po JOIN farms f ON f.id=po.farm_id WHERE f.user_id=:uid);

-- V4 manual ticks, and proof no lunar alerts are persisted
SELECT pond_id, action_key, done_by, done_at FROM molt_actions WHERE window_key = '2026-09-11-new';
SELECT type, title, created_at, is_read FROM alerts WHERE type = 'lunar' OR title ILIKE '%molt%' ORDER BY created_at DESC LIMIT 20;

-- V5 chemical logs not tied to the active cycle (cause #6)
SELECT c.crop_id, c.measurement_date, po.id pond_id
FROM chemical_data c LEFT JOIN ponds po ON po.active_cycle_id = c.crop_id
WHERE c.measurement_date >= '2026-09-08' AND po.id IS NULL;
```

Expected if the analysis holds: V1 shows false for minerals/alk/peak_do; V3 shows rows on 13–14 Sep; V4 shows no `restore_feed` tick and zero lunar alerts.

---

## Part B — Team / attendance: findings

| # | Finding | Evidence |
|---|---|---|
| B1 | No shift end anywhere: no working hours on `farms`, `farm_members` or `attendance_records` | `farms/farm.entity.ts`, `farm-access/farm-member.entity.ts`, `attendance/attendance.entity.ts:1-59` |
| B2 | Attendance has no pond. Check-in = `{id?, farmId, userId?, checkInAt?}` | `attendance/dto/check-in.dto.ts` |
| B3 | Multiple open check-ins are allowed (same farm or across farms). There is no guard and no partial unique index | `attendance.service.ts:80-86`; migration `1780302000000` indexes only |
| B4 | Overview picks the **earliest** open record across farms as `myAttendance`, so a forgotten check-out from last week beats today's | `team-overview.service.ts:76-81`; `api/teamOverview.ts:108-112` |
| B5 | Team shift card has no farm name; "Check out" error swallowed; no confirm | `screens/main/TeamScreen.tsx:496-508, 276-285` |
| B6 | AllWorkers self card shows the farm, but only when that farm has a roster section | `screens/farms/AllWorkersScreen.tsx:134-136, 157-183` |
| B7 | "Checked in today" = every open record in the farm's **entire history**, not deduped by person | `TeamScreen.tsx:322`; overview calls `findAllForFarm` with no date `team-overview.service.ts:107` (also a growing payload) |
| B8 | Home on-duty uses `checkInAt.startsWith(localDate)` on a UTC ISO string, so check-ins before 05:30 IST fall on the previous day | `HomeScreen.tsx` (HEAD) `:362` |
| B9 | Roster for a **worker** shows every colleague "Not in" (they can't read farm attendance) | `api/teamOverview.ts:225-231`; `findAllForFarm` needs WRITE_MANAGEMENT `attendance.service.ts:153-157` |
| B10 | Owner/manager check-out of others is **already allowed** server-side (WRITE_MANAGEMENT), but no UI exists. No `checked_out_by`/reason. `checkOutAt` is not validated (can be before check-in or in the future), and re-check-out overwrites silently | `attendance.service.ts:93-114`; `api/attendance.ts:31` sends `{}` |
| B11 | WRITE_MANAGEMENT is **overridable** (can be granted to a worker); MANAGE_WORKERS is not. Acting on another person's record should use the non-overridable one | `farm-access/farm-capability.ts` `OVERRIDABLE_CAPABILITIES` |
| B12 | Attendance export exists (`dataset: 'attendance'`) but uses `getAll`, so it 403s for workers. It has no farm/role/status/checked-out-by columns and no per-member totals, and it isn't linked from Team or the log. The log shares CSV text | `features/export/collect.ts:649-700`; `AttendanceLogScreen.tsx:230-263` |
| B13 | Approved leave covering today isn't in the overview (only `pendingLeave`) | `team-overview.service.ts:83` |

---

## Part B — Design

### B.1 Data model (one migration, hand-applied; `migrationsRun` is false)

Migration `1780700800000-AttendanceShiftAndAudit`:

```sql
ALTER TABLE farms ADD COLUMN IF NOT EXISTS shift_end_local time NULL;          -- e.g. 18:00 IST
ALTER TABLE farms ADD COLUMN IF NOT EXISTS shift_hours smallint NOT NULL DEFAULT 9;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS checked_out_by uuid NULL REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_out_reason varchar(20) NULL; -- self|forgot|left_early|shift_end|auto_closed|other
CREATE INDEX IF NOT EXISTS "IDX_attendance_open" ON attendance_records (user_id) WHERE check_out_at IS NULL;
```

Per-member shift hours: skipped. Add when a farm actually runs split shifts (§7 Q4).

**Expected end** (pure function, shared by the client and the export):

```
expectedEnd(record, farm):
  if farm.shiftEndLocal and checkIn(IST time) < shiftEndLocal − 1h:
      return IST date of checkIn at shiftEndLocal
  return checkIn + farm.shiftHours          // evening/late arrivals, or no farm setting
```

### B.2 Shift state (per record → per farm card)

Put `features/attendance/shiftState.ts` in the frontend, pure, with `now` injected. Rules are applied in order:

| State | Rule | Icon + text (never colour alone) | Theme role |
|---|---|---|---|
| `forgot` | open **and** IST day of checkIn < today | `warning` · "Not checked out since Mon 13 Sep 06:10" | dangerBorder / dangerText |
| `overdue` | open, now ≥ expectedEnd | `alarm` · "Checkout was due 18:00 · overdue by 1 h 10 min" | dangerBorder |
| `due_soon` | open, expectedEnd − 60 min ≤ now < expectedEnd | `schedule` · "Checkout due 18:00 · in 40 min" | warningBorder |
| `just_in` | open, now − checkIn < 30 min | `login` · "Just checked in · 09:12" | successBorder |
| `on_shift` | open otherwise | `schedule` · "In since 09:12 · 3 h 20 min · due 18:00" | successBorder |
| `out` | ≥1 record today, none open | `logout` · "Checked out 17:55 · 8 h 43 min today" | borderDefault |
| `on_leave` | approved leave covers today, no record | `event_busy` · "On leave" | staleBorder |
| `not_in` | none of the above | `schedule` · "Not checked in" | borderDefault |

Durations: "3 h 20 min", or "40 min" when under 1 h. Times use `formatTime` (not `toLocaleTimeString`; see AttendanceScreen's ICU note).

### B.3 Team tab: "My shift" farm cards

Replace the single card (`TeamScreen.tsx:496-523`) with one card per farm in scope where the caller has WRITE_OPERATIONAL **and** has a record today or an open record. If no farm has one, show a single "Not checked in" card with the existing chooser.

```
┌ Farm: Kovalam East ─────────── [● ON SHIFT] ┐
│ In since 09:12 · 3 h 20 min · due 18:00      │
│                                 [Check out]  │
└──────────────────────────────────────────────┘
┌ Farm: Pulicat ─────────────── [▲ FORGOT] ────┐
│ Not checked out since Mon 13 Sep 06:10       │
│                        [Fix check-out time]  │
└──────────────────────────────────────────────┘
[ + Check in to another farm ]
```

- Left edge bar + badge use the state role. The accessibility label reads the whole sentence.
- "Check out" opens a confirm sheet: **"Check out of Kovalam East?"** with check-in time and duration. Errors are shown, not swallowed.
- For `forgot`, the action opens the time picker (B.5) for their own record, with default = expectedEnd.
- `myAttendance` in the overview becomes `myOpen: AttendanceRecord[]` (all open, newest first) plus `myToday: AttendanceRecord[]`. Keep `myAttendance` = newest open for old clients (fixes B4).

### B.4 All-farms roster (AllWorkers) and the one-open-record rule

- The self card uses the same B.3 card component, so farm name and state are always present, even when the farm has no roster section (B6).
- **Check-in while open elsewhere** (backend `checkIn`): if the caller has an open record on another farm, or on the same farm, close it at `min(new checkInAt, expectedEnd(old))` with `checked_out_by = caller` and `check_out_reason = 'auto_closed'`, then insert. This is offline-replay safe (no 409 dropped from the queue). Same-farm duplicate within 2 min → return existing (double-tap).
- UI before check-in: if an open record exists, the button reads **"Switch to Pulicat"** and the sheet says "You're checked in at Kovalam East since 09:12. We'll check you out there."
- Pond: not added (§7 Q3).

### B.5 Headcount at a glance

New section on Team, above tasks, for callers with WRITE_MANAGEMENT on ≥1 farm in scope:

```
TODAY · ALL FARMS           6 in · 3 out · 2 not in · 1 leave  (of 12)
Kovalam East   ●4 in  ○2 out  –1 not in          ▲1 overdue   ›
Pulicat        ●2 in  ○1 out  –1 not in  ◐1 leave            ›
```

Tapping a farm row expands a list grouped by state (order: forgot, overdue, due soon, on shift/just in, out, on leave, not in). Each person shows name, role, time and duration, with a **"Check out"** action on open rows (B.6).

- All-farms totals are **deduped by user**, using their "best" state (in > out > leave > not in). The person still appears under each farm.
- Data: overview `allAttendance` is limited to **records with check-in today (IST) OR still open (any day, capped at 14 days)**. Add `from`/`openOnly` support to `AttendanceService.findAllForFarm`. This fixes B7 and shrinks the payload. Add `approvedLeaveToday: LeaveRequest[]` (B13).
- `attendanceStateFor` (`api/teamOverview.ts:194-205`) delegates to `shiftState`, and `sameLocalDay` → IST day. Fix Home `onDutyToday` to use the same helper (B8).
- Workers (B9, **decided Q5: names only**): workers see WHO is checked in right now on their farms — names grouped "In now" / "Not in", no times, durations, history, overdue/forgot states or check-out actions. Needs a READ-level backend field, since `findAllForFarm` requires WRITE_MANAGEMENT: team overview adds `presentNow: { userId, name }[]` per farm (open check-in today IST only; no timestamps in the payload for callers without WRITE_MANAGEMENT). Owners/managers keep the full view. Tests: worker payload contains names but no check-in times; manager payload unchanged.
- Summary row "Attendance x/y" = distinct users with any record today / active members, both deduped.

### B.6 Owner/manager checks out a member

**API** (extends existing): `POST /attendance/:id/check-out` body `{ checkOutAt?: ISO, reason?: 'forgot'|'left_early'|'shift_end'|'other' }`.

| Rule | Behaviour |
|---|---|
| Own record | WRITE_OPERATIONAL (unchanged). `checked_out_by = caller`, reason default `self` |
| Other's record | **MANAGE_WORKERS** (owner/manager, not overridable; B11). Reason required |
| `checkOutAt` | `checkInAt ≤ checkOutAt ≤ now + 5 min`; else 400 |
| Already checked out | Own: 409. Manager: allowed as a correction only with `reason` (overwrite, keep `checked_out_by` = corrector) |
| Notify | Push to the member: "Your check-out at Kovalam East was recorded at 18:00 by Ravi (forgot to check out)" via existing `push.sendToUser` (pattern: `leave-requests.service.ts:109-123`). Failure logged, never fails the call |
| Back-fill check-in for others | Switch `WRITE_MANAGEMENT` → `MANAGE_WORKERS` at `attendance.service.ts:66-70` for the same reason |

**UI sheet** (from B.5 rows, AllWorkers rows, AttendanceScreen team rows), shown only when `canDecideOnTeam(role)`:

```
Check out Suresh — Kovalam East
Checked in 06:05 (12 h 40 min ago)
Time:   (•) Now 18:45   ( ) Shift end 18:00   ( ) Pick time…
Reason: [Forgot] [Left early] [Shift ended] [Other]
                                   [Cancel] [Check out]
```

The picker is bounded to `[checkIn, now]`. Direct call (not queued), same as own check-out today.

**Tests** (`attendance.service.spec.ts`): manager checks out a worker → sets by/reason; worker checking out another → Forbidden; worker with WRITE_MANAGEMENT override → Forbidden; checkOutAt < checkIn → 400; future → 400; own second check-out → 409; check-in auto-closes an open record on another farm at `min(newIn, expectedEnd)` with `auto_closed`; same-farm double-tap returns existing; push failure doesn't throw.

### B.7 Attendance PDF export (reuse the existing pipeline)

| Item | Spec |
|---|---|
| Config | `ExportConfig` adds `userId?: string`; `farmId` optional for attendance (all farms the caller manages) |
| Collector | `collect.ts` `collectAttendance`: for each farm in scope, use `getAll` if the caller has WRITE_MANAGEMENT on it, else `attendanceApi.mine(farmId, {from,to})` (extend `api/attendance.ts:22-23` with from/to; backend already supports it). Filter by `userId`. Fetch approved leave in range per farm |
| Table 1 "Totals by person" (`key: 'summary'`) | Member · Role · Farm · Days present (distinct IST days) · Hours · Leave days · Open/auto-closed count. Footer total row |
| Table 2 "Shifts" (`key: 'summary'`) | Date · Member · Role · Farm · Check-in · Check-out · Hours · Checked out by · Status (`on time`/`overdue`/`forgot`/`auto-closed`/`still in`) |
| Stats | Members · Days present · Total hours · Overdue check-outs |
| Hours | Open record → "still in" (not counted). `auto_closed` counted but flagged in Status |
| Formats | PDF/XLSX/CSV as today (`renderReportHtml`, `xlsx.ts`, `csv.ts`); document language picker as today |
| Entry points | Team "Attendance" summary row long-press/⋯ → `Export {dataset:'attendance', farmId?}`; **AttendanceLogScreen** header action "Export" replaces "Share CSV" (`:230-263`) and passes month range + person filter; **MemberDetailScreen** "Export attendance" → `{dataset:'attendance', farmId, userId}`. `RootNavigator.tsx:195` params add `userId`, `startDate`, `endDate` |
| Permissions | Server enforces. Workers get their own rows only. The ExportScreen dataset list is unchanged (attendance visible to all) |
| Flag | Behind existing `app-export` (`features/remoteFlags.ts:31`) |

Tests: `features/export/__tests__` fixture collector test (manager: two farms, one open, one auto-closed, one leave → totals); worker path calls `mine` not `getAll`; `renderReportHtml` snapshot of the two tables.

### B.8 i18n (6 locales: en, hi, ta, te, bn, or)

| Namespace | Keys |
|---|---|
| `team.ts` | `shift_forgot`, `shift_overdue`, `shift_dueSoon`, `shift_justIn`, `shift_onShift`, `shift_out`, `shift_onLeave`, `shift_notIn` (badges); `shiftLine_forgot {{since}}`, `shiftLine_overdue {{due}} {{by}}`, `shiftLine_dueSoon {{due}} {{in}}`, `shiftLine_onShift {{since}} {{elapsed}} {{due}}`, `shiftLine_out {{time}} {{total}}`; `checkOutOfFarm {{farm}}`, `switchFarm {{farm}}`, `switchFarmBody {{from}} {{since}}`, `checkInAnother`, `todayHeadcount {{in}} {{out}} {{notIn}} {{leave}} {{total}}`, `fixCheckout`, `durationHm {{h}} {{m}}`, `durationM {{m}}` |
| `attendance.ts` | `checkOutMember {{name}} {{farm}}`, `checkOutTimeNow`, `checkOutTimeShiftEnd {{time}}`, `checkOutTimePick`, `reason_forgot`, `reason_left_early`, `reason_shift_end`, `reason_other`, `reason_auto_closed`, `checkedOutBy`, `status_onTime`, `status_overdue`, `status_forgot`, `status_stillIn`, `totalsTitle`, `shiftsTitle`, `daysPresent`, `leaveDays`, `exportAttendance`, `checkoutTimeInvalid` |
| `farms.ts` | `shiftEndLabel`, `shiftHoursLabel`, `shiftHint` (Farm settings) |
| `engines.ts` (molt) | `status_missed`, `earlierInWindow`, updated `item_feed_cut`, `item_restore_feed`, `item_soft_shell_check`, `item_post_sampling` |
| backend push (English, like leave) | "Your check-out at {farm} was recorded at {time} by {name}" |

---

## 6. Rollout order

| Step | What | Gate |
|---|---|---|
| 1 | Molt backend: `missed`/`actionableUntil`, count fix, text, alert `data.actions`, legacy playbook on window phase + specs R1–R5 | Deploy backend. Safe for old app builds (fields additive; title count just gets smaller) |
| 2 | OTA: Morning Briefing all lunar steps, Home lunar routing/grouping, inline tick, checklist `missed` rendering, `/molt` in URL map + R6–R8 | Old backend: `actions` absent → fall back to route-to-Lunar |
| 3 | Hand-apply migration `1780700800000` on production (Supabase SQL editor) | Verify columns exist before step 4 |
| 4 | Attendance backend: check-out body/validation/audit/push, MANAGE_WORKERS, auto-close on check-in, overview `myOpen`/`myToday`/limited `allAttendance`/`approvedLeaveToday`, farm shift fields in farm update DTO | Deploy. Old clients still read `myAttendance`/`allAttendance` (now limited to today + open, which is exactly what they claim to show) |
| 5 | OTA: shiftState, farm cards, headcount, manager check-out sheet, farm shift settings, export entry points + collector | Team UI behind existing `app-team-tab`; export behind `app-export` |
| 6 | Watch: Sentry for `/attendance/*/check-out` 400/409; PostHog event `attendance_checkout_other` (no payload beyond reason) | — |

Molt steps 1–2 ideally land before 2026-09-28 (post phase of the 26 Sep full moon).

---

## 7. Founder decisions (answered 2026-09-14)

| # | Decision | Answer |
|---|---|---|
| Q1 | When a pre/peak task's days pass undone, should it leave the alert? | **Yes — drop from the alert, show as "missed" in the checklist** |
| Q2 | "Restore feed" in post-molt: manual or auto? | **Auto when a post-molt day's feed is higher than the peak days, manual tick still available** (A.5) |
| Q3 | Should check-in record a pond? | **No — farm only** |
| Q4 | Shift end source | **One farm-wide end time; if unset, check-in + 9 h** |
| Q5 | Can workers see who else is checked in? | **Yes, names only** — no times, durations, history or actions (B.5) |
| Q6 | Checking in at farm B while still in at farm A | **Auto check-out of A**, marked "auto-closed" |
| Q7 | Notify a member when an owner/manager checks them out? | **Yes, push** |
| Q8 | "Due soon" lead time / "just checked in" window | **60 min / 30 min** |
| Q9 | Reminder push for forgotten check-outs? | **Not now** |

No open questions remain; the spec is ready to implement.
