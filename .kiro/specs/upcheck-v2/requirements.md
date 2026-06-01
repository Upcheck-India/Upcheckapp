# Requirements Document

## Introduction

Upcheck v2 is a coordinated overhaul of the Upcheck shrimp-farming operations and decision-support platform for the Indian market. This document supersedes the earlier `JALA_feature_spec.md` and reconciles all requirements against the implemented codebase under `/home/kiran-sekar/UPCHECKAPP/` (NestJS 11 backend with TypeORM + Supabase + Redis + Brevo; Expo SDK 54 / React Native 0.81 / React 19 frontend with Zustand, React Native Paper, i18next).

The overhaul spans eleven coordinated work areas plus a set of cross-cutting concerns: endorsement removal, offline-storage migration to AsyncStorage, per-species five-zone water-quality thresholds, India localization, a banned-substance guardrail, financials/P&L, threshold-driven alerts, inventory movements, growth projection, tasks and roles, and cycle PDF reports.

Three product principles constrain every requirement in this document:

1. **Inform and calculate, never prescribe or promote.** Upcheck provides no endorsement, no eShop, no paid placement, and no "buy brand X" suggestions. Protective, non-directive danger warnings (banned substances, out-of-range water quality) are permitted.
2. **Scientifically accurate and India-specific.** Per-species thresholds, conditional toxicity computation, INR with lakh/crore grouping, acres, count-based pricing, indigenous species, and CAA/MPEDA regulatory anchors.
3. **Decision-support, not professional advice.** A standing disclaimer accompanies advice surfaces, and legal review (ASCI/CCPA + CAA/MPEDA) is scheduled before launch.

Truecaller authentication (under `.kiro/specs/truecaller-auth/`) is already built and property-tested and is explicitly out of scope for this document.

## Glossary

- **Upcheck_System**: The complete Upcheck v2 platform, comprising the backend API and the mobile client.
- **Backend_API**: The NestJS server exposing REST endpoints under `/api`.
- **Mobile_Client**: The Expo/React Native application.
- **eShop**: The legacy commerce surface backed by the `products` module, `product.entity.ts`, `/api/products*` routes, and the client storefront screens.
- **Reference_Catalogue**: A server-maintained, farmer-selectable list of reference entities — feed products, hatcheries, and broodstock — exposed by the reference module.
- **Calculator**: Any of the decision-support calculators (Product Dosage, Daily Feed, Cultivation Performance, Free Ammonia, Growth Projection).
- **Offline_Store**: The client-side persistence layer built on `@react-native-async-storage/async-storage`.
- **Outbox_Queue**: A FIFO JSON array of pending write operations held in the Offline_Store while the device is offline.
- **Read_Cache**: Namespaced AsyncStorage keys (e.g. `cache:ponds:<farmId>`) holding last-known farms, ponds, crops, and latest readings for offline rendering.
- **Sync_Engine**: The client component (the `syncStore` public interface) that detects connectivity, flushes the Outbox_Queue, and refreshes the Read_Cache.
- **Idempotency_Key**: A client-generated UUID attached to each queued write so the Backend_API can deduplicate retried operations.
- **Network_Monitor**: The connectivity detector built on `@react-native-community/netinfo`.
- **Offline_Indicator**: The existing client UI element that displays connectivity and data-staleness state.
- **Species**: A cultured shrimp/prawn species record. Penaeid species include vannamei (*Litopenaeus vannamei*), monodon (*Penaeus monodon*), indicus (*Penaeus indicus*), semisulcatus (*Penaeus semisulcatus*), merguiensis (*Penaeus merguiensis*), and japonicus (*Penaeus japonicus*). The freshwater scampi (*Macrobrachium rosenbergii*) is a non-penaeid species.
- **Parameter_Threshold**: A tunable, server-stored record keyed by (parameter, species) defining the five-zone bands for one water-quality parameter.
- **Five_Zone_Model**: A water-quality classification with zones critical-low, caution-low, optimal, caution-high, and critical-high; any boundary may be null for one-sided parameters.
- **Threshold_Evaluator**: The component that classifies a measured value into a Five_Zone_Model zone.
- **TAN**: Total Ammonia Nitrogen (mg/L).
- **Free_Ammonia (NH3)**: The un-ionized, toxic ammonia fraction, computed from TAN, pH, and temperature via the Emerson pKa relationship.
- **Shrimp_Calculations_Service**: The backend service computing FCR, ADG, survival rate, feed, free ammonia, dosage, and growth projection.
- **Banned_Substance**: A substance on the server-updatable prohibited/restricted list (e.g. chloramphenicol, nitrofurans and their metabolites AOZ/AMOZ/SEM/AHD, fluoroquinolones, nitroimidazoles, colistin, neomycin, nalidixic acid, sulfamethoxazole) plus MRL-limited substances (e.g. oxytetracycline).
- **Banned_Substance_Matcher**: The component (`findBannedSubstances()`) that detects Banned_Substance references within free text.
- **Withdrawal_Window**: The number of days before planned harvest during which a Banned_Substance treatment invalidates PHT-readiness.
- **PHT_Readiness**: A pre-harvest-test readiness flag on a cycle.
- **CAA**: Coastal Aquaculture Authority (registration anchor on a Farm).
- **MPEDA**: Marine Products Export Development Authority (enrollment anchor on a cycle).
- **Cost_Ledger**: The category-keyed record of farm costs (extends the finances/transactions modules).
- **PL_Dashboard**: The profit-and-loss summary surface.
- **Auto_Posting_Service**: The single backend service that derives downstream side effects (cost, stock movement, revenue) from feed and harvest records.
- **Inventory_Lot**: A received stock batch with quantity, unit price, and optional expiry.
- **Stock_Movement**: A recorded change (receipt or issue) against inventory.
- **Task_Board**: The task management surface for assignment and SOP checklists.
- **Recorded_By_Id**: The user identifier stamped onto a record when it is created or edited.
- **Cycle_Report**: A shareable PDF summary of a cycle (KPIs, P&L, water-quality trends, harvest table).
- **Count**: Shrimp size expressed as pieces per kilogram (count 20–120).
- **INR_Formatter**: The client utility formatting whole-rupee integers using `Intl.NumberFormat('en-IN')` with lakh/crore grouping.
- **Standing_Disclaimer**: The fixed notice stating Upcheck is a decision-support tool and not a substitute for professional veterinary or aquaculture advice.

