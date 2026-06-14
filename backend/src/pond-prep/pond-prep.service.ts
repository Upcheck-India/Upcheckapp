import { Injectable } from '@nestjs/common';

export type FarmType = 'coastal_brackish' | 'inland_low_saline';

export interface PrepTask {
  key: string;
  label: string;
  critical: boolean;
  hasDose?: boolean;
}

export interface ReadinessResult {
  done: number;
  total: number;
  criticalDone: number;
  criticalTotal: number;
  canStartCycle: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ordered pond-prep templates (farmer_features_spec.md §7). DOC-0 gate last. */
const TEMPLATES: Record<FarmType, PrepTask[]> = {
  coastal_brackish: [
    { key: 'dry_out', label: 'Dry out & till pond bottom', critical: true },
    { key: 'soil_ph', label: 'Test bottom soil pH', critical: true },
    { key: 'liming', label: 'Apply lime to target pH', critical: true, hasDose: true },
    { key: 'fill', label: 'Fill & screen intake water', critical: true },
    { key: 'chlorination', label: 'Chlorinate / treat water', critical: false },
    { key: 'fertilize', label: 'Fertilize to establish plankton bloom', critical: false },
    { key: 'probiotic', label: 'Apply pond probiotic', critical: false },
    { key: 'pl_acclimation', label: 'Acclimate PL (temp/salinity)', critical: true },
    { key: 'seed_pcr', label: 'Confirm seed PCR (WSSV/EHP)', critical: true },
    { key: 'doc0_gate', label: 'DOC-0 readiness gate', critical: true },
  ],
  inland_low_saline: [
    { key: 'dry_out', label: 'Dry out & till pond bottom', critical: true },
    { key: 'soil_ph', label: 'Test bottom soil pH', critical: true },
    { key: 'liming', label: 'Apply lime/dolomite to target pH', critical: true, hasDose: true },
    { key: 'fill', label: 'Fill from borewell & screen', critical: true },
    { key: 'mineral_correction', label: 'Correct Ca/Mg/K ionic ratios (mineral dose)', critical: true, hasDose: true },
    { key: 'fertilize', label: 'Fertilize to establish bloom', critical: false },
    { key: 'probiotic', label: 'Apply pond probiotic', critical: false },
    { key: 'pl_acclimation', label: 'Acclimate PL (slow salinity drop)', critical: true },
    { key: 'seed_pcr', label: 'Confirm seed PCR (WSSV/EHP)', critical: true },
    { key: 'doc0_gate', label: 'DOC-0 readiness gate', critical: true },
  ],
};

@Injectable()
export class PondPrepService {
  /** Ordered prep template for a farm type (coastal vs inland differ). */
  template(farmType: FarmType): PrepTask[] {
    return TEMPLATES[farmType] ?? TEMPLATES.coastal_brackish;
  }

  /**
   * Lime dose to raise bottom soil pH (farmer_features_spec.md §7):
   *   lime_kg = max(0, pHTarget − pHNow) × area_m² × bufferFactor
   * bufferFactor ≈ kg lime per m² per pH unit (soil-dependent; default 0.1).
   */
  limeDoseKg(
    soilPhTarget: number,
    soilPhNow: number,
    areaM2: number,
    bufferFactor = 0.1,
  ): number {
    const delta = Math.max(0, soilPhTarget - soilPhNow);
    return round2(delta * areaM2 * bufferFactor);
  }

  /**
   * Readiness from completed task keys. Start-Cycle unlocks only when every
   * critical task in the template is done.
   */
  readiness(farmType: FarmType, completedKeys: string[]): ReadinessResult {
    const tasks = this.template(farmType);
    const done = new Set(completedKeys);
    const criticalTasks = tasks.filter((t) => t.critical);
    const criticalDone = criticalTasks.filter((t) => done.has(t.key)).length;
    return {
      done: tasks.filter((t) => done.has(t.key)).length,
      total: tasks.length,
      criticalDone,
      criticalTotal: criticalTasks.length,
      canStartCycle: criticalDone === criticalTasks.length,
    };
  }
}
