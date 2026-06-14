import { Injectable } from '@nestjs/common';

export interface DiseaseReport {
  farmId: string;
  lat: number;
  lon: number;
  disease: string;
  daysAgo: number;
}

export interface RegionalRiskInput {
  pondLat: number;
  pondLon: number;
  reports: DiseaseReport[];
  disease?: string;
  radiusKm?: number;
  days?: number;
  /** k-anonymity floor: a cluster is only surfaced if ≥ k distinct farms. */
  k?: number;
}

export interface HeatCell {
  cellLat: number;
  cellLon: number;
  farms: number;
  reports: number;
  diseases: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Regional Anonymized Biosecurity Map (farmer_features_spec.md §9). Dense
 * neighbour outbreaks raise a pond's disease risk; k-anonymity protects farm
 * identity (a cluster only surfaces if ≥ k distinct farms reported). Pure.
 */
@Injectable()
export class RegionalMapService {
  /** Great-circle distance (km) between two lat/lon points. */
  haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return round2(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /**
   * Regional risk factor 0..1 from nearby outbreaks within `radiusKm` and the
   * last `days`. Returns 0 unless ≥ k distinct farms reported (k-anonymity).
   * Scales as 0.2 per distinct farm, capped at 1.
   */
  regionalRiskFactor(input: RegionalRiskInput): {
    riskFactor: number;
    distinctFarms: number;
    suppressed: boolean;
  } {
    const radiusKm = input.radiusKm ?? 5;
    const days = input.days ?? 7;
    const k = input.k ?? 3;

    const nearby = input.reports.filter(
      (r) =>
        r.daysAgo <= days &&
        (!input.disease || r.disease === input.disease) &&
        this.haversineKm(input.pondLat, input.pondLon, r.lat, r.lon) <= radiusKm,
    );
    const distinctFarms = new Set(nearby.map((r) => r.farmId)).size;
    if (distinctFarms < k) {
      return { riskFactor: 0, distinctFarms, suppressed: true };
    }
    return {
      riskFactor: round2(Math.min(1, 0.2 * distinctFarms)),
      distinctFarms,
      suppressed: false,
    };
  }

  /**
   * Aggregate reports into a privacy-preserving heat map. Cells with fewer than
   * k distinct farms are suppressed entirely.
   */
  buildHeatmap(
    reports: DiseaseReport[],
    opts?: { gridDeg?: number; k?: number },
  ): HeatCell[] {
    const gridDeg = opts?.gridDeg ?? 0.05; // ~5 km cells
    const k = opts?.k ?? 3;
    const cells = new Map<string, DiseaseReport[]>();
    for (const r of reports) {
      const cellLat = Math.round(r.lat / gridDeg) * gridDeg;
      const cellLon = Math.round(r.lon / gridDeg) * gridDeg;
      const key = `${cellLat}:${cellLon}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(r);
    }
    const out: HeatCell[] = [];
    for (const [key, list] of cells) {
      const farms = new Set(list.map((r) => r.farmId)).size;
      if (farms < k) continue; // k-anonymity suppression
      const [cellLat, cellLon] = key.split(':').map(Number);
      out.push({
        cellLat: round4(cellLat),
        cellLon: round4(cellLon),
        farms,
        reports: list.length,
        diseases: [...new Set(list.map((r) => r.disease))],
      });
    }
    return out;
  }
}