## Assumptions and Non-Goals

These items were flagged as open questions. They are recorded here as working assumptions so requirements can proceed; items marked "confirm before implementation" gate specific tasks and must be resolved in the design or implementation phase.

- **A-1 (eShop disposition)**: Assumed the eShop is hard-removed (module, routes, and table dropped via migration). An `ENABLE_ESHOP` flag defaulting to `false` is preserved for optional reactivation, but the default product build ships with no shop. Confirm before implementation whether hard-delete or flag-disable is preferred.
- **A-2 (Daily Feed formula)**: Assumed the current `calculateDailyFeed` (biomass × feeding-rate%) is authoritative. Confirm against any product requirement document before changing the formula.
- **A-3 (Harvest Type and Product Type enums)**: Assumed `harvestType` ∈ {partial, full} and treatment `basedOn` ∈ {written_notes, product_usage} as currently coded. Confirm enum value sets.
- **A-4 (Free-ammonia band recalibration)**: The recalibration of free-ammonia caution/critical bands from 0.1/0.5 to 0.05/0.1 mg/L is treated as provisional and **must be confirmed with an agronomist before the backend constant is changed**. Requirements specify alignment between backend and frontend regardless of the final numbers.
- **A-5 (indicus/scampi thresholds)**: Threshold values for *P. indicus* and *M. rosenbergii* are provisional and **must be verified with ICAR-CIBA / RGCA** before seeding to production.
- **A-6 (count-based price feed)**: The external count-based price feed source and its license (e.g. Aquaconnect/MPEDA) are unconfirmed. Requirements support manual "Self Priced" entry as the baseline so the feature does not depend on an external feed.
- **A-7 (legal review)**: Legal review of advice surfaces and disclaimers (ASCI/CCPA, CAA/MPEDA) is a launch gate, not an implementation task. Requirements ensure the disclaimer and warn-only behaviors exist to support that review.
- **Non-goal**: Full seafood traceability (lot-level chain of custody) is out of scope; CAA/MPEDA anchors are lightweight metadata only.
- **Non-goal**: Re-implementing Truecaller authentication.

---

## Requirements

### Requirement 1: Remove the eShop Commerce Surface (§A.1)

**User Story:** As the Upcheck product owner, I want the eShop fully removed by default, so that the platform never sells or endorses products and stays aligned with the inform-don't-promote principle.

#### Acceptance Criteria

1. THE Backend_API SHALL expose no commerce endpoints under the `/api/products` path when `ENABLE_ESHOP` is `false`.
2. WHERE `ENABLE_ESHOP` is unset, THE Backend_API SHALL treat the eShop as disabled.
3. WHEN a database migration that drops the `products` table is applied, THE Backend_API SHALL continue to start and serve all non-commerce endpoints.
4. THE Mobile_Client SHALL present no storefront, cart, checkout, or product-purchase screen in any navigation path.
5. WHERE `ENABLE_ESHOP` is `true`, THE Backend_API SHALL restore the legacy commerce endpoints for internal reactivation.
6. IF a client requests a removed commerce endpoint WHILE the eShop is disabled, THEN THE Backend_API SHALL respond with HTTP 404.
7. WHEN the treatment module references a product association after the `products` table is removed, THE Backend_API SHALL store treatment product information as free text without a foreign-key dependency on the dropped table.

### Requirement 2: Neutralise Reference Catalogues (§A.2)

