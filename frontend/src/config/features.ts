/**
 * Feature flags.
 *
 * Purpose: keep a screen dark *while it is being finished* so half-built UI
 * never ships, and gate the few features that depend on external systems
 * (hardware, payment gateway, vendor/expert networks) that aren't live yet.
 *
 * Policy (per UPCHECK_LAUNCH_PLAN.md D9): every in-app feature is being built
 * to completion — flip its flag on once it passes the design checklist and a
 * device smoke-test. Only the four external-dependency features stay off at
 * launch.
 */
export type FeatureKey =
    | 'boundaryMap'
    | 'pondDimensionHistory'
    | 'cycleAnalysisReport'
    | 'feedingTrayChecks'
    | 'diseaseDiagnosis'
    | 'costManagement'
    | 'marketplaceCheckout'
    | 'iotSensors'
    | 'traceabilityPublic'
    | 'expertConsultation';

export const FEATURES: Record<FeatureKey, boolean> = {
    // --- In-app, in active development. Flip on as each is finished + verified. ---
    boundaryMap: false, // farm boundary draw/edit on a map
    pondDimensionHistory: false,
    cycleAnalysisReport: false,
    feedingTrayChecks: false,
    diseaseDiagnosis: false, // rule-based symptom matcher
    costManagement: false, // per-cycle cost + break-even suite

    // --- Deferred: blocked on external dependencies, not code (keep OFF at launch). ---
    marketplaceCheckout: false, // needs vendor partnerships + payment gateway
    iotSensors: false, // needs sensor hardware + MQTT pipeline
    traceabilityPublic: false, // needs public web/QR infrastructure
    expertConsultation: false, // needs a recruited expert panel + payments
};

export function isFeatureEnabled(key: FeatureKey): boolean {
    return FEATURES[key];
}
