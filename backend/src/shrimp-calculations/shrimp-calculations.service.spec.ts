import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ShrimpCalculationsService, normalizeShrimpSpecies } from './shrimp-calculations.service';

describe('ShrimpCalculationsService', () => {
  let service: ShrimpCalculationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://dummy.com') } },ShrimpCalculationsService],
    }).compile();

    service = module.get<ShrimpCalculationsService>(ShrimpCalculationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('species-specific feeding rate', () => {
    it('uses the vannamei table with a proper taper near harvest size', () => {
      expect(service.getRecommendedFeedingRate(2)).toBe(10);
      expect(service.getRecommendedFeedingRate(25)).toBe(2.5); // 20–25 g unchanged
      expect(service.getRecommendedFeedingRate(28)).toBe(2.0); // 25–30 g tapers
      expect(service.getRecommendedFeedingRate(35)).toBe(1.8); // > 30 g (no longer flat 2.5)
      expect(service.getRecommendedFeedingRate(25, 'vannamei')).toBe(2.5); // explicit == default
    });

    it('uses a distinct tail for tiger prawn (monodon)', () => {
      // Tiger grows larger and keeps a slightly higher tail than vannamei at size.
      expect(service.getRecommendedFeedingRate(22, 'monodon')).toBe(2.5);
      expect(service.getRecommendedFeedingRate(35, 'monodon')).toBe(2);
      expect(service.getRecommendedFeedingRate(35, 'vannamei')).toBe(1.8); // contrast at 35 g
    });

    it('uses the freshwater-prawn (scampi) table', () => {
      expect(service.getRecommendedFeedingRate(2, 'scampi')).toBe(8); // lower juvenile rate
      expect(service.getRecommendedFeedingRate(10, 'scampi')).toBe(4);
    });

    it('accepts free-text / scientific names via normalization', () => {
      expect(service.getRecommendedFeedingRate(30, 'Penaeus monodon')).toBe(2);
      expect(service.getRecommendedFeedingRate(2, 'Giant Tiger Prawn')).toBe(9);
      expect(service.getRecommendedFeedingRate(2, 'Macrobrachium rosenbergii')).toBe(8);
    });
  });

  describe('normalizeShrimpSpecies', () => {
    it('coerces free text to a supported species, defaulting to vannamei', () => {
      expect(normalizeShrimpSpecies('Penaeus monodon')).toBe('monodon');
      expect(normalizeShrimpSpecies('black tiger')).toBe('monodon');
      expect(normalizeShrimpSpecies('scampi')).toBe('scampi');
      expect(normalizeShrimpSpecies('Penaeus indicus')).toBe('indicus');
      expect(normalizeShrimpSpecies('Penaeus vannamei')).toBe('vannamei');
      expect(normalizeShrimpSpecies(null)).toBe('vannamei');
      expect(normalizeShrimpSpecies('something else')).toBe('vannamei');
    });
  });
});