**User Story:** As a farmer, I want reference catalogues (feed products, hatcheries, broodstock) presented neutrally, so that I choose based on my own judgement rather than platform endorsement.

#### Acceptance Criteria

1. WHEN a Reference_Catalogue list is requested without a search term, THE Backend_API SHALL return entries ordered alphabetically by display name.
2. WHERE a recently-used ordering is requested, THE Backend_API SHALL order entries by the requesting user's most-recent-use timestamp descending, with alphabetical order as the tie-breaker.
3. THE Reference_Catalogue SHALL expose no field or label denoting "recommended", "featured", "top pick", "sponsored", or any equivalent editorial preference.
4. THE Mobile_Client SHALL render Reference_Catalogue entries without preference badges, ranking ribbons, or highlight styling that distinguishes one entry as preferred.
5. WHEN a farmer's desired entry is absent from a Reference_Catalogue, THE Mobile_Client SHALL allow a free-text "Other" entry.
6. THE Reference_Catalogue SHALL present indigenous and Indian-market entries on equal footing with all other entries, with no positional or visual advantage.

### Requirement 3: Calculators Must Not Auto-Select Branded Products (§A.3)

**User Story:** As a farmer, I want calculators to compute neutrally, so that results never steer me toward a specific brand.

#### Acceptance Criteria

1. WHEN the Product Dosage Calculator initializes, THE Calculator SHALL leave the product selection empty rather than pre-selecting any branded product.
2. WHEN the Daily Feed Calculator initializes, THE Calculator SHALL leave the feed-product selection empty rather than pre-selecting any branded feed.
3. WHEN the Cultivation Performance Calculator initializes, THE Calculator SHALL leave any product-related selection empty.
4. THE Calculator SHALL compute results from user-entered numeric inputs without requiring selection of a catalogued branded product.

### Requirement 4: Disease and Treatment Surfaces Are Informational Only (§A.4)

**User Story:** As a farmer, I want disease and treatment information presented without product recommendations, so that I receive education rather than a sales pitch.

#### Acceptance Criteria

1. THE Mobile_Client SHALL present disease and treatment content as informational text without any "buy" or "purchase" call to action.
2. WHEN a banned-substance guardrail fires (see Requirement 18), THE Upcheck_System SHALL NOT suggest an alternative product to use instead.
3. THE Mobile_Client SHALL display the Standing_Disclaimer on every disease and treatment surface.

### Requirement 5: No Advertising or Sponsored Content (§A.5)

**User Story:** As the Upcheck product owner, I want zero advertising and clearly labelled optional sponsorship, so that the platform's neutrality is verifiable.

#### Acceptance Criteria

1. THE Mobile_Client SHALL integrate no advertising SDK.
2. THE News surface SHALL present editorial content only.
3. WHERE a News article is marked sponsored, THE Mobile_Client SHALL display a visible "Sponsored" label on that article.
4. THE Upcheck_System SHALL default the sponsored-content capability to off.

### Requirement 6: First-Party SaaS Pricing Is Permitted (§A.6)

**User Story:** As the Upcheck business owner, I want to offer first-party subscription pricing, so that the platform is sustainable without endorsing third-party products.

#### Acceptance Criteria

1. THE Upcheck_System SHALL permit display and purchase of first-party offerings limited to Upcheck Plus and AI Photo-Sampling MBW.
2. THE Upcheck_System SHALL present first-party SaaS pricing separately from any Reference_Catalogue.
3. THE Upcheck_System SHALL NOT present third-party product pricing as a purchasable offering.

### Requirement 7: Offline Storage Migration to AsyncStorage (§B)

**User Story:** As a farmer working in low-connectivity ponds, I want the app to store data locally with AsyncStorage, so that logging and dashboards work without a network connection.

#### Acceptance Criteria

1. THE Mobile_Client SHALL persist offline data using `@react-native-async-storage/async-storage` and SHALL detect connectivity using `@react-native-community/netinfo`.
2. THE Mobile_Client SHALL remove the `@nozbe/watermelondb` dependency, its Babel plugin, and its Expo doctor exclusion.
3. THE Sync_Engine SHALL preserve the existing public interface of `syncStore` while replacing its internal implementation.
4. THE Mobile_Client SHALL provide an `offlineQueue` utility exposing `enqueue`, `flush`, `peek`, and `size` operations.
5. WHILE the device is offline, WHEN a farmer saves an operational-log write, THE Mobile_Client SHALL append the write to the Outbox_Queue in first-in-first-out order.
6. WHEN connectivity is restored, THE Sync_Engine SHALL flush the Outbox_Queue to the Backend_API in first-in-first-out order.
7. THE Mobile_Client SHALL maintain a Read_Cache under namespaced keys of the form `cache:ponds:<farmId>` holding last-known farms, ponds, crops, and latest readings.
8. WHILE the device is offline, THE Mobile_Client SHALL render the dashboard from the Read_Cache.
9. THE Mobile_Client SHALL preserve sticky calculator inputs in `calculatorStore` across the migration.

