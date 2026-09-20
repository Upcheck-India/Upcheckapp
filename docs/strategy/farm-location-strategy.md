# Farm Location: What to Do Now, and How It Earns Its Keep

**For:** founder · **Date:** 2026-09-14 · **Status:** Option B (§3.2) implemented in full 2026-09-20 — see spec `docs/superpowers/specs/2026-09-20-compliance-privacy-and-store-readiness-design.md` §C0.2, migration `1780702300000`. Everything in §4 onward ("Value map" / "Roadmap" beyond "Now") is still recommendation, not built.
**Labels used throughout:** **[EXISTS]** = in the code today · **[REC]** = recommended · **[SPEC]** = speculative / depends on partners or unverified assumptions

---

## 1. TL;DR

1. **Today we ask for precise GPS and use it for nothing.** Coordinates are saved to `farms.latitude/longitude` and never read by any backend service or screen, except when the farm form is reopened for editing. The permission text and the in-app copy promise "weather, tide and regional pricing". None of those use location. This is the one real problem to fix now.
2. **This week (Option B):** make location honest, optional and coarse. Ask for **state + district from a list** (no permission needed), keep "Detect my location" only as a shortcut that fills in the district, drop `ACCESS_FINE_LOCATION` in the next native build, round any coordinates to about 1 km, stop claiming features that don't exist, and let owners clear the location. Play has announced a precise-location declaration (deadline 27 Jan 2027) that asks why coarse location or the location button isn't enough. For "set my farm's position once" we have no good answer to that.
3. **The unit of value is the district, not the GPS point.** Almost everything location can do for us in the next 9 months keys off state/district: rain, heat and cyclone advisories, regional count-band prices, state-targeted regulatory news, a regional disease signal, and knowing where our users are. Precise coordinates only earn their place later, for compliance and finance (CAA and MPEDA both record farm lat/long). Even then, farmers can type coordinates from their registration certificate without any GPS permission.
4. **First real use (next 2–6 weeks):** district weather advisories in the Morning Briefing, tied to actions the app already knows about: recheck salinity and alkalinity after heavy rain, watch night DO in heat, run the pre-cyclone checklist. A second cheap use is making the region-aware price code (it exists) default to the farm's district. Harvest Timing currently uses hard-coded prices.
5. **Long-term moat, opt-in only:** an anonymised regional disease signal (k ≥ 5 farms, delayed, district or ~5 km grid). It feeds the `regionalWssv` / `regionWfd` indicators that already carry 20% and 15% weight in the disease engine but are never set. After that come compliance dossiers (CAA/MPEDA IDs, export), insurance and credit packs, and boundary maps. **Don't build worker GPS geofencing.** It costs a lot of privacy and Play review risk for little gain.

---

## 2. What we collect today and what happens to it

### 2.1 Evidence (file:line)

