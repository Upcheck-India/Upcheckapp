import { Injectable } from '@nestjs/common';

export interface WeatherInput {
  rainfallMm?: number;
  tempDropC?: number; // drop over the last 24–48 h
  cycloneWarning?: boolean;
  /** Heavy-rain threshold (mm) that triggers the dilution advisory. Default 50. */
  heavyRainMm?: number;
}

export interface WeatherAdvisory {
  source: string;
  severity: 'info' | 'watch' | 'critical';
  title: string;
  steps: string[];
}

export interface WeatherResult {
  advisories: WeatherAdvisory[];
  preCycloneChecklist: string[] | null;
  emergencyHarvestRecommended: boolean;
}

const PRE_CYCLONE_CHECKLIST = [
  'Lower pond water level to absorb rainfall',
  'Secure / elevate aerators and electricals',
  'Top up genset fuel; test backup power',
  'Reinforce bunds and outlets',
  'Decide emergency partial harvest if shrimp are marketable',
  'Stock minerals, lime and emergency oxygen/peroxide',
];

/**
 * Weather & Cyclone advisories (farmer_features_spec.md §8). Pure rules engine;
 * weather input is manual now, pluggable to a free IMD feed later.
 */
@Injectable()
export class WeatherService {
  evaluate(input: WeatherInput): WeatherResult {
    const advisories: WeatherAdvisory[] = [];
    let preCycloneChecklist: string[] | null = null;
    let emergencyHarvestRecommended = false;

    const heavyRainMm = input.heavyRainMm ?? 50;
    if ((input.rainfallMm ?? 0) >= heavyRainMm) {
      advisories.push({
        source: 'weather',
        severity: 'watch',
        title: 'Heavy rain — salinity dilution risk',
        steps: [
          'Recheck salinity and alkalinity after the rain',
          'Top up minerals (Ca/Mg/K) per the mineral calculator',
          'Increase aeration; watch for stratification & DO crash',
        ],
      });
    }

    if ((input.tempDropC ?? 0) > 3) {
      advisories.push({
        source: 'weather',
        severity: 'watch',
        title: 'Temperature drop — elevated WSSV risk',
        steps: [
          'Raise biosecurity; avoid stressors and handling',
          'Reduce feed; maintain stable water temperature',
          'Watch for white-spot signs; PCR-test if mortality starts',
        ],
      });
    }

    if (input.cycloneWarning) {
      preCycloneChecklist = [...PRE_CYCLONE_CHECKLIST];
      emergencyHarvestRecommended = true;
      advisories.push({
        source: 'weather',
        severity: 'critical',
        title: 'Cyclone warning — act now',
        steps: [
          'Run the pre-cyclone checklist',
          'Evaluate emergency harvest for marketable ponds',
        ],
      });
    }

    return { advisories, preCycloneChecklist, emergencyHarvestRecommended };
  }
}
