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
| `auth.*` | resetTitle, newPassword, confirmPassword, resetCta, resetWaiting, useOtpInstead, passwordMin, passwordMismatch, resetDoneTitle, resetDoneSub, resetError |
| `home.*` | workerNoFarm, logNow, workerLogPrompt |
| `members.*` | roleLabel, changeRoleTitle, roleChangeError, transferTitle, transferConfirm, transferCta, transferError |
| `cycles.btnAnalysis`, `content.tasks.*` | statusVerified, statusCancelled, verify |
| `common.*` | savedOffline, offlineBanner |
| `notifications.*` | wqTitle, wqBody, chemTitle, chemBody |

Tamil/Odia/Bengali/Hindi/Gujarati similarly fall back to English; translate per the
blueprint §10.1 language phasing after Telugu.
