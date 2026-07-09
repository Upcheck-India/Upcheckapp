import { BadRequestException } from '@nestjs/common';
import { PondDimensionService } from './pond-dimension.service';

describe('PondDimensionService', () => {
  let service: PondDimensionService;

  beforeEach(() => {
    service = new PondDimensionService();
  });

  // ── calculateArea ──────────────────────────────────────────

  describe('calculateArea', () => {
    it('should calculate rectangular area = length × width', () => {
      expect(
        service.calculateArea('rectangular', {
          lengthM: 20,
          widthM: 10,
          depthM: 1.5,
        }),
      ).toBe(200);
    });

    it('should calculate circular area = π(d/2)²', () => {
      const area = service.calculateArea('circular', {
        diameterM: 10,
        depthM: 1.5,
      });
      expect(area).toBeCloseTo(78.54, 1); // π × 25 ≈ 78.54
    });

    it('should calculate raceway area = l × w × channels', () => {
      expect(
        service.calculateArea('raceway', {
          lengthM: 30,
          widthM: 5,
          channelCount: 3,
          depthM: 1.2,
        }),
      ).toBe(450);
    });

    it('should default raceway channels to 1', () => {
      expect(
        service.calculateArea('raceway', {
          lengthM: 30,
          widthM: 5,
          depthM: 1.2,
        }),
      ).toBe(150);
    });

    it('should return 0 for irregular geometry', () => {
      expect(service.calculateArea('irregular', { depthM: 1.5 })).toBe(0);
    });

    it('should throw for unknown geometry type', () => {
      expect(() => service.calculateArea('hexagonal', { depthM: 1.5 })).toThrow(
        BadRequestException,
      );
    });

    it('should throw when rectangular is missing length', () => {
      expect(() =>
        service.calculateArea('rectangular', { widthM: 10, depthM: 1.5 }),
      ).toThrow('Rectangular ponds require length and width');
    });

    it('should throw when rectangular is missing width', () => {
      expect(() =>
        service.calculateArea('rectangular', { lengthM: 10, depthM: 1.5 }),
      ).toThrow('Rectangular ponds require length and width');
    });

    it('should throw when circular is missing diameter', () => {
      expect(() => service.calculateArea('circular', { depthM: 1.5 })).toThrow(
        'Circular ponds require diameter',
      );
    });

    it('should round area to 2 decimal places', () => {
      // 7 × 3 = 21.0 — no rounding needed
      expect(
        service.calculateArea('rectangular', {
          lengthM: 7,
          widthM: 3,
          depthM: 1,
        }),
      ).toBe(21);

      // π(10/2)² = 78.539816... → 78.54
      const area = service.calculateArea('circular', {
        diameterM: 10,
        depthM: 1,
      });
      expect(area).toBe(78.54);
    });
  });

  // ── calculateVolume ────────────────────────────────────────

  describe('calculateVolume', () => {
    it('should calculate volume = area × depth', () => {
      expect(service.calculateVolume(200, 1.5)).toBe(300);
    });

    it('should return 0 when area is zero', () => {
      expect(service.calculateVolume(0, 1.5)).toBe(0);
    });

    it('should return 0 when depth is zero', () => {
      expect(service.calculateVolume(200, 0)).toBe(0);
    });

    it('should return 0 when area is negative', () => {
      expect(service.calculateVolume(-10, 1.5)).toBe(0);
    });

    it('should round volume to 2 decimal places', () => {
      // 33.33 × 1.1 = 36.663 → 36.66
      expect(service.calculateVolume(33.33, 1.1)).toBe(36.66);
    });
  });

  // ── validateDimensions ─────────────────────────────────────

  describe('validateDimensions', () => {
    it('should pass for valid rectangular dimensions', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 20,
          widthM: 10,
          depthM: 1.5,
        }),
      ).not.toThrow();
    });

    it('should throw when depth is below minimum', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 20,
          widthM: 10,
          depthM: 0.3,
        }),
      ).toThrow('Depth must be at least 0.5m');
    });

    it('should throw when depth exceeds maximum', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 20,
          widthM: 10,
          depthM: 6.0,
        }),
      ).toThrow('Depth must not exceed 5m');
    });

    it('should throw when length is below 1m', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 0.5,
          widthM: 10,
          depthM: 1.5,
        }),
      ).toThrow('Length must be between 1m and 500m');
    });

    it('should throw when computed area exceeds max', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 300,
          widthM: 200,
          depthM: 1.5,
        }),
      ).toThrow(/exceeds maximum/);
    });

    it('should throw when computed area is below min', () => {
      expect(() =>
        service.validateDimensions('rectangular', {
          lengthM: 3,
          widthM: 3,
          depthM: 1.0,
        }),
      ).toThrow(/below minimum/);
    });
  });

  // ── getWarnings ────────────────────────────────────────────

  describe('getWarnings', () => {
    it('should return no warnings for normal values', () => {
      expect(service.getWarnings(500, 1.5)).toEqual([]);
    });

    it('should warn for unusually large area', () => {
      const warnings = service.getWarnings(25000, 1.5);
      expect(warnings.some((w) => w.field === 'area')).toBe(true);
    });

    it('should warn for deep ponds', () => {
      const warnings = service.getWarnings(500, 4.0);
      expect(warnings.some((w) => w.field === 'depth')).toBe(true);
    });
  });

  // ── hasDimensionsChanged ───────────────────────────────────

  describe('hasDimensionsChanged', () => {
    const oldPond = {
      lengthM: 20,
      widthM: 10,
      depthM: 1.5,
      calculatedAreaM2: 200,
    };

    it('should return false when nothing changed', () => {
      expect(service.hasDimensionsChanged(oldPond, {})).toBe(false);
    });

    it('should return true when length changed', () => {
      expect(service.hasDimensionsChanged(oldPond, { lengthM: 25 })).toBe(true);
    });

    it('should return true when override area changed', () => {
      expect(
        service.hasDimensionsChanged(oldPond, { overrideAreaM2: 250 }),
      ).toBe(true);
    });

    it('should return false when same value is sent', () => {
      expect(service.hasDimensionsChanged(oldPond, { lengthM: 20 })).toBe(
        false,
      );
    });
  });
});
