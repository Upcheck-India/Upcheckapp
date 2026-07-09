import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateWaterQualityRecordDto } from './create-water-quality-record.dto';

/** VALID-1: physical-range bounds reject typos, accept real edge readings. */
function errorsFor(payload: Record<string, unknown>) {
  return validateSync(plainToInstance(CreateWaterQualityRecordDto, payload), {
    whitelist: true,
  });
}

const POND = '11111111-1111-4111-8111-111111111111';

describe('CreateWaterQualityRecordDto — VALID-1 range validation', () => {
  it('accepts in-range readings (incl. physical edges)', () => {
    expect(
      errorsFor({
        pondId: POND,
        ph: 14,
        temperature: 0,
        dissolvedOxygen: 30,
        salinity: 60,
      }),
    ).toHaveLength(0);
  });

  it('rejects a fat-fingered pH of 999', () => {
    expect(errorsFor({ pondId: POND, ph: 999 }).length).toBeGreaterThan(0);
  });

  it('rejects a negative dissolved oxygen', () => {
    expect(
      errorsFor({ pondId: POND, dissolvedOxygen: -1 }).length,
    ).toBeGreaterThan(0);
  });

  it('rejects an out-of-range temperature', () => {
    expect(
      errorsFor({ pondId: POND, temperature: 120 }).length,
    ).toBeGreaterThan(0);
  });
});
