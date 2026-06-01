/**
 * Proactive alert engine — turns the latest pond reading (plus treatment/disease
 * notes) into a prioritized, actionable alert list. Pure and unit-tested; a UI
 * banner list or push-notification scheduler can consume the output directly.
 *
 * Composes the already-verified science modules so logic stays in one place:
 *  - per-species five-zone thresholds  → out-of-range water-quality alerts
 *  - nighttime DO alarm                → pre-dawn oxygen-crash warning
 *  - banned-substance matcher          → export-rejection guardrail
 *  - reading staleness                 → "log fresh data" nudge
 *
 * Warn-only and non-directive (no product recommendations) — decision support.
 */
import {
  ThresholdSpecies,
  ThresholdParam,
  evaluateParameter,
  nighttimeDoAlarm,
} from './waterQualityThresholds'
import { findBannedSubstances } from './bannedSubstances'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  severity: AlertSeverity
  category: 'water-quality' | 'oxygen' | 'compliance' | 'data'
  title: string
  message: string
}

export interface AlertReading {
  ph?: number | null
  dissolvedOxygen?: number | null
  temperature?: number | null
  salinity?: number | null
  ammonia?: number | null
  nitrite?: number | null
  nitrate?: number | null
  alkalinity?: number | null
  transparency?: number | null
  recordedAt?: string | null
}

export interface BuildAlertsInput {
  species: ThresholdSpecies
  reading?: AlertReading | null
  /** Evaluation instant (e.g. now). */
  now: Date
  /** Free-text treatment/disease notes to scan for banned substances. */
  notes?: string | null
  /** Hours of reading-age beyond which data is considered stale. Default 24. */
  stalenessHours?: number
}

const MS_PER_HOUR = 3_600_000

// reading field → (threshold param, human label, display unit)
const PARAM_MAP: { field: keyof AlertReading; param: ThresholdParam; label: string; unit: string }[] = [
  { field: 'dissolvedOxygen', param: 'do', label: 'Dissolved Oxygen', unit: 'mg/L' },
  { field: 'ph', param: 'ph', label: 'pH', unit: '' },
  { field: 'temperature', param: 'temperature', label: 'Temperature', unit: '°C' },
  { field: 'salinity', param: 'salinity', label: 'Salinity', unit: 'ppt' },
  { field: 'ammonia', param: 'ammonia', label: 'Ammonia (NH₃)', unit: 'mg/L' },
  { field: 'nitrite', param: 'nitrite', label: 'Nitrite', unit: 'mg/L' },
  { field: 'nitrate', param: 'nitrate', label: 'Nitrate', unit: 'mg/L' },
  { field: 'alkalinity', param: 'alkalinity', label: 'Alkalinity', unit: 'mg/L' },
  { field: 'transparency', param: 'transparency', label: 'Transparency', unit: 'cm' },
]

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }

function zoneWord(zone: string): string {
  if (zone === 'critical-low' || zone === 'caution-low') return 'low'
  if (zone === 'critical-high' || zone === 'caution-high') return 'high'
  return 'out of range'
}

/** Build a prioritized alert list (critical → warning → info) for a pond. */
export function buildAlerts(input: BuildAlertsInput): Alert[] {
  const { species, reading, now, notes, stalenessHours = 24 } = input
  const alerts: Alert[] = []

  // 1. Banned / restricted substances in notes (export-rejection risk).
  for (const sub of findBannedSubstances(notes)) {
    alerts.push({
      id: `banned:${sub.name}`,
      severity: 'critical',
      category: 'compliance',
      title: `${sub.category === 'banned' ? 'Banned' : 'Restricted'} substance: ${sub.name}`,
      message:
        sub.category === 'banned'
          ? `${sub.name} is prohibited for shrimp export and can cause harvest rejection (CAA/MPEDA).`
          : `${sub.name} is export-restricted — observe the withdrawal period before harvest.`,
    })
  }

  if (reading) {
    // 2. Per-parameter five-zone evaluation.
    for (const def of PARAM_MAP) {
      const value = reading[def.field] as number | null | undefined
      if (value == null) continue
      const { zone, status } = evaluateParameter(species, def.param, value)
      if (status === 'warning' || status === 'critical') {
        const unit = def.unit ? ` ${def.unit}` : ''
        alerts.push({
          id: `wq:${def.param}`,
          severity: status,
          category: 'water-quality',
          title: `${def.label} ${zoneWord(String(zone))}`,
          message: `${def.label} is ${value}${unit} (${String(zone).replace('-', ' ')}).`,
        })
      }
    }

    // 3. Nighttime DO crash risk (escalates a low night reading to critical).
    if (reading.dissolvedOxygen != null && reading.recordedAt) {
      const hour = new Date(reading.recordedAt).getHours()
      if (
        !Number.isNaN(hour) &&
        nighttimeDoAlarm({ dissolvedOxygen: reading.dissolvedOxygen, hour, species })
      ) {
        alerts.push({
          id: 'do:nighttime',
          severity: 'critical',
          category: 'oxygen',
          title: 'Nighttime oxygen crash risk',
          message:
            'Dissolved oxygen is low during night hours and will fall further before dawn — run aerators now.',
        })
      }
    }
  }

  // 4. Data freshness.
  if (!reading || reading.recordedAt == null) {
    alerts.push({
      id: 'data:none',
      severity: 'info',
      category: 'data',
      title: 'No water-quality reading',
      message: 'Record a water-quality reading to enable monitoring and alerts.',
    })
  } else {
    const ageH = (now.getTime() - new Date(reading.recordedAt).getTime()) / MS_PER_HOUR
    if (ageH > stalenessHours) {
      alerts.push({
        id: 'data:stale',
        severity: 'warning',
        category: 'data',
        title: 'Reading is stale',
        message: `No water-quality reading in the last ${Math.floor(ageH)} hours.`,
      })
    }
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** Count of critical-severity alerts — handy for a badge. */
export function criticalCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.severity === 'critical').length
}

export default { buildAlerts, criticalCount }