| What | Where | Fact |
|---|---|---|
| Permission | `frontend/android/app/src/main/AndroidManifest.xml:10-11` | `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`. No background location. |
| Permission copy | `frontend/app.config.ts:117-121` | "…set your farm position for **weather, tide and regional pricing** features." Uses the iOS *Always-and-when-in-use* key, although we only ever read in the foreground. |
| When asked | `frontend/src/screens/farms/CreateFarmScreen.tsx:115-130` | Only when the owner taps "Use current location". The request happens then, not on screen open. If denied, an alert shows and the form continues. |
| Precision | `CreateFarmScreen.tsx:123` | `Accuracy.Balanced` (~100 m). Raw float stored, not rounded. |
| What's sent | `CreateFarmScreen.tsx:139-140` | `latitude`, `longitude` in the create/update payload. Also passed through `PondNamesScreen` when ponds are named. |
| UI promise | `CreateFarmScreen.tsx:269, 293-299`; `i18n/locales/en/farms.ts:56, 119` | Code comment: "unlocks weather, lunar tides & regional pricing". Denial copy: "for weather and tide features". A map placeholder says "Map appears once location is set", but there is no map. |
| Displayed | `CreateFarmScreen.tsx:289` | Only as "Location set · 16.5432, 81.5213" inside the create/edit form. Never on a farm card, dashboard or report. The free-text **address** is shown on the farm list (`FarmsListScreen.tsx:401`). |
| Storage | `backend/src/farms/farm.entity.ts:52-59, 113-114`; baseline migration `1700000000000-BaselineSchema.ts:11` | `address text`, `latitude numeric`, `longitude numeric`, `boundary jsonb`. No index, no PostGIS, no state/district/pincode column. |
| Validation | `backend/src/farms/dto/create-farm.dto.ts:41-47, 65-70` | `@IsLatitude/@IsLongitude`, boundary ≤1000 points. |
| Readers | grep across `backend/src` | **None.** `farms.service.ts:106-113` writes the fields. Nothing else reads them. |
| Who sees them | `farms.controller.ts:41-50`, `farms.service.ts:152-187` | The whole farm row, coordinates included, goes to every member: worker, viewer, lender. |
| Can it be removed? | `CreateFarmScreen.tsx:139-140` + `farms.service.ts:189-191` | **No.** There's no "clear" control. Sending `undefined` is ignored by `repository.update`, so a stored location can't be deleted short of deleting the farm or account. |
| Pond GPS & boundaries | `ponds/pond.entity.ts:118-122, 147`; `create-pond.dto.ts:131-148`; `config/features.ts:29` | `gps_lat/gps_lng` + `boundary` columns exist with no UI. `boundaryMap: false`. |
| Map library | `frontend/package.json:84`; `docs/PLAY_STORE_SUBMISSION.md:453` | `react-native-maps` is installed and renders nothing. It adds APK weight and a Play Services dependency. |
| Home vestige | `frontend/src/screens/main/HomeScreen.tsx:232` | Reads `(first as any).location`, which is not a field on Farm. Always undefined. |
| Region code that exists, unused | `backend/src/india/price-feed.entity.ts:23-26`; `pricing.service.ts:35-51`; `india.controller.ts:44-62` | Price feeds are keyed by a **free-text** `region` ("AP-Nellore"). Nothing links a farm to a region. `HarvestTimingScreen.tsx:31-35, 98` sends hard-coded `DEFAULT_BANDS` (₹520/430/360). |
| Disease engine, dead inputs | `backend/src/disease-warning/disease-warning.service.ts:17, 28, 70, 83`; `DiseaseRiskScreen.tsx:25-32` | `regionalWssv` (weight 0.2) and `regionWfd` (0.15) are defined but never set by any screen or service. |
| Weather | `alert-center/alert-center.service.ts:10` | "weather" appears only in a comment listing engine sources. There is no weather integration and no tide data. The lunar module is moon-phase only (`lunar.service.ts`), which is correct and needs no location. |
| Region proxies | `profiles/profile.entity.ts:27-32` | `language_preference` is the only regional hint. Telugu points to AP/Telangana, but English and Hindi tell us nothing, and Gujarat has no language of its own among the six. |
| Crash reporting | `backend/src/common/sentry-scrub.ts:19` | Backend scrubs `latitude|longitude|address` keys. |
| Crash reporting (app) | `frontend/src/utils/sentry.ts:34-90, 92-100, 173-176` | Request/response bodies are dropped whole, which is good. But `latitude/longitude/address` are **not** in the key list, so a breadcrumb or error context carrying them would pass. |
| Analytics | `CreateFarmScreen.tsx:191` | `farm_created` sends only a size band. No location. Good. |
| Privacy policy | `docs/legal/PRIVACY_POLICY.md:26, 59`; `frontend/src/legal/content.ts:116-117` | "Location — to set a farm or pond location, and to provide **regionally relevant guidance**. Used when you ask for it. No background tracking." |
| Play Data Safety | `docs/PLAY_STORE_SUBMISSION.md:114, 127-142` | Declares **Precise location**, optional, App functionality. The doc itself already says "stated purpose does not need fine location … fold into the next build." |

**Unknown:** how many live farms actually have coordinates. We didn't query production. A one-line check the founder can run: `select count(*) filter (where latitude is not null) as with_gps, count(*) as total from farms where deleted_at is null;`

### 2.2 The gap, stated plainly

- We ask for precise location, store it unrounded forever, show it to every farm member, and use it for nothing.
- Three places tell the user it powers weather, tides and regional pricing. It powers none of them.
- The privacy policy's "regionally relevant guidance" isn't delivered, and the Play form declares a category (Precise) our purpose doesn't need.
- The regional features we *do* have half-built (price by region, regional disease indicators) aren't connected to the farm.

### 2.3 Why collecting-but-not-using is a real risk (not a theoretical one)