### Requirement 8: Idempotency-Key Conflict Handling (§B)

**User Story:** As a farmer whose phone reconnects intermittently, I want queued writes to apply exactly once, so that retries never create duplicate records.

#### Acceptance Criteria

1. WHEN the Mobile_Client enqueues an operational-log write, THE Mobile_Client SHALL attach a client-generated UUID Idempotency_Key to that write.
2. WHEN the Backend_API receives an operational-log POST carrying an Idempotency_Key it has already processed, THE Backend_API SHALL return the original result without creating a second record.
3. WHEN the Backend_API receives an operational-log POST carrying an Idempotency_Key it has not seen, THE Backend_API SHALL process the write and persist the Idempotency_Key for future deduplication.
4. WHEN two writes target the same record, THE Backend_API SHALL apply last-write-wins resolution.
5. WHEN the Mobile_Client issues a GET, THE Backend_API SHALL be authoritative and THE Mobile_Client SHALL refresh the Read_Cache from the response.
6. WHILE flushing, IF a queued write succeeds, THEN THE Sync_Engine SHALL remove that write from the Outbox_Queue.
7. WHILE flushing, IF a queued write fails with a retryable error, THEN THE Sync_Engine SHALL retain that write in the Outbox_Queue for a later flush.

### Requirement 9: Sync and Staleness Indicator (§B, cross-cutting)

**User Story:** As a farmer, I want to see whether my data is synced and how fresh it is, so that I trust what the dashboard shows.

#### Acceptance Criteria

1. WHILE the device is offline, THE Offline_Indicator SHALL display an offline state.
2. THE Offline_Indicator SHALL display the current Outbox_Queue length when the queue is non-empty.
3. THE Offline_Indicator SHALL display the timestamp of the last successful sync.
4. IF no successful update has occurred within the last seven days, THEN THE Offline_Indicator SHALL display a "No update within last week" staleness badge.
5. WHEN a flush completes successfully, THE Sync_Engine SHALL update the last-successful-sync timestamp.

### Requirement 10: Per-Species Five-Zone Water-Quality Thresholds (§11)

**User Story:** As a farmer, I want water-quality parameters evaluated against species-specific five-zone bands, so that status reflects the actual species I am culturing.

#### Acceptance Criteria

1. THE Backend_API SHALL store water-quality thresholds in a tunable Parameter_Threshold table keyed by (parameter, species).
2. THE Threshold_Evaluator SHALL classify each measured value into exactly one Five_Zone_Model zone: critical-low, caution-low, optimal, caution-high, or critical-high.
3. WHERE a parameter is one-sided, THE Parameter_Threshold SHALL permit null boundaries and THE Threshold_Evaluator SHALL omit the corresponding zone.
4. THE Backend_API SHALL provide distinct Parameter_Threshold sets for vannamei, monodon, indicus, and scampi for the parameters Dissolved Oxygen, pH, Temperature, Salinity, Alkalinity, Free Ammonia (NH3), Nitrite (NO2-N), Nitrate (NO3-N), and Transparency.
5. THE Mobile_Client SHALL replace the single-band `frontend/src/constants/ranges.ts` evaluation with the five-zone model sourced from Parameter_Threshold values.
6. WHEN the active crop species changes, THE Threshold_Evaluator SHALL re-evaluate displayed water-quality status against that species' Parameter_Threshold set.
7. WHEN evaluating pH or Dissolved Oxygen, THE Threshold_Evaluator SHALL evaluate the value against the diurnal cycle, accounting for the daily swing bound for pH.
8. WHERE an agronomist updates a Parameter_Threshold value on the server, THE Upcheck_System SHALL apply the updated thresholds without requiring a client release.
9. THE Species entity SHALL be extended with caution and critical boundary columns alongside the existing optimal pH, salinity, and temperature columns.

### Requirement 11: Computed Toxicity and Salinity-Scaled Nitrite (§11)

**User Story:** As a farmer, I want toxicity computed from real water chemistry, so that warnings reflect actual conditions rather than crude single bands.

#### Acceptance Criteria

1. WHEN computing Free_Ammonia, THE Shrimp_Calculations_Service SHALL derive the un-ionized fraction from TAN, pH, and temperature using the Emerson pKa relationship `pKa = 0.09018 + 2729.92 / (temperature_C + 273.15)` and `NH3 = TAN / (1 + 10^(pKa - pH))`.
2. WHEN evaluating nitrite (NO2-N) status, THE Threshold_Evaluator SHALL scale the nitrite threshold by salinity such that higher salinity yields a higher tolerated nitrite threshold.
3. THE Threshold_Evaluator SHALL evaluate ammonia status using computed Free_Ammonia rather than raw TAN.
4. WHEN the species is scampi (*M. rosenbergii*), THE Threshold_Evaluator SHALL NOT apply penaeid salinity bands and SHALL apply the freshwater scampi threshold set.
5. WHERE inland low-salinity mode is enabled for a farm, THE Threshold_Evaluator SHALL tighten the nitrite threshold and widen the optimal salinity band, and THE Mobile_Client SHALL surface Ca:Mg:K remineralization guidance.

