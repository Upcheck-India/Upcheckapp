# Disease, Shrimp Health & Compliance: Design

Date: 2026-09-19 · Status: **spec approved (owner decisions below), not implemented**
Area 5 of the product brainstorm. It follows `2026-09-19-harvest-and-molt-design.md` (area 4)
and **changes one part of it**: that spec's `molt_observations` table (M2) becomes the general
`health_observations` table here (§D6). Build D6 instead of M2's table. M2's entry points and
pre-harvest check are unchanged.

## Owner decisions

| # | Question | Decision |
|---|---|---|
| DD1 | What happens when a banned substance is logged | **Record + escalate.** Never block the log: an honest record is worth more than a hidden one. The owner and managers are notified. The cycle is marked "antimicrobial used". It shows red at pre-harvest and on the cycle record. The flag cannot be silently edited away. |
| DD2 | How a treatment is entered | **Ingredient picker.** The user picks a category and an active ingredient from a curated list in 6 languages. A brand/product name and free text are still allowed. |
| DD3 | A compliance record for buyers | **Cycle input record.** One PDF per cycle covering seed source and PCR, every treatment with its ingredient and date, and a "no antimicrobials logged" statement with its honest limits. It makes **no certification claims**. |
| DD4 | Health and welfare scope | **All four:** automatic early warning from pond data; mortality ↔ disease link (with photos and outcomes); seed PCR and a biosecurity checklist; honest diagnosis. |

---

## 0. Answer to "did we already build this?"

**Banned substances: partly built, never designed.** It arrived as a security-audit fix in July 2026
(`fcd8312` endpoint + client list, `5d70ae5` server write-time flag). There was no spec.

What exists:
- A keyword check in the Treatment and Disease forms. It warns while you type and offers "Save anyway".
- A server flag stored on the record.
- A "Flagged" label in History and the export.
- A critical cap on the Daily Score **for that one day**.

What does not exist:
- Nobody is notified.
- Harvest, the cycle record, alerts and inventory never read the flag.
- There are no withdrawal periods.
- Editing the text clears the flag with no trace.
- Matching is English-only.
- The list misses items (see §1.2).

**Shrimp and pond health and welfare: mostly not built.** What exists:
- DO and ammonia thresholds drive alerts.
- A molt-handling caution.
- A symptom matcher.
- An early-warning engine that is a **manual checklist**.

Missing: biosecurity, seed PCR records, mortality causes, disease outcomes, photos, and any link
between mortality, disease and treatment.

The docs claim more than the code delivers:
- `PRD.md:216-217, 337` says withdrawal is "enforced" and promises an "export-eligible badge".
- `PLAY_STORE_SUBMISSION.md:286` says warnings arrive "before a treatment goes in the water". In practice treatments are logged after the fact, and the warning only warns.
- `FEATURES.md:147` says "indicator derivation happens upstream". No upstream exists.

---

## 1. What is wrong today (verified at HEAD `17dfdd0`)

### 1.1 Safety and security. Fix before anything else.

| # | Defect | Evidence | Impact |
|---|---|---|---|
| S1 | **Cross-tenant writes through PATCH bodies. Systemic.** Update DTOs are `PartialType(Create…Dto)`, so they include `cropId`/`pondId`. `OwnershipGuard` checks the **existing** record through `params.id` (`ownership.guard.ts:52-56`). Services then spread the DTO into `repository.update`. A caller can move their own record onto **another farm's** crop or pond. | `crops.service.ts:233-237` (`pondId`, which moves a whole cycle); `treatments.service.ts:102-108`; `sampling.service.ts:94-104`; the update DTOs of `feed-records`, `ponds`, `transactions`, `harvest-plans` all inherit scope ids (the harvest-plans one is already in the harvest spec, H0 B5) | Data injection into another farm. The worst case is **planting a banned-substance treatment in a competitor's cycle record**, which is exactly the record D4 hands to processors. |
| S2 | **`PATCH /disease/record/:id` does no validation at all.** The body type is `Partial<CreateDiseaseRecordDto>`, a TypeScript type, so `ValidationPipe` skips it. It is spread into `update`. | `disease.controller.ts:103-108`; `disease.service.ts:342-348` | Everything in S1, plus spoofed `createdById`, unbounded notes, arbitrary `diseaseId`. |
| S3 | **The app's disease library tells farmers to use "Antibiotics" for Vibriosis**, translated into all 6 languages, with no caveat. | `disease.service.ts:95`; migrations `1746000000000…:15`, `1780301900000…:56-104`; `DiseaseDetailScreen.tsx:262-268` | Contradicts CAA rules, the banned-substance warning, and the Terms. This is a liability. |
| S4 | `POST /disease-risk` takes an unvalidated `cropId` that is never checked against the pond. `/disease-risk/compute` has an interface body. | `disease-warning.controller.ts:15-45` | Low: the compute is pure. The snapshot can write to a foreign crop. |
| S5 | Store copy overstates the feature: "before a treatment goes in the water". | `docs/PLAY_STORE_SUBMISSION.md:286, 349` | Play policy and trust risk. |

### 1.2 The banned-substance check

