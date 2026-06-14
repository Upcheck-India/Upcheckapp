import { Injectable } from '@nestjs/common';
import { MeasurementService } from '../measurement/measurement.service';
import { Measurement } from '../measurement/measurement.entity';

export interface CvResult {
  n: number;
  mbw: number;
  sd: number;
  cvPct: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Higher-level capture flows (data_collection_audit.md §2) that the spec calls
 * out as missing — clinical-signs checklist, water-exchange events, and
 * sampling individual-weights/CV. Each writes through the Measurement pipeline
 * (the §6.2 keystone), so ownership + dictionary validation come for free and
 * every value is a first-class, source-tagged measurement.
 */
@Injectable()
export class CaptureService {
  constructor(private readonly measurements: MeasurementService) {}

  /**
   * Coefficient of variation from individual sample weights (audit §2 #4 — an
   * EHP/uniformity signal). Uses population SD. CV% = SD / mean × 100.
   */
  computeCv(weights: number[]): CvResult {
    const n = weights.length;
    if (n === 0) return { n: 0, mbw: 0, sd: 0, cvPct: 0 };
    const mean = weights.reduce((a, b) => a + b, 0) / n;
    const variance = weights.reduce((a, w) => a + (w - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    const cvPct = mean > 0 ? (sd / mean) * 100 : 0;
    return { n, mbw: round2(mean), sd: round2(sd), cvPct: round2(cvPct) };
  }

  /** Build the create-DTO for a single value, picking the right value channel. */
  private toDto(
    pondId: string,
    cropId: string | undefined,
    param: string,
    value: boolean | number | string,
    measuredAt?: string,
  ) {
    const base = { pondId, cropId, param, source: 'manual' as const, measuredAt };
    if (typeof value === 'boolean') return { ...base, valueNum: value ? 1 : 0 };
    if (typeof value === 'number') return { ...base, valueNum: value };
    return { ...base, valueText: value };
  }

  /**
   * Sampling: store ABW (mean) and CV (size variation) as measurements derived
   * from the individual weights. Returns the stored measurements.
   */
  async recordSampling(
    pondId: string,
    cropId: string | undefined,
    weights: number[],
    userId: string,
    measuredAt?: string,
  ): Promise<{ cv: CvResult; measurements: Measurement[] }> {
    const cv = this.computeCv(weights);
    const measurements = await Promise.all([
      this.measurements.create(this.toDto(pondId, cropId, 'abw', cv.mbw, measuredAt), userId),
      this.measurements.create(this.toDto(pondId, cropId, 'cv', cv.cvPct, measuredAt), userId),
    ]);
    return { cv, measurements };
  }

  /**
   * Clinical-signs checklist → one measurement per sign (booleans 0/1,
   * categoricals as text). Feeds the Disease Early-Warning indicators.
   */
  async recordClinicalSigns(
    pondId: string,
    cropId: string | undefined,
    signs: Record<string, boolean | string>,
    userId: string,
    measuredAt?: string,
  ): Promise<Measurement[]> {
    const entries = Object.entries(signs);
    return Promise.all(
      entries.map(([param, value]) =>
        this.measurements.create(this.toDto(pondId, cropId, param, value, measuredAt), userId),
      ),
    );
  }

  /** Water-exchange event → pct / volume / source measurements. */
  async recordWaterExchange(
    pondId: string,
    cropId: string | undefined,
    data: { pct?: number; volumeM3?: number; source?: string },
    userId: string,
    measuredAt?: string,
  ): Promise<Measurement[]> {
    const dtos: Array<[string, number | string]> = [];
    if (data.pct !== undefined) dtos.push(['water_exchange_pct', data.pct]);
    if (data.volumeM3 !== undefined) dtos.push(['water_exchange_volume', data.volumeM3]);
    if (data.source !== undefined) dtos.push(['water_exchange_source', data.source]);
    return Promise.all(
      dtos.map(([param, value]) =>
        this.measurements.create(this.toDto(pondId, cropId, param, value, measuredAt), userId),
      ),
    );
  }
}