### Requirement 12: Threshold and Calculation Bug Fixes (§11)

**User Story:** As a developer, I want existing threshold and calculation defects fixed, so that the science layer is internally consistent.

#### Acceptance Criteria

1. THE Mobile_Client SHALL contain exactly one reachable `return 'safe';` statement in `getParameterStatus`.
2. THE Shrimp_Calculations_Service SHALL contain a single JSDoc block for `getRecommendedFeedingRate`.
3. THE Backend_API and the Mobile_Client SHALL use identical Free_Ammonia caution and critical band boundaries.
4. WHERE the agronomist-confirmed Free_Ammonia bands are 0.05 mg/L (caution) and 0.1 mg/L (critical), THE Upcheck_System SHALL apply those boundaries consistently across backend and client.
5. THE Upcheck_System SHALL NOT change the backend Free_Ammonia band constant until the recalibrated values are confirmed by an agronomist.

### Requirement 13: INR Currency Localization (§12)

**User Story:** As an Indian farmer, I want amounts shown in rupees with Indian grouping, so that financial figures are familiar and unambiguous.

#### Acceptance Criteria

1. THE INR_Formatter SHALL format monetary amounts using `Intl.NumberFormat('en-IN')` with lakh and crore grouping and a ₹ symbol.
2. THE Upcheck_System SHALL store monetary amounts as integers representing whole rupees.
3. WHEN displaying a stored monetary integer, THE INR_Formatter SHALL render the exact stored value with no rounding loss.
4. THE Mobile_Client SHALL display the quote date alongside any count-based price.

### Requirement 14: Area Units Including Acres (§12)

**User Story:** As an Indian farmer, I want to enter pond and farm areas in acres, so that I can use the unit I already work in.

#### Acceptance Criteria

1. THE Mobile_Client SHALL support area entry and display in acres, square metres, and hectares.
2. WHEN converting acres to square metres, THE Upcheck_System SHALL use the factor 1 acre = 4046.86 m².
3. WHEN an area is entered in one supported unit, THE Mobile_Client SHALL display the equivalent value in the other supported units consistently.

### Requirement 15: Count-Based Pricing (§12)

**User Story:** As an Indian farmer, I want shrimp priced by count per state and date, so that valuations match how my market quotes prices.

#### Acceptance Criteria

1. THE Upcheck_System SHALL represent shrimp price by Count, where Count is pieces per kilogram within the range 20 to 120.
2. THE Upcheck_System SHALL associate each count-based price with a state and a quote date.
3. WHERE no external price is available, THE Mobile_Client SHALL allow a "Self Priced" manual entry.
4. THE Mobile_Client SHALL reuse the Harvest "Count (tail/kg)" field as the count input for pricing.
5. WHEN a count-based price is displayed, THE Mobile_Client SHALL show the quote date of that price.

### Requirement 16: Indigenous and Freshwater Species Support (§12)

**User Story:** As a farmer culturing indigenous species or scampi, I want them represented with correct biology, so that thresholds and guidance apply correctly.

#### Acceptance Criteria

1. THE Upcheck_System SHALL include the indigenous penaeid species *Penaeus indicus*, *Penaeus semisulcatus*, *Penaeus merguiensis*, and *Penaeus japonicus* per CAA Rules 2024.
2. THE Upcheck_System SHALL include freshwater scampi (*Macrobrachium rosenbergii*) with its own Parameter_Threshold set.
3. THE Threshold_Evaluator SHALL NOT apply penaeid salinity bands to scampi.
4. THE Reference_Catalogue SHALL list indigenous Indian feed brands (for example Avanti, CP, Growel, Godrej, BMR/Harvest Gold, Cargill) as neutral, farmer-selectable entries without recommendation.

### Requirement 17: CAA and MPEDA Regulatory Anchors (§12)

**User Story:** As a farm owner, I want to record CAA and MPEDA identifiers and be reminded before they lapse, so that I stay compliant without full traceability overhead.

#### Acceptance Criteria

1. THE Farm record SHALL store a CAA registration number and a five-year validity period.
2. WHEN a Farm's CAA validity is within its renewal-reminder window, THE Upcheck_System SHALL notify the farm owner to renew.
3. THE cycle record SHALL store an MPEDA enrollment identifier and optional SHAPHARI and PHT-readiness flags.
4. THE Upcheck_System SHALL treat CAA and MPEDA data as lightweight metadata and SHALL NOT require full lot-level traceability.

### Requirement 18: Banned-Substance Guardrail (§S)