| # | Defect | Evidence |
|---|---|---|
| B1 | **The list is incomplete** against the regulations it claims to follow (`banned-substances.data.ts:2`, "Authoritative CAA/MPEDA"). It is missing: **dapsone, chlorpromazine, colchicine, clenbuterol, diethylstilbestrol, glycopeptides (avoparcin, vancomycin), sulfonamides as a class** (it has only sulfamethoxazole), levofloxacin, and the dyes **malachite green / crystal violet** (EU zero tolerance, a common residue finding). It has **none** of the medically-important antimicrobials that the Department of Commerce prohibited in aquaculture in **May 2025**. That list mirrors EU Implementing Regulation **2022/1255**: carbapenems, penems, monobactams, glycopeptides, lipopeptides, oxazolidinones, glycylcyclines, ceftobiprole, ceftaroline, siderophore and β-lactamase-inhibitor cephalosporins, carboxy/ureido-penicillins, fidaxomicin, plazomicin, eravacycline, omadacycline, **and antivirals**: amantadine, ribavirin, oseltamivir, favipiravir and others, plus nitazoxanide. **EU export certificates have required non-use of the 2022/1255 list since 3 Sep 2026.** | `banned-substances.data.ts:22-82` |
| B2 | There is **no provenance.** No entry cites its authority, notification number or date. The version string is the only "last updated". | same |
| B3 | **Matching is English ASCII only.** JS `\b` without the `u` flag ignores Indic scripts. There are no Hindi/Telugu/Tamil/Bengali/Odia names, no brand names, and no "sulpha-" spelling. The 3-letter metabolite aliases `sem`, `ahd`, `aoz` match unrelated words. | `banned-substance-matcher.ts:30-45`; data `:35-36` |
| B4 | There are two list copies (the backend list and a bundled frontend list) with **no parity test**. The client falls back to the bundled copy whenever the fetch fails. | `frontend/src/features/bannedSubstances.ts:31-81`; `App.tsx:347-357` |
| B5 | **The flag is easy to lose.** Editing the text clears it with no trace. Replayed creates return the old evaluation. Nothing re-evaluates old records when the list grows, although the version column exists for that. | `treatments.service.ts:28-39, 90-108` |
| B6 | **The flag goes nowhere.** It never reaches harvest, alerts or push, and nobody but the logger sees it. `features/alerts.ts:84-96` builds compliance alerts, but that code is dead (only tests import it). | grep `banned` across `harvests`, `alert-center`, `pond-context`, `reports`: none |
| B7 | The export **replaces** the notes with the flag label on flagged rows, so the notes are lost. | `features/export/collect.ts:296-300` |
| B8 | "No flag" looks like "safe". There is no "not a complete list" line in the banner or dialog, and no source link. The disclaimer lives only in the Terms (`TERMS_AND_CONDITIONS.md:50`). | `TreatmentLogScreen.tsx:119-129` |

### 1.3 Treatments

- `description` and `notes` are free text. The product name is folded into notes as `"Product: X."`. `productId` is never sent. `basedOn` is hardcoded. There is no ingredient, category, reason or dose unit. (`TreatmentLogScreen.tsx:28-49`)
- The edit bug: the product name is prefixed twice. Edits bypass the offline queue. (`:29, 53-58`)
- The molt "minerals" item auto-ticks from any treatment, including an antibiotic (harvest spec M1.1). A category fixes this properly.
- There is no link between inventory `medicine`/`chemical` stock and treatments.

### 1.4 Disease records, mortality, diagnosis, early warning

| # | Defect | Evidence |
|---|---|---|
| H1 | A disease record has no affected %, lab confirmation, outcome, structured symptoms or photos UI. Symptoms and action are packed into English notes (`"Symptoms: X. Action: Y"`) and re-parsed by a regex. | `disease-record.entity.ts`; `DiseaseLogScreen.tsx:23-34, 83-92` |
| H2 | **Offline disease logging is impossible.** The library picker is a plain API call with no cache. Offline the list is empty and save is blocked. | `DiseaseLogScreen.tsx:55-70, 124` |
| H3 | History shows `Disease ID: <uuid>`. Severity has three vocabularies (free text with English default `'Mild'`, mild/moderate/severe, high/medium/low). Edit and delete show to roles that get 403. | `DiseaseHistoryScreen.tsx:13-17, 122`; `DiseaseLogScreen.tsx:48` |
| H4 | "Log This Disease" from the library sends `cropId: ''` and prefill params nobody reads. | `DiseaseDetailScreen.tsx:53-62` |
| H5 | `onDelete: 'SET NULL'` on the NOT NULL `disease_id`, so deleting a library row with records throws. | `disease-record.entity.ts` |
| H6 | **Mortality edits leave `estimatedTotal` stale**, so live population is wrong after any count edit. | `mortality.service.ts:76-87`; `pond-context.service.ts:242, 508` |
| H7 | Mortality has no cause, no link to disease, no photos UI. A spike (`day-score.ts:70`) never prompts anything. | `mortality-record.entity.ts` |
| H8 | **Diagnosis percentages overstate.** Confidence = matched share of a profile, with no penalty for signs that don't fit. Tick everything and every disease scores 100%. `black_gills` alone gives 43%, above the "weak" cut-off. It shows big "NN%" numbers. It never uses pond data. The disclaimer appears only after results. There is no lab/PCR referral. `erratic_swimming`/`cannibalism` belong to no profile. RMS, IHHNV, loose shell and luminous vibriosis are missing. | `features/diseaseMatch.ts:29-58`; `diseaseKnowledge.ts:23-101`; `DiagnoseScreen.tsx:29, 134` |
| H9 | **The early warning is a manual checklist.** Only `doBelow4` is auto-filled. `docBelow35` is never set although `ctx.doc` exists. `regionalWssv`, `regionWfd`, `vibrioUp`, `ehpRiskUp` and `hpStress` are never set. **WFD's reachable max is 40, so it can never be Critical.** No alert, push or snapshot is ever produced. Steps, disease names, bands and trigger keys are English. | `DiseaseRiskScreen.tsx:25-75, 170`; `disease-warning.service.ts:62-171`; `alert-center.service.ts:11` |
| H10 | There is nothing for seed PCR, pond preparation, biosecurity or carcass disposal. Crop has `hatcheryId`/`broodstockId`, and nothing else about seed health. | `crop.entity.ts:95-112` |