| Risk | How real | Source |
|---|---|---|
| **Play precise-location declaration.** Every app requesting `ACCESS_FINE_LOCATION` must justify why coarse location or the location button isn't enough. Declaration opens Nov 2026, deadline 27 Jan 2027 (30-day self-extension). The policy page ties enforcement to apps targeting Android 17+. We're on Expo SDK 54 today, but Play forces annual target-SDK bumps, so this arrives soon. | High. "One-time farm position" is exactly the case Play says the location button or coarse location covers. | [Play: Minimum Scope, Foreground Location & Location Button](https://support.google.com/googleplay/android-developer/answer/17033915?hl=en); [Policy announcement 15 Apr 2026](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en) |
| **Permission purpose must be core functionality.** Location may only be used for approved core features. Our rationale names features that don't exist. | Medium. A reviewer comparing the rationale to the app finds nothing. | [Play: Permissions & APIs that access sensitive info](https://support.google.com/googleplay/android-developer/answer/16585319?hl=en) |
| **Data Safety accuracy.** Precise means an area smaller than 3 km². Approximate means 3 km² or more. | Low now (we declare honestly). It becomes a mismatch if we change code without updating the form. | [Android: declare data use](https://developer.android.com/privacy-and-security/declare-data-use); [Maps SDK location data](https://developers.google.com/maps/documentation/android-sdk/location) |
| **DPDP Act 2023 + Rules 2025.** The Act rests on purpose limitation, data minimisation and storage limitation. Core consent and notice duties for data fiduciaries apply 18 months after the Rules were notified (≈ May 2027). For a sole-proprietor farmer, farm coordinates tied to an account are very likely personal data (a lawyer should confirm). Keeping data we don't use, with no way to erase it, is what purpose limitation targets. | Medium, with a clear date. | [PIB: DPDP Rules 2025 notified](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014); [Rules PDF](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf); [AZB: phased rollout](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/) |
| **Onboarding friction.** The button is optional and the permission is only asked on tap, which limits damage. But a "map appears once location is set" box that never shows a map reads as broken. | Low–medium. | `CreateFarmScreen.tsx:293-299` |
| **Farmer trust.** Farm location plus disease or harvest records is commercially sensitive. A trader who knows a farm had WSSV can push its gate price down. Farmers will ask "why do you need my GPS?" and today the honest answer is "we don't". | Medium, and it grows with scale. | Reasoning. See §6. |

---

## 3. Decision now (this week)

### 3.1 Options

| | **A. Remove** | **B. Keep, but honest + coarse + district** | **C. Keep precise, ship one use** |
|---|---|---|---|
| What | Delete the button, drop both permissions, stop sending coordinates. Leave the columns. | Replace GPS-first with a **state → district picker** (no permission). "Detect" becomes an optional shortcut using coarse location to pre-select the district. Round to 2 decimals (~1.1 km). Drop FINE. Fix copy. Add "clear location". | Keep as is, add a weather card now. |
| Effort | S (JS + native build) | S–M: 2 columns + a static district list + picker + copy. Manifest change rides the next native build. | M (weather backend + card), plus permission work anyway |
| Play | Cleanest: no location row | Declare **Approximate location**. No precise declaration needed. | Precise declaration by Jan 2027 with a weak justification |
| DPDP | Minimal | Minimised, purpose stated, erasable | Over-collection persists |
| Keeps future options | Loses the regional thread we need within ~1–3 months. Re-adding a permission later is more review friction than keeping a coarse one. | **Yes.** District unlocks every next-phase feature. | Yes, at unnecessary cost |
| Farmer UX | Nothing to answer | Picking a district is familiar and works offline, with no scary prompt | The prompt stays |

### 3.2 Recommendation: **B now, then the first real use (weather) within 2–6 weeks**

- **Precision needed now:** state + district. Coordinates aren't needed for anything in the next 9 months. When we do get them (the "Detect" shortcut), round on the device and again on the server to 2 decimals.
- **Precise vs coarse vs picker:** a picker needs **no permission** and is the default. Coarse GPS is an optional shortcut. **Precise isn't needed** until compliance and boundary features, and even then farmers can type the decimal lat/long already on their CAA form or MPEDA enrolment card ([CAA Form I](https://www.caa.gov.in/uploaded/doc/form-Inew.pdf) asks for state, district, taluk/mandal, revenue village, survey no., **latitude/longitude in decimal**, total and water-spread area).
- **Concrete changes [REC]:**
  1. Add `farms.state_code` (e.g. `AP`) and `farms.district_code`. Use LGD district codes from the Local Government Directory so price, news and disease data share one controlled list. This also answers the open question in `NEWS_AND_MARKET_FEED_SPEC.md:308` that free-text regions will fragment.
  2. Picker UI with an optional "Detect" button (coarse, `Accuracy.Low`) that only pre-selects the district. Show the district name, never raw coordinates.
  3. Round and store; add a "Remove location" action; allow clearing via PATCH `null`.
  4. Copy: remove "weather, tide and regional pricing" until they ship. Say "Your district helps us show local weather and prices". Delete the map placeholder. Switch the iOS key to when-in-use.
  5. Next native build: drop `ACCESS_FINE_LOCATION`. Update Data Safety to *Approximate*. Decide on `react-native-maps` (see §7).
  6. Add `latitude`, `longitude`, `address` as exact keys to the frontend Sentry scrubber (not fragments, because `lat` would match `template`).
  7. Hide coordinates from worker and viewer roles in `GET /farms`. District is enough for them.
  8. Backfill: derive district for farms that already have coordinates with a one-off offline point-in-polygon job, then decide whether to keep the rounded coordinates or drop them (§7).

---

## 4. Value map

Precision key: **S**tate · **D**istrict · **P**incode · **C**oarse GPS (~1–3 km) · **F** precise GPS · **B**oundary polygon. Effort: S ≤1 wk, M 2–6 wk, L >6 wk or partner-dependent.

### 4.1 Farmer daily operations

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| **Rain / heat / cold-snap advisories** [REC] | Heavy rain dilutes salinity and crashes alkalinity; shrimp struggle to molt below ~50 mg/L alkalinity ([FAO manual](https://www.fao.org/4/ac006e/AC006E04.htm); [The Fish Site, wet weather](https://thefishsite.com/articles/preparing-shrimp-farms-for-wet-weather-aquaculture-water-quality-indonesia)). Heat means night DO risk. A >3 °C drop raises WSSV risk (already an engine input). | Daily reason to open the app; engines become proactive | D or C | [IMD APIs](https://mausam.imd.gov.in/responsive/apis.php) (district nowcast, district forecasts; access by registration) or [Open-Meteo](https://open-meteo.com/en/pricing) (free tier is **non-commercial**, so we need the paid licence) | M | Morning Briefing, Alert Center (`source: weather`), Disease Risk `tempDrop3in48h`, Daily Routine, molt window |
| **Cyclone pre-event checklist** [REC] | Lower water, secure aerators, fuel the genset, decide on emergency harvest. East-coast cyclones repeatedly cause crop-scale losses ([Intrafish: Yaas >$140M](https://www.intrafish.com/shrimp/cyclone-yaas-wreaks-more-than-140-million-of-damage-as-indian-shrimp-farms-hit-with-flooding-hurricane-force-winds/2-1-1017236)) | Trust at the worst moment; already specced (`farmer_features_spec.md:227-247`) | D | IMD district warnings; **needs push** (brief: proactive push not built) | M | Harvest Timing (emergency harvest), Tasks |
| **Local tide times for tidal-intake farms** [SPEC] | When to pump from creek or estuary | Differentiator for `waterSourceType = 'tidal'` farms | C | Needs a tide-prediction source per coast. Not verified. | M–L | Lunar module (moon phase stays as is) |
| **Season/region-tuned defaults** [SPEC] | Inland low-saline vs coastal SOPs, typical hatcheries nearby | Better first-run experience | S/D | Our own content | S | Pond-prep SOP, reference data |

### 4.2 Disease risk

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| **Regional outbreak signal** (opt-in, aggregated) [REC, 3–9 mo] | "WSSV reported by ≥5 farms in your district in the last 14 days". WSSV passes between adjacent farms via water exchange and carriers ([PMC: WSSV genotypes in AP farms](https://pmc.ncbi.nlm.nih.gov/articles/PMC3550750/)) | **The network-effect moat** in the PRD (`PRD.md:161, 249`; `farmer_features_spec.md:252-270`). Value grows with density in AP clusters. | D → geohash-5 (~5 km) | Enough density; opt-in; moderation of reports | M | `regionalWssv` / `regionWfd` (already weighted, never set), disease records |
| Link to government surveillance [SPEC] | One tap to report to NSPAAD's "Report Fish Disease" app; its data is stored on temporal and spatial scales ([PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1935629); [NSPAAD](https://nspaad.nbfgr.res.in/)) | Credibility, a possible partnership with ICAR-NBFGR | D | Partnership | S (link) / L (integration) | Disease diagnosis |

### 4.3 Market

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| **Price board + Harvest Timing default to farm district** [REC] | Local count-band prices instead of hard-coded ₹520/430/360 | Makes existing `india/` code real; supports the "harvest timing" claim | D | Crowdsourced submissions (brief: "community pricing") | S (wire) + N6 in news spec | `pricing.service.latestForRegion`, `HarvestTimingScreen`, Crop P&L |
| State-targeted regulatory / news items [REC] | See AP or Gujarat notices, not everyone's | Relevance; already "Phase 2: by farm state" (`NEWS_AND_MARKET_FEED_SPEC.md:215`) | S | None | S | News module |
| Nearest processors/buyers [SPEC] | Who buys near me | Lead-gen and B2B (PRD P5) | D/C | Buyer directory | L | Harvest records (buyer) |

### 4.4 Marketplace / shop

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| Dealer serviceability / delivery radius [SPEC] | Only products that deliver to me | A requirement for `marketplaceCheckout` | P or D (delivery address at checkout, not farm GPS) | Vendor partners, payments | L | Products catalogue |

### 4.5 Compliance and export

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| **Registration IDs on the farm** (CAA reg. no. + validity, MPEDA FARMID) [REC, 3–9 mo] | Renewal reminders (CAA registration lasts 5 years) and one place for certificates | "Export-ready" positioning; already in `jala_teardown_india.md:52-60` | F typed from certificate (no permission) | None | S–M | Banned-substance flag, Export |
| Traceability pack for processors [SPEC→REC later] | Proof for buyers | MPEDA enrols farms with a FARMID and GPS coordinates; its **Aqua Trace** Web GIS portal and **SHAPHARI** certification (Mar 2025) track farm to export ([MPEDA enrolment](https://mpeda.gov.in/?page_id=989); [SHAPHARI & Aqua Trace](https://www.mpeda.gov.in/indianseafood/?p=1045)). US SIMP requires the aquaculture facility's name, authorised at farm level ([NOAA SIMP](https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program)). | F + FARMID | Processor demand; `traceabilityPublic` infra | L | Export, cycle records |

### 4.6 Finance

| Feature | User value | Business value | Data | Dependency | Effort | Plugs into |
|---|---|---|---|---|---|---|
| Insurance / credit "farm dossier" PDF [REC, 3–9 mo] | Faster application: area, water-spread, cycles, P&L, location | Viewer role for lenders already exists; basis for a B2B data product | D + optional F/B | None for a PDF; partners for a direct pipe | M | Export, Crop P&L, Viewer role |
| Aquaculture insurance support [SPEC] | Premium incentive: 40% of premium, capped at ₹25,000/ha (≤4 ha) under PMMSY; covers cyclone, flood, and disease in comprehensive plans ([PIB: insurance to aquaculture](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2110678)). Pilot states include AP, Gujarat, Odisha ([Drishti](https://www.drishtiias.com/daily-updates/daily-news-analysis/aquaculture-crop-insurance)) | Partnership with insurers who price by location and weather | D + B for claims | Insurer | L | Weather log, mortality, harvest |
| KCC (fisheries) [SPEC] | Banks ask for proof of pond ownership or lease, not GPS ([Jan Samarth KCC Fisheries](https://www.jansamarth.in/kisan-credit-card-fisheries-scheme)) | The dossier helps; location is secondary | D | Bank | — | Dossier |
| State power tariff eligibility [SPEC] | AP's e-Fish survey uses aqua-zone location and tank size for concessional power tariffs ([Deccan Chronicle](https://www.deccanchronicle.com/nation/in-other-news/260622/ap-e-survey-to-extend-aqua-farmers-cheaper-power.html)) | Relevant content for AP users | D/B | Govt data | — | Aeration & Power engine |

### 4.7 Team, business intelligence, hardware

| Feature | User value | Business value | Data | Dependency | Effort | Verdict |
|---|---|---|---|---|---|---|
| Worker attendance geofence | Proof that workers were on site | Low | F + **background location** | Prominent disclosure + background permission. Play has removed geofencing as a foreground-service use case. | M | **Don't build.** It's surveillance of low-wage workers, a real review risk and a trust cost. Manager verification already exists. |
| "Where our users are" (aggregated) [REC] | — | Traction by geography for investors (the brief lists geography as something investors ask for); sales and field-agent targeting | D, **aggregated** counts only, k ≥ 5 | None | S (admin query) | Yes, from district columns |
| Boundary / pond polygons [SPEC] | Verify area → better stocking density, feed, insurance | Satellite verification ([Bhuvan](https://bhuvan.nrsc.gov.in/ngmaps); Sentinel-1 pond detection research) | B | `react-native-maps` + a Maps key or offline tiles | L | Only when insurance or traceability needs it (`boundaryMap` flag) |
| IoT devices geotagged [SPEC] | — | Device registry for P3 | Farm-level inherited | Hardware | — | Inherit from farm. No per-device GPS. |

---

## 5. Roadmap

| Phase | Features | Precision | Consent / permission | Data model | Success metric | Kill criteria |
|---|---|---|---|---|---|---|
| **Now (this week → next native build)** | Option B: district picker, optional coarse detect, honest copy, remove-location, hide coordinates from workers/viewers, Sentry keys, backfill district | S + D (C optional, rounded) | Drop FINE → declare *Approximate*. Update privacy §4 wording to "district, to show local weather, prices and alerts". | `state_code`, `district_code` (LGD); round `lat/lng` to 2 dp; `boundary`/pond GPS stay dormant | ≥70% of new farms pick a district; zero Play location queries | If <30% pick a district after 4 weeks, make it a skippable step in onboarding rather than a buried field |
| **Next (1–3 months)** | 1) District weather advisories in Morning Briefing and Alert Center (rain→salinity/alkalinity recheck, heat→night DO, cold snap→WSSV input). 2) Cyclone warning + pre-cyclone checklist (needs push). 3) Price board and Harvest Timing default to district feed. 4) State-targeted news. 5) Admin: farms by district (k ≥ 5). | D | None new. Disclose "we use your farm's district to fetch weather" at the card. | `weather_cache(district_code, date, …)`; `price_feeds.region` → district code | Weekly active farms that open a weather advisory; % of harvest-timing runs using a real regional feed; D30 retention uplift in farms with district vs without | If weather advisories get <10% interaction after 6 weeks, or IMD/Open-Meteo licensing costs more than their value, cut to rain-only |
| **3–9 months** | 1) **Opt-in regional disease signal** feeding `regionalWssv`/`regionWfd`. 2) Farm registration fields (CAA no. + validity, MPEDA FARMID) with renewal reminders. 3) Farm dossier PDF for lender, insurer or processor, which may include exact coordinates the owner types or confirms. | D → geohash-5 for disease; F typed for dossier | **Separate explicit opt-in** for disease pooling (off by default, revocable, history deleted on withdrawal). Precise coordinates are user-entered; still no FINE permission. | `disease_signal_optin` on farm; `farm_geohash5` (derived); `caa_reg_no`, `caa_valid_till`, `mpeda_farm_id` | Opt-in rate ≥40% among disease-logging farms; ≥3 districts meet k ≥ 5; dossiers exported per month | If fewer than 3 districts reach k ≥ 5 within 6 months, pause the map and keep only the district news feed. Kill immediately on any re-identification complaint. |
| **9–18 months+** | 1) Regional biosecurity map (district or grid heat map, no pins of other farms). 2) Boundary drawing (`boundaryMap`) + satellite area check, for insurance or traceability partners. 3) Traceability public QR (`traceabilityPublic`) with processor-grade location. 4) Marketplace delivery serviceability (`marketplaceCheckout`), using delivery pincode at checkout. 5) Benchmarking vs anonymised regional cohort. | B, F where a partner requires it; P for delivery | Precise via the **location button** (one-time) if GPS capture is used. Re-evaluate Play declaration. Public QR only shows state and district unless the owner opts in. | PostGIS **only when** radius or polygon queries are real (map, satellite overlay). Until then geohash columns + btree indexes. | A partner (insurer, processor, MPEDA/NSPAAD) actually consumes the data; paid tier attaches to it | No partner signs within 6 months of building boundary capture → leave `boundaryMap` off and uninstall the map library |

**How this fits the existing roadmap:** PRD P2 lists "Weather/cyclone" (`PRD.md:159`), P4 "Regional biosecurity map + benchmarking" (`:161`), and P5 "marketplace, finance/insurance data products, full export traceability" (`:162`). The four deferred flags (`features.ts`) are unchanged. This plan gives them the location foundation they assume but never specified.

---

## 6. Privacy and trust design

**Consent UX copy principles [REC]**
- Say the purpose in the farmer's words, next to the feature, in all six languages: *"Your district lets us warn you about heavy rain and show local shrimp prices."* Never "improve your experience".
- Never claim a feature before it ships. The app-store rationale, the in-app denial message and the privacy policy must name the same live features.
- Picker first, permission second. Refusing loses nothing but convenience.
- Disease pooling is a separate, explicit, off-by-default toggle, with a one-screen explainer: what's shared (counts by district), what's never shared (farm name, exact place, owner), and how to withdraw.

**Precision minimisation**

| Purpose | Maximum precision we should hold |
|---|---|
| Weather, prices, news, BI | District (store code; coordinates optional, rounded to ~1 km) |
| Disease aggregation | geohash-5 (~5 km) derived server-side; never returned to clients |
| Compliance / dossier | Exact coordinates the owner enters for that document; shown only to owner and manager |
| Boundary | Only with a partner purpose; owner-only visibility |

**Aggregation thresholds (regional disease signal)**
- Publish a cell only if **≥5 distinct farms and ≥3 distinct owners** reported in the window. The PRD suggests k ≥ 3, which is too low in sparse inland areas.
- Fall back from grid to district when the grid fails k. Suppress rather than round counts below k.
- Delay 24–72 h, and show counts as bands ("5–9 farms"). Never show other farms as pins.
- No per-farm disease data leaves the owner's farm scope. Viewers and lenders see only their own granted farm.

**Retention**
- Delete coordinates, district and boundary with the farm or account (the cascade already exists).
- On withdrawal of disease opt-in, remove that farm's contributions from future aggregates.
- Weather cache is not personal data (keyed by district); keep it 30 days.
- Before any backfill, decide whether to discard existing unrounded coordinates (§7).

**Telemetry**
- Sentry: backend already scrubs `latitude|longitude|address`. Add the same exact keys plus `district_code` and `geohash` to `frontend/src/utils/sentry.ts`.
- PostHog: never send coordinates, geohash or district. If geography is needed for growth analysis, compute it from the DB in aggregate, not from events.

**Play Data Safety by phase**

| Phase | Location row |
|---|---|
| Today | Precise, collected, optional, App functionality (accurate but excessive) |
| Now (B) | **Approximate**, collected, optional, App functionality. Also decide whether the free-text farm **address** should be declared under Personal info → Address; it isn't in the current table (`PLAY_STORE_SUBMISSION.md:108-122`). |
| 3–9 mo | Approximate. Dossier coordinates are typed by the user. Confirm with Play whether that counts as location collection (conservatively, yes, still Approximate/Precise per value). |
| 9–18 mo | If GPS boundary or location-button capture ships: Precise, with the Play precise-location declaration ("location tagging", user-initiated) |

**DPDP notes (confirm with counsel)**
- The notice must itemise location data and each purpose. A new purpose (disease pooling, sharing with an insurer) needs fresh consent.
- Erase once the purpose ends. Give a correction and erasure path in-app (the "Remove location" button).
- Plan to have this done before the Phase III obligations (~May 2027).
- Sharing with partners (insurer, processor, NSPAAD) only on owner request, per farm, with a record of what was shared.

---

## 7. Risks and open questions for the founder

1. **Existing coordinates.** Keep them rounded to 2 dp, or derive district and delete them? *Recommendation: derive district, round, keep, and tell users in the next update note.*
2. **Weather source and budget.** IMD APIs (government, district warnings, registration needed) or Open-Meteo commercial (simpler API, paid)? Who signs the licence?
3. **Push notifications.** Cyclone and rain alerts are near-worthless if the app has to be opened first. Is proactive push prioritised for the next quarter?
4. **Disease data stance.** Are we willing to pool anonymised disease reports at all, and would we ever share aggregates with NSPAAD, MPEDA or processors? That's a brand decision as much as a technical one.
5. **`react-native-maps`.** Uninstall in the next native build (smaller APK, one less dependency) or keep for `boundaryMap`? *Recommendation: uninstall unless a boundary partner is in sight within ~6 months.*
6. **Gujarat and other non-covered languages.** The district picker makes region explicit, but the language set doesn't match the Gujarat belt. Is Gujarat a target?
7. **Farm address field.** It's free text, shown on the farm list, and probably a Data Safety omission. Keep it, replace it with village/mandal selection, or drop it?
8. **Worker geofencing.** Confirm it's a firm "no". Sales conversations will ask for it.
9. **Partner sequencing.** Insurance (weather and location priced), processors (traceability) and government (NSPAAD, MPEDA Aqua Trace) each want farm location for different reasons. Which one do we court first? That decides whether precise location or boundaries ever become necessary.

**Honest limits of this document:** market-share figures (e.g. AP ≈ 78% of vannamei) come from a commercial research summary ([IMARC](https://www.imarcgroup.com/indian-shrimp-market)) and are an estimate. Play's precise-location scope and dates were read on 2026-09-14 and may change. CAA form fields are from the published Form I as indexed by search; confirm against the live CAA portal.

---

## 8. Appendix

### 8.1 Code evidence (paths relative to repo root)

- `frontend/src/screens/farms/CreateFarmScreen.tsx:18, 71, 90-92, 115-130, 139-140, 269-299, 302-307`
- `frontend/app.config.ts:117-121` · `frontend/android/app/src/main/AndroidManifest.xml:10-11` · `frontend/package.json:61, 84`
- `frontend/src/api/farms.ts:12-16, 47-50` · `frontend/src/api/ponds.ts:22-27`
- `frontend/src/i18n/locales/en/farms.ts:51-57, 118-119`
- `frontend/src/screens/farms/FarmsListScreen.tsx:401` · `frontend/src/screens/main/HomeScreen.tsx:232`
- `frontend/src/screens/engines/HarvestTimingScreen.tsx:31-35, 90-99` · `frontend/src/screens/engines/DiseaseRiskScreen.tsx:25-32`
- `frontend/src/config/features.ts:29, 37-40`
- `frontend/src/utils/sentry.ts:34-90, 92-100, 173-176` · `frontend/src/legal/content.ts:116-117`
- `backend/src/farms/farm.entity.ts:52-59, 113-114` · `backend/src/farms/dto/create-farm.dto.ts:41-47, 65-70` · `backend/src/farms/dto/update-farm.dto.ts:4`
- `backend/src/farms/farms.service.ts:106-113, 152-191` · `backend/src/farms/farms.controller.ts:41-50`
- `backend/src/ponds/pond.entity.ts:118-122, 147` · `backend/src/ponds/dto/create-pond.dto.ts:131-148` · `backend/src/common/dto/boundary-point.dto.ts`
- `backend/src/migrations/1700000000000-BaselineSchema.ts:11, 47`
- `backend/src/india/price-feed.entity.ts:17-26` · `backend/src/india/pricing.service.ts:35-51` · `backend/src/india/india.controller.ts:27-62`
- `backend/src/disease-warning/disease-warning.service.ts:12-42, 66-85`
- `backend/src/alert-center/alert-center.service.ts:10` · `backend/src/common/sentry-scrub.ts:19` · `backend/src/profiles/profile.entity.ts:27-32`
- Docs: `docs/PLAY_STORE_SUBMISSION.md:96-142, 453` · `docs/legal/PRIVACY_POLICY.md:26, 59` · `docs/reference/PRD.md:153-162, 245-251, 324` · `docs/reference/farmer_features_spec.md:227-270` · `docs/reference/jala_teardown_india.md:52-60, 191-209` · `docs/NEWS_AND_MARKET_FEED_SPEC.md:188-215, 308` · `docs/superpowers/specs/2026-09-05-native-module-buildout-design.md:204-210`

### 8.2 Sources

- Google Play: [Minimum Scope, Foreground Location & Location Button](https://support.google.com/googleplay/android-developer/answer/17033915?hl=en) · [Policy announcement, 15 Apr 2026](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en) · [Permissions & APIs that access sensitive info](https://support.google.com/googleplay/android-developer/answer/16585319?hl=en) · [Prominent disclosure best practices](https://support.google.com/googleplay/android-developer/answer/11150561?hl=en) · [Android: declare data use](https://developer.android.com/privacy-and-security/declare-data-use) · [Maps SDK: location data](https://developers.google.com/maps/documentation/android-sdk/location)
- DPDP: [PIB, DPDP Rules 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014) · [Rules PDF](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) · [AZB & Partners, phased rollout](https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/)
- Regulators and registration: [CAA Form I](https://www.caa.gov.in/uploaded/doc/form-Inew.pdf) · [CAA farm registration](https://caa.gov.in/NSWS_farms.html) · [MPEDA farm enrolment](https://mpeda.gov.in/?page_id=989) · [MPEDA SHAPHARI & Aqua Trace](https://www.mpeda.gov.in/indianseafood/?p=1045) · [NOAA SIMP](https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program) · [LGD directory](https://lgdirectory.gov.in/)
- Disease surveillance: [NSPAAD](https://nspaad.nbfgr.res.in/) · [PIB, Report Fish Disease app](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1935629) · [PMC, WSSV genotypes & epidemiology](https://pmc.ncbi.nlm.nih.gov/articles/PMC3550750/)
- Weather: [IMD APIs](https://mausam.imd.gov.in/responsive/apis.php) · [IMD API reference](https://api.imd.gov.in/public/api_reference.html) · [Open-Meteo pricing/licence](https://open-meteo.com/en/pricing) · [Intrafish, Cyclone Yaas losses](https://www.intrafish.com/shrimp/cyclone-yaas-wreaks-more-than-140-million-of-damage-as-indian-shrimp-farms-hit-with-flooding-hurricane-force-winds/2-1-1017236)
- Pond management: [FAO penaeid shrimp pond manual](https://www.fao.org/4/ac006e/AC006E04.htm) · [The Fish Site, wet weather](https://thefishsite.com/articles/preparing-shrimp-farms-for-wet-weather-aquaculture-water-quality-indonesia)
- Finance: [PIB, insurance to aquaculture](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2110678) · [Drishti, aquaculture crop insurance pilot](https://www.drishtiias.com/daily-updates/daily-news-analysis/aquaculture-crop-insurance) · [Jan Samarth, KCC Fisheries](https://www.jansamarth.in/kisan-credit-card-fisheries-scheme) · [Deccan Chronicle, AP e-Fish survey power tariff](https://www.deccanchronicle.com/nation/in-other-news/260622/ap-e-survey-to-extend-aqua-farmers-cheaper-power.html)
- Market and geo data: [MPEDA state-wise aquaculture production](https://mpeda.gov.in/?page_id=651) · [IMARC Indian shrimp market (estimate)](https://www.imarcgroup.com/indian-shrimp-market) · [data.gov.in All India Pincode Directory](https://www.data.gov.in/catalog/all-india-pincode-directory) · [ISRO Bhuvan](https://bhuvan.nrsc.gov.in/ngmaps)
