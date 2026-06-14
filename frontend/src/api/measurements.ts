import apiClient from './client';

// ──────────────────────────────────────────────────────────────────────────────
// Types — mirror backend/src/measurement/* (the §6.2 Measurement envelope)
// ──────────────────────────────────────────────────────────────────────────────

export type MeasurementSource =
  | 'manual'
  | 'sensor'
  | 'lab'
  | 'derived'
  | 'photo_ai';

export type TimeOfDay =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'evening'
  | 'night'
  | 'AM'
  | 'PM';

export type MissingReason =
  | 'not_measured'
  | 'not_applicable'
  | 'sensor_fail';

export interface Measurement {
  id: string;
  pondId: string;
  cropId: string | null;
  doc: number | null;
  param: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string;
  measuredAt: string;
  timeOfDay: TimeOfDay | null;
  source: MeasurementSource;
  instrument: string | null;
  deviceId: string | null;
  enteredBy: string | null;
  enteredByRole: string | null;
  confidence: number | null;
  isMissingReason: MissingReason | null;
  editedFrom: string | null;
  isSuperseded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataDictionaryEntry {
  id: string;
  param: string;
  label: string;
  category: string;
  valueType: 'numeric' | 'categorical' | 'boolean';
  unit: string;
  allowedValues: string[] | null;
  minValue: number | null;
  maxValue: number | null;
  version: number;
  isActive: boolean;
}

export interface CreateMeasurementInput {
  /** Optional client-minted UUID for idempotent offline sync. */
  id?: string;
  pondId: string;
  cropId?: string;
  doc?: number;
  param: string;
  valueNum?: number;
  valueText?: string;
  unit?: string;
  measuredAt?: string;
  timeOfDay?: TimeOfDay;
  source?: MeasurementSource;
  instrument?: string;
  deviceId?: string;
  enteredByRole?: string;
  confidence?: number;
  isMissingReason?: MissingReason;
}

export interface EditMeasurementInput {
  valueNum?: number;
  valueText?: string;
  isMissingReason?: MissingReason;
}

export interface BatchItemResult {
  index: number;
  id: string | null;
  status: 'created' | 'duplicate' | 'error';
  error?: string;
}

export interface MeasurementQuery {
  pondId: string;
  cropId?: string;
  param?: string;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Client
// ──────────────────────────────────────────────────────────────────────────────

export const measurementsApi = {
  /** Ingest a single reading through the unified pipeline. */
  create: (input: CreateMeasurementInput) =>
    apiClient.post<Measurement>('/measurements', input),

  /** Batch ingest — used by offline sync; per-item idempotent. */
  createBatch: (measurements: CreateMeasurementInput[], continueOnError = true) =>
    apiClient.post<{ results: BatchItemResult[] }>('/measurements/batch', {
      measurements,
      continueOnError,
    }),

  /** Time-series read for a pond (optionally a crop/param/category/window). */
  query: (q: MeasurementQuery) =>
    apiClient.get<Measurement[]>('/measurements', { params: q }),

  findOne: (id: string) => apiClient.get<Measurement>(`/measurements/${id}`),

  /** Append a corrected reading (original preserved + superseded). */
  edit: (id: string, input: EditMeasurementInput) =>
    apiClient.patch<Measurement>(`/measurements/${id}`, input),

  /** The versioned data dictionary (param metadata for entry forms). */
  dictionary: () => apiClient.get<DataDictionaryEntry[]>('/data-dictionary'),
};