---

## 2. Workstreams

Ship order. Each is one PR against `development`.

| WS | Name | Migration | Ships as |
|---|---|---|---|
| **D0** | Security & safety fixes | one data migration (library text) | backend + OTA |
| **D1** | Banned list v2: sourced, multilingual, one copy | none | backend + OTA |
| **D2** | Structured treatments (ingredient picker) | treatment columns | backend + OTA |
| **D3** | Escalation + cycle antimicrobial status | treatment flag-history columns | backend + OTA |
| **D4** | Cycle input record (PDF) | farm `caa_registration_no` | backend + OTA |
| **D5** | Seed PCR + biosecurity checklist | crop seed columns, `biosecurity_checks` | backend + OTA |
| **D6** | Health observations + mortality/disease records | `health_observations`, mortality + disease columns | backend + OTA |
| **D7** | Automatic early warning | none | backend + OTA |
| **D8** | Honest diagnosis | none | OTA (+ library seed) |

Everything is OTA-safe (`expo-image-picker` is already in the native build: `frontend/package.json:54`).
**Every migration is additive. `migrationsRun` is false, so apply each migration to production BEFORE
the backend that reads it.** New reads use the `42P01`/`42703` `isMissingTable()` fail-safe.
Migration timestamps continue after the harvest spec's reserved `1780701200000`; re-check the latest
file before creating one.

---

## D0: Security & safety (ship first)

1. **S1, a systemic fix in one place.** Add a shared helper and use it in every update DTO:

   ```ts
   // common/dto/omit-scope.ts
   export const SCOPE_KEYS = ['id', 'farmId', 'pondId', 'cropId', 'createdById', 'updatedById'] as const;
   ```

   `UpdateXDto extends PartialType(OmitType(CreateXDto, [...present scope keys]))` for **crops,
   treatments, sampling, feed-records, ponds, transactions, harvest-plans, disease records,
   mortality, water-quality, chemical, microbiology, plankton, tray checks**. Audit every
   `PartialType(Create` hit (`grep -rl "PartialType(Create" backend/src`) and list each file in
   the PR. The whitelist then strips scope keys.
   - **A mover that is genuinely needed:** transactions allow re-tagging a pond, and already check with `assertCanAccessFarm` at `transactions.service.ts:260`. Keep only that path, and require the target to be in the **same farm**.
   - **Test:** one parametrised spec. For each update route, PATCH with a foreign `cropId`/`pondId` must leave the row's scope unchanged. Mutation-check it by removing the Omit on one DTO and watching the test fail.
2. **S2:** `UpdateDiseaseRecordDto` becomes a real class (`PartialType(OmitType(CreateDiseaseRecordDto, SCOPE))`).
3. **S3:** a data migration removes `'Antibiotics'` from Vibriosis `treatment_recommendations` and from all 5 translation rows, and adds "Consult a fisheries officer or aquatic animal health lab" in its place.
   - Seed code at `disease.service.ts:95` is changed to match.
   - Update the rows only when the value still equals the seeded text, so admin edits survive.
   - The library screen adds a fixed line above treatments: "No antibiotics. Many are banned in shrimp farming in India."
   - A test asserts that no library text matches the banned list (D1) or the word "antibiotic".
4. **S4:** a DTO for both disease-risk bodies. `cropId` must be the pond's active crop.
5. **S5:** the store listing and `FEATURES.md` say "warns when a treatment is logged". PRD lines are marked "not built". This doc-only change goes in the same PR.
6. **H6:** mortality `update` recomputes `estimatedTotal = quantity × factor` when `quantity` changes and `estimatedTotal` isn't given. Test: edit 10 → 20, and live population drops by the right amount.
7. **H5:** `disease_id` FK `ON DELETE RESTRICT`. Library delete returns 409 "in use".

---

## D1: Banned list v2

### Data (code constant, served by the existing endpoint)

Each entry gains provenance and scope:

```ts
{
  key: 'chloramphenicol',                 // stable id, used by D2 ingredients
  name: 'Chloramphenicol',
  category: 'banned' | 'restricted',
  kind: 'antibiotic' | 'antiviral' | 'antiprotozoal' | 'hormone' | 'dye' | 'other',
  sources: [{ authority: 'CAA', instrument: '<notification no. + date>', url }],
  aliases: { en: [...spellings], hi: [...], te: [...], ta: [...], bn: [...], or: [...] },
  brands?: string[],                       // added only when verified
  note?: string,
}
```

- `BANNED_LIST_VERSION` stays. Add `BANNED_LIST_REVIEWED_ON` and `BANNED_LIST_REVIEWED_BY` (a person, not an agent).
- **Content task (human-owned, blocking D1 merge):** build the list from the **primary texts**:
  - the CAA notification of prohibited antibiotics and pharmacologically active substances;
  - the Department of Commerce / EIC May 2025 amendment for fresh, frozen and processed fish and fishery products;
  - EU Implementing Regulation 2022/1255 Annex;
  - the March 2025 ban on chloramphenicol and nitrofurans in all food-producing animals.

  Every entry must cite its instrument. **The spec's lists in §1.2 B1 are leads for the reviewer, not a source.** Nothing merges without the reviewer's name in `REVIEWED_BY`.
- Native-script aliases: generate the transliterations, then **check each one with a native speaker per locale**. Add known misspellings as aliases (`sulpha…`, `chloramphenicole`, `furazolidon`, `enrofloxacine`).
- The metabolite codes (`aoz`, `amoz`, `sem`, `ahd`) move out of free-text aliases. They are lab-report terms and only match in a future lab-result field.

### Matcher

- Unicode-aware whole-token match: `new RegExp(`(?<![\\p{L}\\p{N}])${alias}(?![\\p{L}\\p{N}])`, 'iu')`. Check Hermes support for `\p{}` lookbehind in the app's RN version. If it is unsupported, normalise with a token split on `/[^\p{L}\p{N}]+/u` and compare tokens (multi-word aliases compare token sequences).
- Normalise before matching: NFC, lowercase, `ph→f` **only for Latin script**, collapse whitespace.

### One copy

- The frontend bundled list is **generated** from the backend file by a script (`npm run gen:banned` in `frontend/`, writing `features/bannedSubstances.generated.ts`).
- Both sides import one shared matcher implementation, copied by the same script.
- A test fails if the generated file is stale (hash of the source in a header comment).
- The version and reviewed date are shown in Settings → About and on every warning ("List of 19 Sep 2026").

### Copy

Every banner and dialog gets one fixed line: "This list may be incomplete. No warning does not mean
a product is allowed." It links to a small in-app sheet listing the sources and the reviewed date.

---

## D2: Structured treatments (DD2)

### Ingredient catalogue

This is a code constant served like D1 (`GET /treatments/ingredients`, public, cached offline):

```ts
{ key: 'potassium_chloride', category: 'mineral', names: { en, hi, te, ta, bn, or },
  aliases: [...], bannedKey?: string, withdrawalDays?: { value, source } }
```

- **Categories:** `mineral`, `lime_alkalinity`, `probiotic`, `disinfectant`, `oxidiser_oxygen`, `water_conditioner`, `feed_additive`, `antiparasitic`, `antimicrobial`, `other`.
- **Every D1 banned or restricted substance appears as an ingredient** with `bannedKey`, so picking one is an exact match with no text guessing.
- **`withdrawalDays` only when sourced** (instrument + url). With no source, the field is absent. The UI never invents a period (see D3).
- The seed list covers the common Indian pond inputs:
  - minerals: KCl/MOP, MgCl₂, MgSO₄, CaCl₂, dolomite;
  - lime: CaCO₃ agricultural lime, CaO;
  - probiotics: Bacillus spp.;
  - disinfectants: BKC, iodine/povidone, bleaching powder/chlorine, KMnO₄;
  - oxygen: H₂O₂ / sodium percarbonate;
  - other: zeolite, yucca, vitamin C, formalin.

  Each has 6-locale names, reviewed by the same native speakers as D1.

### Data

New columns on `treatments`:
- `category text NULL`
- `ingredient_keys text[] NULL`
- `product_name text NULL`
- `reason text NULL`: `molt_prep | water_quality | disease | prevention | pond_prep | other`
- `dose_value numeric NULL`
- `dose_unit text NULL`: `kg | g | l | ml | ppm | kg_per_ha`
- `disease_record_id uuid NULL` FK disease_records `ON DELETE SET NULL`

`dosageKg` is kept for old clients. The server fills it when `dose_unit='kg'`.

### Form (`TreatmentLogScreen`)

```
Treatment · Pond 3 · 19 Sep                         [date picker]
Type     [ Mineral ▾ ]
Product  [ Aqua Mineral Mix        ]   brand, optional
Active   [ Potassium chloride ▾ ] [+ another]
Dose     [ 25 ] [ kg ▾ ]         Why [ Molt prep ▾ ]
Notes    [ … ]
```

