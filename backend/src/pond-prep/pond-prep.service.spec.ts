import { PondPrepService } from './pond-prep.service';

const svc = new PondPrepService();

describe('PondPrepService (farmer_features_spec §7)', () => {
  it('lime dose = max(0, ΔpH) × area × bufferFactor', () => {
    expect(svc.limeDoseKg(7, 6, 1000, 0.1)).toBe(100); // raise 1 pH over 1000 m²
    expect(svc.limeDoseKg(7, 7.5, 1000, 0.1)).toBe(0); // already above target
  });

  it('provides ordered templates ending in the DOC-0 gate', () => {
    const coastal = svc.template('coastal_brackish');
    expect(coastal[coastal.length - 1].key).toBe('doc0_gate');
    // Inland adds the mineral-correction step that coastal lacks.
    expect(svc.template('inland_low_saline').some((t) => t.key === 'mineral_correction')).toBe(true);
    expect(coastal.some((t) => t.key === 'mineral_correction')).toBe(false);
  });

  it('gates Start-Cycle on every critical task being done', () => {
    const tasks = svc.template('coastal_brackish');
    const criticalKeys = tasks.filter((t) => t.critical).map((t) => t.key);

    // All critical done → unlocked.
    const ready = svc.readiness('coastal_brackish', criticalKeys);
    expect(ready.canStartCycle).toBe(true);
    expect(ready.criticalDone).toBe(ready.criticalTotal);

    // One critical missing → locked.
    const blocked = svc.readiness('coastal_brackish', criticalKeys.slice(1));
    expect(blocked.canStartCycle).toBe(false);

    // Only optional tasks done → still locked.
    const optionalOnly = svc.readiness('coastal_brackish', ['chlorination', 'probiotic']);
    expect(optionalOnly.canStartCycle).toBe(false);
    expect(optionalOnly.criticalDone).toBe(0);
  });
});