**User Story:** As a farmer, I want to be warned when I record a banned or restricted substance, so that I avoid prohibited treatments and protect my harvest's export eligibility.

#### Acceptance Criteria

1. THE Backend_API SHALL maintain a server-updatable Banned_Substance list seeded from the jala-seed list, including chloramphenicol, nitrofurans and their metabolites (AOZ, AMOZ, SEM, AHD), fluoroquinolones, nitroimidazoles, colistin, neomycin, nalidixic acid, sulfamethoxazole, and MRL-limited substances such as oxytetracycline.
2. WHEN a farmer enters text on the Treatment form or in any product-usage free-text field, THE Banned_Substance_Matcher SHALL detect references to any Banned_Substance.
3. WHEN a Banned_Substance is detected, THE Mobile_Client SHALL display a red warning and SHALL require either an explicit confirmation or block the save, per configuration.
4. THE Upcheck_System SHALL NOT suggest an alternative product when a Banned_Substance is detected.
5. THE Mobile_Client SHALL accompany the banned-substance warning with a note stating the warning is not legal or veterinary advice.
6. WHILE a cycle has had no Banned_Substance treatment within the Withdrawal_Window before its planned harvest, THE Upcheck_System SHALL set that cycle's PHT_Readiness to green.
7. IF a Banned_Substance treatment is recorded within the Withdrawal_Window before planned harvest, THEN THE Upcheck_System SHALL set that cycle's PHT_Readiness to not-green.

### Requirement 19: Cost Ledger and Auto-Posting (§G)

**User Story:** As a farm owner, I want feed costs and harvest revenue posted automatically, so that my ledger stays accurate without manual entry.

#### Acceptance Criteria

1. THE Cost_Ledger SHALL categorise each cost entry by category.
2. WHEN a feed record is saved, THE Auto_Posting_Service SHALL post a feed cost equal to feedKg × feedPrice to the Cost_Ledger.
3. WHEN a harvest record is saved, THE Auto_Posting_Service SHALL post harvest revenue to the Cost_Ledger.
4. THE Auto_Posting_Service SHALL be the single service responsible for feed-driven and harvest-driven side effects so that cost, stock movement, and revenue stay consistent.
5. IF a source record (feed or harvest) is reversed or deleted, THEN THE Auto_Posting_Service SHALL reverse the corresponding posted entries.

### Requirement 20: Profit-and-Loss Dashboard (§G)

**User Story:** As a farm owner, I want a P&L dashboard, so that I can see profitability at a glance.

#### Acceptance Criteria

1. THE PL_Dashboard SHALL display revenue, total cost, profit, cost per kilogram, break-even price, return on investment, and feed-cost share.
2. WHEN underlying cost or revenue entries change, THE PL_Dashboard SHALL recompute its figures from the current Cost_Ledger.
3. THE PL_Dashboard SHALL compute profit as revenue minus total cost.
4. WHERE harvested weight is zero, THE PL_Dashboard SHALL display cost per kilogram as not-applicable rather than dividing by zero.

### Requirement 21: Threshold-Driven Alerts (§H)

**User Story:** As a farmer, I want alerts triggered by water-quality thresholds, so that I can act on dangerous conditions promptly.

#### Acceptance Criteria

1. WHEN a measured parameter enters a caution zone, THE Upcheck_System SHALL create a notification alert.
2. WHEN a measured parameter enters a critical zone, THE Upcheck_System SHALL create a high-priority alert.
3. THE Upcheck_System SHALL evaluate alert triggers against the §11 Parameter_Threshold values.
4. WHEN evaluating ammonia for alerts, THE Upcheck_System SHALL use computed Free_Ammonia rather than raw TAN.
5. WHILE nighttime hours apply, IF Dissolved Oxygen enters a critical-low zone, THEN THE Upcheck_System SHALL raise a high-priority nighttime DO alarm.
6. WHEN a high-priority alert is created, THE Mobile_Client SHALL deliver a push notification via expo-notifications.

### Requirement 22: Inventory Movements (§I)

**User Story:** As a farm manager, I want stock receipts and feed-driven issues tracked, so that inventory levels stay accurate and I am warned before stockouts or expiry.

#### Acceptance Criteria

1. WHEN stock is received, THE Upcheck_System SHALL record an Inventory_Lot with quantity, unit price, and optional expiry.
2. WHEN a feed record is saved, THE Auto_Posting_Service SHALL record an out-movement reducing the corresponding inventory quantity.
3. WHEN an inventory item's quantity falls to or below its reorder level, THE Upcheck_System SHALL raise a low-stock alert via the §H alert pipeline.
4. WHEN an Inventory_Lot is within its near-expiry window, THE Upcheck_System SHALL raise a near-expiry alert via the §H alert pipeline.
5. THE Upcheck_System SHALL maintain inventory quantity as the sum of received lots minus issued movements.

### Requirement 23: Growth Projection from Real Samples (§K)

