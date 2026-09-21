import type { FarmCapability } from '../farm-access/farm-capability';

/**
 * F5: the 8 new photo surfaces (spec §F5 table) plus the two the app already
 * had (avatar/health, not listed here). One row per surface: its cap, the
 * capability that gates uploading AND reading it, the `photo_objects.entity`
 * tag it writes, whether it holds money (VIEW_FINANCIALS-gated, §F5/§F6),
 * and the table its `photo_paths` column lives on (migration 1780702800000).
 */
export interface PhotoSurface {
  entity: string;
  table: string;
  cap: number;
  capability: FarmCapability;
  money: boolean;
  /** 'pond' | 'farm' — which id the upload route needs. */
  scope: 'pond' | 'farm';
}

export const PHOTO_SURFACES = {
  expense_receipt: { entity: 'expense', table: 'expenses', cap: 2, capability: 'VIEW_FINANCIALS', money: true, scope: 'pond' },
  transaction_receipt: { entity: 'transaction', table: 'transactions', cap: 2, capability: 'VIEW_FINANCIALS', money: true, scope: 'farm' },
  harvest_slip: { entity: 'harvest', table: 'harvests', cap: 2, capability: 'RECORD_HARVEST', money: true, scope: 'pond' },
  treatment_label: { entity: 'treatment', table: 'treatments', cap: 2, capability: 'WRITE_OPERATIONAL', money: false, scope: 'pond' },
  feed_label: { entity: 'feed_record', table: 'feed_records', cap: 2, capability: 'WRITE_OPERATIONAL', money: false, scope: 'pond' },
  inventory_label: { entity: 'inventory', table: 'inventory', cap: 2, capability: 'MANAGE_INVENTORY', money: false, scope: 'farm' },
  // The receipt for a stock PURCHASE (PATCH /inventory/:id/adjust with
  // `amount`) — distinct from inventory_label above, which is the product's
  // own input label. Writes to `transactions.photo_paths`, entity
  // 'inventory_purchase' (see InventoryService.adjustStock).
  inventory_purchase_receipt: { entity: 'inventory_purchase', table: 'transactions', cap: 2, capability: 'MANAGE_INVENTORY', money: true, scope: 'farm' },
  seed_pcr: { entity: 'crop', table: 'crops', cap: 2, capability: 'WRITE_MANAGEMENT', money: false, scope: 'pond' },
  pond_identity: { entity: 'pond', table: 'ponds', cap: 1, capability: 'WRITE_MANAGEMENT', money: false, scope: 'pond' },
  // OWNER_ONLY to match FarmsService.update(), which treats every non-shift
  // field (photoPath included) as owner-only, same as the CAA registration no.
  farm_identity: { entity: 'farm', table: 'farms', cap: 1, capability: 'OWNER_ONLY', money: false, scope: 'farm' },
  water_colour: { entity: 'water_quality', table: 'water_quality_records', cap: 1, capability: 'WRITE_OPERATIONAL', money: false, scope: 'pond' },
  feed_tray: { entity: 'feeding_tray_check', table: 'feeding_tray_checks', cap: 1, capability: 'WRITE_OPERATIONAL', money: false, scope: 'pond' },
} as const satisfies Record<string, PhotoSurface>;

export type SurfaceKey = keyof typeof PHOTO_SURFACES;

export const SURFACE_KEYS = Object.keys(PHOTO_SURFACES) as SurfaceKey[];

/**
 * `photo_objects.entity` values that are money — the F6 "Money" filter and
 * read-time mask. Kept in sync with Phase 5's `MONEY_PHOTO_ENTITIES`
 * (backup/retention/viewer, coordinated 2026-09-21): expense, transaction,
 * harvest, purchase, inventory_purchase. `purchase` has no writer in this PR
 * (no surface tags it) but is included so either side's set stays a superset
 * of the other's — extend here if a future surface needs it.
 */
export const MONEY_ENTITIES = new Set([
  ...Object.values(PHOTO_SURFACES).filter((s) => s.money).map((s) => s.entity),
  'purchase',
]);

export const INPUT_ENTITIES = new Set(['treatment', 'feed_record', 'inventory', 'crop']);
export const POND_ENTITIES = new Set(['pond', 'water_quality', 'feeding_tray_check']);
export const HEALTH_ENTITIES = new Set(['health_observation', 'mortality', 'disease']);