- The ingredient picker searches all names and aliases in all six locales, so a Telugu speaker can find "పొటాషియం" or "KCl".
- A free-text "Other ingredient" row stays. It is still matched by D1's matcher.
- Choosing an `antimicrobial` category, or a banned or restricted ingredient, shows the D1 banner **immediately**, before dose is entered.
- Prefill from the Molt checklist "Log it": `category=mineral`, `reason=molt_prep`.
- From a disease record: `reason=disease`, `disease_record_id` set.
- Edits go through `saveRecord` (fixes the online-only edit and the double product prefix; product is its own field now).
- **Inventory:** when the chosen product matches an inventory item in `medicine`/`chemical`, the form offers "Use from stock (12 kg left)". It writes an inventory movement using the feed-record pattern: add `treatment_id` to `inventory_movements` beside `feed_record_id`.
- Inventory items can carry `ingredient_keys` (an optional column), so stocking a banned product warns at the moment of purchase entry. That is the only point the app sees a product before it goes in the water, and it makes the store claim true for farms that use inventory.

### Consumers

- **Molt `minerals`** (supersedes harvest spec M1.1's keyword match): done when a treatment has `category='mineral'` or `'lime_alkalinity'`, or an ingredient in those categories. Old rows fall back to the keyword match.
- The server re-evaluates D1 on `ingredient_keys ∪ product_name ∪ description ∪ notes`.

---

## D3: Escalation + cycle antimicrobial status (DD1)

1. **Never block.** Saving always succeeds, online or offline.
2. **Notify** when a treatment or disease record is saved with `banned`:
   - Who: every **owner and manager** of the farm **except the person who logged it**.
   - How: push via `PushService.sendToUser` plus an alert-center item (`source: 'compliance'`, severity critical).
   - Text: "Pond 3: chloramphenicol logged by Ravi on 19 Sep. Banned in shrimp farming; export lots are tested for it."
   - `restricted` → an alert item only (watch), no push.
   - Idempotent per record id (replays don't re-notify).
   - Strings use keys + params in 6 locales, not backend English.
3. **The flag cannot be edited away silently.** New treatment and disease columns:
   - `flag_history jsonb NOT NULL DEFAULT '[]'`
   - each entry: `{ at, by, from, to, matches, listVersion, reason? }`

   An edit that lowers `banned` → `restricted`/`none` **requires a `flagChangeReason`** (400 `REASON_REQUIRED` otherwise). The UI asks "Why are you changing this? Typing error / Wrong product / Other". The history is shown on the record in History.
4. **The cycle antimicrobial status is computed on read, not trusted from stored flags.** `GET /crops/:id/compliance` (READ; the names of logged substances are visible to all roles, because this is safety, not money) returns:

   ```
   { status: 'none_logged' | 'restricted_logged' | 'banned_logged',
     items: [{ date, source: 'treatment'|'disease', recordId, substances, flag }],
     listVersion, evaluatedAt }
   ```

   The server re-evaluates every treatment and disease record of the crop against the **current**
   list each time. This fixes B5: a newly banned substance is caught in old cycles without a
   migration job. The stored flag is refreshed when it differs, with a history entry `by: 'system'`.
5. **Where the status shows:**
   - Pond dashboard: a small chip "Antimicrobial logged". It appears only when not `none_logged`.
   - Cycle Result (harvest spec H3): a row in the health section.
   - Pre-harvest check (harvest spec M2): the **Residues** line reads this endpoint instead of the per-record flag.
   - Cycle input record (D4).
   - Daily brief: the banned day stays critical as today. **The next 7 days** carry a watch line "Antimicrobial logged on 19 Sep: tell your processor before harvest".
6. **Restricted substances and withdrawal.**
   - If the ingredient has a **sourced** `withdrawalDays`, the pre-harvest check computes "Oxytetracycline on 12 Aug; withdrawal period until 3 Sep (source)".
   - If not, it says "Oxytetracycline logged on 12 Aug. Confirm the withdrawal period with your processor before harvest".
   - **No invented numbers.**
7. Delete `frontend/src/features/alerts.ts` compliance code (dead). Export (B7): keep the notes and add a separate "Flag" column.

---

## D4: Cycle input record (DD3)

A PDF (plus XLSX) built on the existing export pipeline (`features/export/`), scope = one cycle.
It is reached from Cycle Result, CycleDetail and Export.

**Sections**
1. **Farm and pond:**
   - farm name, **CAA registration number** (new optional `farms.caa_registration_no text`, entered in farm edit);
   - district (when the location strategy ships);
   - pond name and area.
2. **Seed:** hatchery, stocking date and count, SPF yes/no, **PL PCR results** (D5), with lab and date.
3. **Inputs:** every treatment, as date · category · ingredient(s) · product · dose · reason · flag. Every feed brand used (from feed records / feed products).
4. **Health events:** disease records (disease · confirmed by · outcome), mortality summary, days with DO < 3 mg/L.
5. **Antimicrobial statement:** the exact wording, never softened:
   - `none_logged`: "No antimicrobial or banned substance was **recorded in Neerani** for this cycle (checked against the list of 19 Sep 2026). This record reflects only what the farm logged."
   - otherwise: the list of logged substances with dates.
6. **Harvest:** date(s), kg, grades (harvest spec H1).
7. **Footer:** generated date, list version, "This is a farm record, not a certificate or test result."

- Permissions: VIEW_FINANCIALS is **not** needed (there are no prices in it). It needs READ plus OWNER_ONLY or MANAGER to generate, because it is shared outside the farm.
- **No QR / public link / traceability claims.** `traceabilityPublic` stays false.
- i18n: the PDF renders in the **viewer's** locale, with an "English copy" toggle, because processors often need English.

---

## D5: Seed PCR + biosecurity checklist

### Seed at stocking

New nullable `crops` columns:
- `pl_spf boolean`
- `pl_pcr_date date`
- `pl_pcr_lab text`
- `pl_pcr_results jsonb`: `{ wssv, ehp, ahpnd, ihhnv }`, each `negative | positive | not_tested`

- CreateCycle gets a collapsible "Seed health" section.
- **Warn only:** if WSSV or EHP is `not_tested` or missing, show "Seed without a PCR test for WSSV and EHP is the most common way these diseases enter a pond". A `positive` result shows a red confirm: "Stocking PCR-positive seed is very likely to fail the crop".
- The fields are editable later from CycleDetail.

### Biosecurity checklist

A table:

```
biosecurity_checks(id uuid client-minted, crop_id FK CASCADE, item_key text, done_on date,
done_by uuid, note text NULL, UNIQUE(crop_id, item_key))
```

Items are a code constant. Each is stage-scoped and applied per cycle:

| stage | key |
|---|---|
| prep | `pond_dried`, `bottom_limed`, `water_filtered` (fine mesh at inlet), `water_disinfected`, `bird_net`, `crab_fence` |
| culture | `footbath`, `separate_tools`, `dead_shrimp_disposal` (bury with lime / burn: never into canals) |

- The checklist shows on CycleDetail and, until done, as one line on the pond dashboard ("Biosecurity 5 of 9").
- Ticks go through `saveRecord` (idempotent on the unique key, like molt ticks).
- WRITE_OPERATIONAL.
- It feeds D4 and the D7 early warning ("prep incomplete" raises WSSV entry risk).
- **Carcass disposal:** the mortality log adds one fixed tip line under the count. It is education, not a gate.

---

## D6: Health observations + mortality/disease records (DD4)

### `health_observations`

This **replaces** the harvest spec's `molt_observations`.

```
id uuid PK (client-minted, saveRecord), pond_id FK CASCADE, crop_id NULL, observed_on date (IST),
sign text NOT NULL   -- 'soft_shell' | 'white_feces' | 'red_body' | 'empty_gut' | 'loose_shell'
                     -- | 'black_gill' | 'luminescence' | 'surface_gathering' | 'erratic_swimming'
                     -- | 'white_spots' | 'pale_hp'
level text NOT NULL  -- 'none' | 'few' | 'many'
sample_size int NULL, count int NULL,
molt_deaths int NULL, source text NOT NULL  -- 'quick' | 'sampling' | 'harvest' | 'tray'
window_key varchar NULL, created_by uuid, created_at
```

- One row per sign seen. `none` is recorded only when the farmer explicitly checks a sign (so that "checked, none" differs from "not checked").
- The harvest spec M2 entry points (the Sampling soft-shell row, the post-molt quick tap, harvest rejection) write `sign='soft_shell'` here.
- **"Health check" quick log** on the pond dashboard: 11 sign chips, each with None / Few / Many, plus an optional photo. It is one screen and one save.
- The tray check form adds optional "white feces on tray" and "empty gut" toggles. These write observations with `source='tray'`.
- Photos: `photo_urls text[]` on observations. Upload reuses the feedback storage pattern (`backend/src/feedback/feedback-storage.service.ts`) with a new bucket `health-photos`. The bucket is **private**, reads use signed URLs, and access is checked per farm.
  - Photos are **online-only**. Offline, the photo button is disabled with "Photos need a connection". The observation itself still saves offline.
  - Compress to ≤1600 px, JPEG q0.7.

### Mortality

- New columns: `suspected_cause text NULL` (`unknown | low_do | disease | molt | handling | predator | other`) and `photo_urls text[]`.
- The form: a cause chip row and a photo.
- **On a spike** (`isMortalitySpike`, `day-score.ts:70`) the app prompts, on save and in the brief: "Deaths are 4× the usual. Do a health check?", which opens the D6 health check prefilled for this pond.
- **Cause `disease`** offers "Log a disease record" prefilled.

### Disease record

- New columns:
  - `symptom_signs text[]` (health sign keys)
  - `severity text` (normalised to `mild | moderate | severe`; map old values)
  - `affected_pct numeric NULL`
  - `confirmed_by text` (`suspected | microscopy | pcr | lab_other`), `confirmed_on date NULL`, `lab_name text NULL`
  - `outcome text NOT NULL DEFAULT 'ongoing'` (`ongoing | recovered | emergency_harvest | crop_lost`), `resolved_on date NULL`
  - `photo_urls`
- Migrate existing `notes` "Symptoms:/Action:" text into `notes` unchanged. **Don't parse it.**
- The form:
  - disease picker from a **cached** library (fixes H2: cache it with the TanStack persister like ponds);
  - symptom chips prefilled from health observations of the last 3 days;
  - severity, affected %, "confirmed by", photo.
  - "What did you do?" links or creates a treatment (D2), not free text.
- **Outcome:** the record shows "Still ongoing? Mark recovered / Emergency harvest / Crop lost".
  - "Emergency harvest" opens the harvest form (Full) with `reason` noted.
  - "Crop lost" uses the harvest spec H2 close-with-reason.
  - Open (`ongoing`) records older than 14 days get one watch line in the brief: "Is Pond 3's white feces still going on?"
- History shows the disease **name**, the severity chip, outcome and photos. Edit and delete are gated by capability.
- H4: "Log This Disease" from the library opens a **pond picker** (ponds with an active cycle), then the form with the disease prefilled.
- Disease records are added to Export.

---

## D7: Automatic early warning

`DiseaseIndicatorsService.derive(pondIds)` is set-based. It runs inside the existing alert-center
build (no new scheduler; the same lazy-on-read path as molt).

| Indicator | Rule (IST days) | Source |
|---|---|---|
| tempDrop | temperature fell ≥ 2 °C between two readings < 24 h apart, in last 3 d | water_quality_records |
| doBelow4 | latest DO < 4 within 24 h | pond-context |
| winter | IST month Nov–Feb | calendar (labelled) |
| docBelow35 | DOC < 35 | pond-context `doc` |
| redBody | health obs `red_body` ≥ few in 3 d | D6 |
| yellowVibrio | latest yellow vibrio > 10³ CFU/ml **or** green > 10% of TVC (within 7 d) | microbiology |
| vibrioUp | TVC rose ≥ 10× vs previous reading | microbiology |
| luminousVibrio | luminescent count > 0 within 7 d | microbiology |
| nightGlow | health obs `luminescence` | D6 |
| emptyGut / paleHp / whiteFeces / looseShell | health obs within 3 d (tray or quick) | D6 |
| sizeCv | latest sampling `std_deviation / mbw_g` > 0.30 | sampling |
| adgLow | pond-context `adgG` (harvest spec H6) < 0.1 g/d after DOC 30 | pond-context |
| chronicMortality | mortality logged ≥ 5 of last 7 days | mortality |
| multiStress | ≥ 2 WQ parameters in caution band at once | wq-thresholds |
| mineralDeficit | no mineral/lime treatment (D2 category) in 14 d **and** alkalinity < 100 | treatments + WQ |
| ehpRiskUp | EHP score ≥ 30 in the same run | engine |
| entryRisk (new, WSSV) | biosecurity prep < 50% done **or** seed WSSV `not_tested` | D5 |
| regionalWssv / regionWfd | **stay unset** until district + k≥5 regional data exists (location strategy) | — |

- Every threshold is labelled "field rule of thumb, uncalibrated" in code (E4 provenance).
- An indicator with no data is **`unknown`, not false.** The result carries `coverage: known/total` per disease, and the screen says "Based on 9 of 14 signs; log a health check to improve this".
- **Weights:** rebalance so that **every disease can reach Critical from derivable indicators**. Add a test per disease asserting that the max reachable score is ≥ 60, which fixes WFD's cap at 40. The weights stay the same shape; `ponytail:` comment "hand weights, calibrate against disease outcomes (D6) later".
- **Alerts:**
  - Critical → alert-center item (`source: 'disease'`, the slot already exists) plus a push to owners and managers, **once per (pond, disease) per 3 days**. Dedup is stored as a small `disease_alert_sent(pond_id, disease, sent_on)` or reuses an existing alerts row check. Pick whichever the alert-center already persists; don't add both.
  - Watch → alert item only.
  - Steps come as keys + params in 6 locales.
- **DiseaseRiskScreen** becomes a read-out with a trust layer:
  - per disease: band, coverage and the known triggers in plain words ("Water temperature fell 2.4 °C on 18 Sep");
  - "Add what you see" opens the D6 health check;
  - no manual chip checklist (remove it), and the snapshot is persisted on open (the existing `harvest_recommendations`-style table `disease_risk_snapshots`), so outcomes can later calibrate.
- The harvest spec H6 reads the current score from here instead of `diseaseRisk=0`.
- **Validation hook for later:** D6 outcomes plus persisted snapshots allow measuring "did Critical precede a confirmed case by ≥3 days" (PRD `:72` target). Add a PostHog event `disease_alert_raised` (allowlisted, disease + band only, no pond ids).

---

## D8: Honest diagnosis

1. **Scoring:** `fit = matchedWeight / profileWeight × (1 − 0.5 × unmatchedSelectedWeight / selectedWeight)`.
   - Require **≥ 2 selected signs** before showing any result.
   - Show **bands, not percentages**: `Strong match` (fit ≥ 0.6 and ≥ 2 primary signs) / `Possible` (≥ 0.35) / `Weak`. A percentage is never shown.
   - Tests:
     - ticking all signs does **not** give every disease Strong;
     - `black_gills` alone gives no result (fewer than 2 signs);
     - a WSSV-typical set gives WSSV as the only Strong.
2. **Profiles:** add RMS, IHHNV, loose shell (LSS), luminous vibriosis. Give `erratic_swimming` and `cannibalism` to profiles where they belong, or drop them. **Every profile edit is reviewed by a named aquaculture health person**, the same rule as D1 (`REVIEWED_BY` in the data file).
3. **Pond data prefill:** signs are ticked from D6 observations of the last 3 days, and "low DO"/"high ammonia" from pond-context, each labelled "from your logs". The farmer can untick any of them.
4. The **disclaimer comes first**, above the sign picker: "This suggests what to check. It cannot diagnose. Confirm with a lab."
5. **Every result offers "Confirm with a lab (PCR)"**: a static sheet on what sample to take (live moribund shrimp, how many, how to transport) and "nearest labs". The labs list is a curated constant for AP/TN/Gujarat/Odisha/WB, or links to MPEDA/RGCA lab pages until curated. **No treatment advice, ever.**
6. "Log this in pond": a pond picker, then the D6 disease form with the disease and signs prefilled (fixes the dead `reportInPond`).
7. Library deep-link by a stable `diseaseKey`, not a substring (fixes White Feces / White Muscle falling through).
8. Localise disease names in Diagnose (`diagnose.ts` names in 6 locales).

---

## 3. The welfare view (what ties it together)

"Welfare" in this app means **evidence that the animals were kept well**. It is not a separate
feature. It is the sum of D3–D7, surfaced in two places:

1. **Cycle Result (harvest spec H3) gains a "Health & welfare" section:**
   - survival;
   - days with DO < 3 mg/L;
   - days with free NH₃ in the critical band;
   - handling during molt peak (count);
   - disease episodes with outcomes;
   - antimicrobial status (D3);
   - biosecurity completion (D5);
   - seed PCR.

   Each item is one line, and only facts from logs. Anything that wasn't logged is labelled "not logged", never "0".
2. **Cycle input record (D4)** carries the same section to buyers.

This is what a processor, certifier or future welfare-labelled buyer asks for, and it builds itself
from daily logging.

---

## 4. Out of scope

- **Photo AI / computer-vision diagnosis.** No labelled data yet. D6 photos with confirmed outcomes are what that would need later.
- **Regional disease map / `regionalWssv`.** This needs district plus k-anonymous sharing (location strategy). The D7 hooks stay unset.
- **Certification, traceability QR, "export-eligible" badge.** D4 is a farm record only.
- **Lab-result import** (residue test PDFs, metabolite codes). This is D1's future lab-result field.
- **Brand product catalogue** (rejected in DD2). Brand names are only added as verified aliases.
- **Withdrawal periods without a source.** Never invented.

## 5. Rollout

| Step | Contents | Migration (apply BEFORE backend deploy) | Old-app safety |
|---|---|---|---|
| 1 | D0 | library text data migration | Stricter DTOs: old clients never sent scope keys on edit (verify in the PR by grepping the frontend `update(` calls) |
| 2 | D1 | none | Old clients use their bundled list until OTA |
| 3 | D2 + D3 | treatment columns, flag_history, inventory `treatment_id`/`ingredient_keys` | Old app posts free text, so the old path still works; the server still evaluates |
| 4 | D6 | health_observations, mortality + disease columns | New fields optional |
| 5 | D5 | crop seed columns, biosecurity_checks | Optional |
| 6 | D7 | none (or the dedup table) | Alerts are additive |
| 7 | D8 | none | OTA only |
| 8 | D4 | farms.caa_registration_no | New export only |

**Blocking content work (humans, start now):** D1 list review against primary texts; 6-locale
native review of ingredient and substance names; aquaculture-health review of D8 profiles and D7
thresholds; curated lab list.

## 6. Test gate

- **S1:** a parametrised foreign-scope PATCH test across every update route. Mutation-checked.
- **D1:**
  - native-script alias match;
  - `sulphamethoxazole` matches;
  - `sem` inside a sentence does not;
  - the generated frontend list is fresh (hash).
- **D2:** an ingredient with `bannedKey` flags exactly. `category='mineral'` ticks molt minerals, and an antibiotic does not.
- **D3:**
  - banned save → push to owner and manager, not to the logger;
  - replay → no second push;
  - lowering a flag without a reason → 400;
  - a list version adding a substance → an old cycle's compliance flips on read.
- **D6:** mortality edit recomputes population; a spike → health-check prompt; the disease library is available offline.
- **D7:**
  - every disease reaches ≥ 60 from derivable indicators;
  - no data → `unknown` plus coverage;
  - push dedup across 3 days.
- **D8:** the three scoring cases in §D8.1.
- **i18n:** parity in all 6 locales for every new namespace or key (`localeParity.test.ts`).
- Mutation-check every guard and every "never block" path (the save must succeed while flagged).

## 7. Doc corrections to carry

- `docs/PLAY_STORE_SUBMISSION.md:286, 349`: "before a treatment goes in the water".
- `docs/reference/PRD.md:201, 216-217, 337, 360`: "enforced", "export-eligible badge", "PCR gates". Mark them as not built, or as warn-only per this spec.
- `docs/FEATURES.md:147`: "derivation happens upstream" (true after D7).
- `docs/reference/UPCHECK_FEATURE_MATRIX.md:65, 80`: FE-only guardrail (stale); Disease Risk "WIRED" (manual only).
- `docs/APP_STATUS.md:31, 53, 64, 76`: stale i18n note, and "BANNED-1 migration pending". Confirm with a human whether `1780301800000-AddBannedSubstanceFlag` is applied in production; the daily brief already reads the column.
- `2026-09-19-harvest-and-molt-design.md` M2: the table is now `health_observations` (this spec §D6).