**User Story:** As a farmer, I want growth projected from my actual sampling data, so that I can plan harvest timing for a target size.

#### Acceptance Criteria

1. WHEN at least two sampling mean-body-weight points exist for a cycle, THE Shrimp_Calculations_Service SHALL fit a growth curve to those points.
2. WHEN a target size is specified, THE Shrimp_Calculations_Service SHALL recommend the day-of-culture and calendar date at which the cycle reaches that target size.
3. THE Mobile_Client SHALL display the fitted growth curve and projected points on a chart.
4. WHERE fewer than two sampling points exist, THE Shrimp_Calculations_Service SHALL fall back to the existing linear ADG projection.

### Requirement 24: Tasks, Roles, and Record Attribution (§P)

**User Story:** As a farm manager, I want to assign tasks and SOP checklists by role, so that work is coordinated and every record is attributable.

#### Acceptance Criteria

1. THE Backend_API SHALL enforce role and permission checks on task and record mutations using the existing RolesGuard and PermissionsGuard.
2. THE Task_Board SHALL support creating, assigning, and completing tasks.
3. THE Task_Board SHALL support SOP checklists associated with a task.
4. WHEN a user creates or edits a record, THE Backend_API SHALL stamp Recorded_By_Id with that user's identifier.
5. IF a user lacks the required permission for a create or edit action, THEN THE Backend_API SHALL reject the action with an authorization error.

### Requirement 25: Cycle PDF Reports (§R)

**User Story:** As a farm owner, I want a shareable PDF cycle summary, so that I can share results with buyers, lenders, or advisors.

#### Acceptance Criteria

1. WHEN a Cycle_Report is requested, THE Upcheck_System SHALL generate a PDF containing cycle KPIs, P&L, water-quality trends, and a harvest table.
2. THE Upcheck_System SHALL generate the Cycle_Report either client-side via react-native-html-to-pdf or server-side.
3. THE Cycle_Report SHALL be shareable from the Mobile_Client.
4. THE Cycle_Report SHALL include the Standing_Disclaimer.

### Requirement 26: Cross-Cutting Validation, Formatting, and Computed Fields

**User Story:** As a farmer, I want consistent input validation, formatting, and read-only computed fields, so that data entry is reliable and figures are derived correctly.

#### Acceptance Criteria

1. THE Mobile_Client SHALL gate record submission on validation of required fields.
2. THE Mobile_Client SHALL default date and time inputs to the current date and time where a value is not supplied.
3. THE Upcheck_System SHALL present pond area, harvest total, mortality quantity, total plankton, and total vibrio as read-only computed fields derived from their inputs.
4. THE Mobile_Client SHALL format all monetary values through the INR_Formatter.

### Requirement 27: Standing Disclaimer (Cross-Cutting)

**User Story:** As the Upcheck product owner, I want a standing decision-support disclaimer, so that users understand the platform does not replace professional advice.

#### Acceptance Criteria

1. THE Mobile_Client SHALL display the Standing_Disclaimer on advice and decision-support surfaces.
2. THE Standing_Disclaimer SHALL state that Upcheck is a decision-support tool and not a substitute for professional veterinary or aquaculture advice.
3. THE Upcheck_System SHALL retain the Standing_Disclaimer for ASCI/CCPA and CAA/MPEDA review before launch.

### Requirement 28: Internationalization with Tamil-First Indian Languages (Cross-Cutting)

**User Story:** As an Indian farmer, I want the app in my language, so that I can use it comfortably.

#### Acceptance Criteria

1. THE Mobile_Client SHALL provide localized strings for English, Tamil, Telugu, Bengali, Odia, Hindi, and Gujarati through i18next.
2. WHERE a translation is missing for the selected language, THE Mobile_Client SHALL fall back to English.
3. WHEN the user selects a supported language, THE Mobile_Client SHALL render localized strings for that language across the app.

---

## Correctness Properties

The following properties are intended for property-based testing (the repo already uses `fast-check` on both backend and frontend). Each property names the requirement it verifies.

### CP-1: Idempotency-Key dedupe is exactly-once (Req 8) — Round-trip / Idempotence
For any sequence of operational-log writes where the same Idempotency_Key appears N ≥ 1 times (interleaved arbitrarily with other writes), processing the whole sequence through the Backend_API SHALL produce exactly one persisted record for that key, and every response for that key SHALL be equal to the first response. Formally: `process(seq) == process(dedupeByKey(seq))` in resulting state.

### CP-2: Outbox FIFO ordering is preserved across flush (Req 7, 8) — Invariant
For any sequence of enqueued writes that all succeed on flush, the order in which the Backend_API receives them SHALL equal their enqueue order. Failed-and-retained writes SHALL preserve their relative order on the next flush.

