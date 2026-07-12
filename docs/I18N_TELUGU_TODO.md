# i18n — Telugu translation TODO (shipped screens)

**Status:** The app is functional in all 6 languages today. New launch-hardening
screens use `t('key', 'English default')` and `fallbackLng: 'en'` is set, so any
key missing in Telugu renders the English default (no raw keys, no crashes).

**What remains** is *authentic Telugu copy* for the new keys below — a content task
that needs a Telugu speaker (machine translation is not acceptable for the
farmer-facing UI). Until then, these surfaces show English in the Telugu locale.

Add Telugu (`te`) entries for these keys (English source is the inline default
in code / the `en` locale):

| Namespace | Keys (new this cycle) |
|---|---|
| `diagnose.*` | title, intro, run, results, noMatch, disclaimer, cta, cat_physical/behavioral/environmental, sym_* (18 symptoms), sev_low/medium/high, viewLibrary, report |
| `finance.*` | breakEven, breakEvenHint |
| `reports.*` | cycleAnalysis, cycleAnalysisFor, fcr, survival, totalFeed, totalHarvest, growthCurve, growthNeedsData, noAnalysisTitle, noAnalysisSub |
| `ponds.*` | dimHistory, dimHistoryFor, dimChange, dimBefore, dimHistoryEmptyTitle, dimHistoryEmptySub |
| `logs.feedingTray_*` | title, trayNumber, residue, empty, few_left, a_lot_left, tray, recent, emptyTitle, emptySub, errorSave |
| `logs.waterQuality_*` | showMore, showFewer, prefillHint, sectionDaily (quick-mode expander added for the daily-logging-friction fix) |
| `logs.feed_*` | showTrays, hideTrays (tray-check section collapsed by default) |
| `history.bannedFlagLabel` | "Flagged: {{names}}" banner on treatment/disease history for a server-evaluated banned-substance match (BANNED-1) |
| `auth.*` | resetTitle, newPassword, confirmPassword, resetCta, resetWaiting, useOtpInstead, passwordMin, passwordMismatch, resetDoneTitle, resetDoneSub, resetError |
| `home.*` | workerNoFarm, logNow, workerLogPrompt, gettingStartedTitle, checklistPonds, checklistLog, checklistInvite, actionToday |
| `engines.briefing.*` | noPondsTitle, noPondsSub, routineSectionTitle (Morning Briefing's "good day" routine-checklist view, replacing a bare "all clear" dead end) |
| `home.onboarding_languagePrompt` | "Choose your language" (language-first Welcome step) |
| `home.workerWelcome*` | Title, Body, Cta (worker first-run interstitial) |
| `pondSetup.whyPond`, `whyCulture`, `whyAeration` | one-sentence "why we ask" subtitles per PondSetup section |
| `home.onboarding_example*` | Label, Doc, Fcr, Survival, Caption (static illustrative preview card on Welcome, Phase 3) |
| `engines.common.confidenceHint` | one-time FirstUseHint explaining the confidence chip on Feed Advisor (Phase 3) |
| `members.*` | roleLabel, changeRoleTitle, roleChangeError, transferTitle, transferConfirm, transferCta, transferError |
| `cycles.btnAnalysis`, `content.tasks.*` | statusVerified, statusCancelled, verify |
| `common.*` | savedOffline, offlineBanner |
| `notifications.*` | wqTitle, wqBody, chemTitle, chemBody |

Tamil/Odia/Bengali/Hindi/Gujarati similarly fall back to English; translate per the
blueprint §10.1 language phasing after Telugu.
