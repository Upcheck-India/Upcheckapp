import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import {
  FREE_NH3,
  THRESHOLDS,
  classify,
  classifyZone,
  getThreshold,
  isCritical,
  thresholdFor,
  toThresholdSpecies,
} from './wq-thresholds';

/**
 * Parity guard: the frontend file is the colour source, this module is the
 * alert + score source. Transpile the real frontend file and compare, so a
 * threshold edited on one side only fails CI instead of shipping.
 */
function loadFrontend(): any {
  const file = path.resolve(__dirname, '../../../frontend/src/features/waterQualityThresholds.ts');
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(js, { module, exports: module.exports });
  return module.exports;
}

describe('wq-thresholds parity with the frontend table', () => {
  const fe = loadFrontend();

  it('has identical numeric tables for every species and parameter', () => {
    // JSON round-trip: compare values, not object identity / realm.
    expect(JSON.parse(JSON.stringify(THRESHOLDS))).toEqual(JSON.parse(JSON.stringify(fe.THRESHOLDS)));
  });

  it('coerces species strings identically', () => {
    for (const s of ['Penaeus vannamei', 'VannameiVannamei', 'P. monodon', 'Tiger', 'black tiger', 'indicus', 'Scampi', 'Macrobrachium rosenbergii', 'tilapia', '', null, undefined]) {
      expect(toThresholdSpecies(s)).toBe(fe.toThresholdSpecies(s));
    }
  });

  it('classifies identically across each boundary', () => {
    for (const species of Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]) {
      for (const param of Object.keys(THRESHOLDS[species]) as any[]) {
        const t = getThreshold(species, param);
        const edges = [t.criticalLow, t.cautionLow, t.cautionHigh, t.criticalHigh].filter((v) => v != null) as number[];
        for (const e of edges) {
          for (const v of [e - 0.01, e, e + 0.01]) {
            expect(classifyZone(v, t)).toBe(fe.classifyZone(v, fe.getThreshold(species, param)));
          }
        }
      }
    }
  });
});

describe('classify (three-level)', () => {
  const doT = getThreshold('vannamei', 'do');
  it('DO: < 3 critical, < 4 caution, else optimal', () => {
    expect(classify(2.9, doT)).toBe('critical');
    expect(classify(3, doT)).toBe('caution');
    expect(classify(3.9, doT)).toBe('caution');
    expect(classify(4, doT)).toBe('optimal');
    expect(classify(12, doT)).toBe('optimal');
  });
  it('pH: critical outside 7.0–9.0, caution outside 7.5–8.5', () => {
    const t = getThreshold('vannamei', 'ph');
    expect(classify(6.9, t)).toBe('critical');
    expect(classify(7.0, t)).toBe('caution');
    expect(classify(8.0, t)).toBe('optimal');
    expect(classify(8.6, t)).toBe('caution');
    expect(classify(9.1, t)).toBe('critical');
  });
  it('total ammonia: > 0.5 critical, > 0.1 caution', () => {
    const t = getThreshold('vannamei', 'ammonia');
    expect(classify(0.1, t)).toBe('optimal');
    expect(classify(0.2, t)).toBe('caution');
    expect(classify(0.51, t)).toBe('critical');
  });
  it('free NH3: > 0.3 critical, > 0.1 caution', () => {
    expect(classify(0.05, FREE_NH3)).toBe('optimal');
    expect(classify(0.2, FREE_NH3)).toBe('caution');
    expect(classify(0.31, FREE_NH3)).toBe('critical');
  });
  it('species-aware: scampi pH 6.8 is caution, vannamei critical; unknown → vannamei', () => {
    expect(classify(6.8, thresholdFor('Macrobrachium rosenbergii', 'ph'))).toBe('caution');
    expect(classify(6.8, thresholdFor('tilapia', 'ph'))).toBe('critical');
    expect(isCritical(null, doT)).toBe(false);
    expect(isCritical(2, doT)).toBe(true);
  });
});