### CP-3: Free-ammonia Emerson pKa correctness (Req 11) — Model-based
For all `TAN ≥ 0`, `0 ≤ pH ≤ 14`, and `temperature_C` in a realistic pond range, `calculateFreeAmmonia` SHALL satisfy `NH3 == TAN / (1 + 10^(pKa - pH))` with `pKa = 0.09018 + 2729.92/(temperature_C + 273.15)`, within a fixed numeric tolerance. Monotonicity sub-properties: NH3 is non-decreasing in pH, non-decreasing in temperature, and non-decreasing in TAN; and `0 ≤ NH3 ≤ TAN`.

### CP-4: Salinity-scaled nitrite threshold monotonicity (Req 11) — Metamorphic
For two salinities `s1 < s2` (other inputs equal), the tolerated nitrite (NO2-N) threshold at `s2` SHALL be greater than or equal to the threshold at `s1`. Consequently, for a fixed measured nitrite value, the classified zone at higher salinity SHALL be no more severe than at lower salinity.

### CP-5: Five-zone classification totality and ordering (Req 10) — Invariant
For any measured value and any Parameter_Threshold (with possibly null one-sided boundaries), the Threshold_Evaluator SHALL return exactly one zone. The zone boundaries SHALL be monotonic: `critical_low ≤ caution_low ≤ optimal_low ≤ optimal_high ≤ caution_high ≤ critical_high` for all defined boundaries, and a value in the optimal band SHALL never be classified critical.

### CP-6: Scampi never receives penaeid salinity bands (Req 11, 16) — Invariant
For all water-quality inputs evaluated with species = scampi, the salinity zone SHALL be derived from the scampi threshold set, never from any penaeid set.

### CP-7: Neutral-ordering invariant for reference catalogues (Req 2) — Invariant
For any set of Reference_Catalogue entries returned without a search term, the result SHALL be a stable alphabetical permutation of the inputs by display name; no entry SHALL be reordered ahead of an alphabetically-earlier entry, and no preference field SHALL be present on any entry. For recently-used ordering, the result SHALL be sorted by last-use timestamp descending with alphabetical tie-break, and SHALL be a permutation of the inputs (no insertions or omissions).

### CP-8: Banned-substance match completeness (Req 18) — Error-condition / Invariant
For every Banned_Substance name and known synonym/metabolite (including AOZ, AMOZ, SEM, AHD for nitrofurans), and for free text containing that token under arbitrary surrounding text, casing, and common separators, `findBannedSubstances()` SHALL return a non-empty match that includes that substance. For text containing none of the listed substances or synonyms, it SHALL return an empty match (no false positives on unrelated tokens).

### CP-9: INR formatting and lakh-grouping invariants (Req 13) — Round-trip / Invariant
For any non-negative integer rupee amount, the INR_Formatter output SHALL: (a) preserve the exact numeric value when its grouping separators and ₹ symbol are stripped and parsed back; (b) apply Indian grouping (last three digits grouped, then groups of two) for amounts ≥ 1,000; and (c) never introduce fractional rupees for integer inputs. Round-trip: `parseINR(formatINR(n)) == n`.

### CP-10: Area conversion round-trip (Req 14) — Round-trip
For any non-negative area value, converting acres → square metres → acres (and m² → hectares → m²) SHALL return the original value within a fixed numeric tolerance, using 1 acre = 4046.86 m² and 1 hectare = 10,000 m².

### CP-11: Auto-posting consistency and reversal (Req 19, 22) — Round-trip / Confluence
For any feed record, posting then reversing SHALL leave the Cost_Ledger and inventory quantity unchanged from their pre-posting state. For any set of feed and harvest records, the final Cost_Ledger totals SHALL be independent of the order in which the records are processed (confluence).

### CP-12: Inventory quantity invariant (Req 22) — Invariant
At all times, an inventory item's quantity SHALL equal the sum of its received lot quantities minus the sum of its issued movement quantities, and SHALL never be presented as negative for a valid sequence of receipts and issues that do not over-issue.

### CP-13: PHT-readiness reflects withdrawal window (Req 18) — Invariant
For any set of treatments on a cycle, PHT_Readiness SHALL be green if and only if no Banned_Substance treatment falls within the Withdrawal_Window before the planned harvest date.

### CP-14: P&L identities (Req 20) — Invariant
For any Cost_Ledger state, `profit == revenue - total_cost`, `feed_cost_share == feed_cost / total_cost` when `total_cost > 0`, and cost-per-kg is reported as not-applicable exactly when harvested weight is zero.

### Property-Test Scope Notes

The following are deliberately **not** property-based tests and SHOULD be covered by example-based integration or smoke tests instead:
- Verifying expo-notifications push delivery (Req 21.6) and netinfo connectivity transitions — external service behavior; use 1–3 representative integration tests.
- Verifying the `products` table is dropped and endpoints return 404 (Req 1) — deterministic configuration; use smoke tests.
- PDF rendering output (Req 25) — verify structure/content presence with a small number of examples, not 100 iterations.
- i18next language switching (Req 28) — example-based per-language smoke checks.
