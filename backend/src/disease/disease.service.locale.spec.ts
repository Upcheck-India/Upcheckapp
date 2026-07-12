import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiseaseService } from './disease.service';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseLibraryTranslation } from './disease-library-translation.entity';
import { DiseaseRecord } from './disease-record.entity';

/**
 * The disease library was English-only with no schema to hold a translation
 * at all — DiagnoseScreen/DiseaseListScreen chrome was localized, but the
 * actual disease content underneath it wasn't. This locks in the merge: a
 * disease with a translation row for the requested locale gets its
 * symptoms/prevention/treatment text swapped in; one without (or with an
 * empty array on some field) falls back to the English disease_library
 * value — never a blank result, and 'en' or an unsupported locale never
 * triggers a translation lookup at all.
 */
describe('DiseaseService — locale-aware library content', () => {
  let service: DiseaseService;
  let libraryRepo: { find: jest.Mock; findOne: jest.Mock };
  let translationRepo: { find: jest.Mock };

  const english = (): DiseaseLibrary => {
    const d = new DiseaseLibrary();
    d.id = 'disease-1';
    d.name = 'WSSV';
    d.scientificName = 'White Spot Syndrome Virus';
    d.commonNames = ['White Spot'];
    d.symptoms = ['White inclusions on carapace', 'Reduced feeding', 'Mortality'];
    d.preventionMeasures = ['Biosecurity', 'Screening'];
    d.treatmentRecommendations = ['No cure', 'Cull infected ponds'];
    return d;
  };

  beforeEach(async () => {
    libraryRepo = { find: jest.fn(), findOne: jest.fn() };
    translationRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiseaseService,
        { provide: getRepositoryToken(DiseaseLibrary), useValue: libraryRepo },
        { provide: getRepositoryToken(DiseaseLibraryTranslation), useValue: translationRepo },
        { provide: getRepositoryToken(DiseaseRecord), useValue: {} },
      ],
    }).compile();
    service = module.get(DiseaseService);
  });

  it('merges in the translation when one exists for the requested locale', async () => {
    libraryRepo.find.mockResolvedValue([english()]);
    translationRepo.find.mockResolvedValue([
      {
        diseaseId: 'disease-1',
        locale: 'hi',
        symptoms: ['कवच पर सफेद समावेशन', 'कम आहार ग्रहण', 'मृत्यु दर'],
        preventionMeasures: ['जैवसुरक्षा', 'स्क्रीनिंग'],
        treatmentRecommendations: ['कोई इलाज नहीं', 'संक्रमित तालाबों को हटाएं'],
      },
    ]);

    const [result] = await service.findAllDiseases('hi');

    expect(result.symptoms).toEqual(['कवच पर सफेद समावेशन', 'कम आहार ग्रहण', 'मृत्यु दर']);
    expect(result.preventionMeasures).toEqual(['जैवसुरक्षा', 'स्क्रीनिंग']);
    // name/scientificName/commonNames are never translated.
    expect(result.name).toBe('WSSV');
  });

  it('falls back to English when no translation row exists for that disease', async () => {
    libraryRepo.find.mockResolvedValue([english()]);
    translationRepo.find.mockResolvedValue([]); // no row for this disease/locale

    const [result] = await service.findAllDiseases('ta');

    expect(result.symptoms).toEqual(english().symptoms);
    expect(result.preventionMeasures).toEqual(english().preventionMeasures);
  });

  it('falls back to English per-field when a translation row has an empty array', async () => {
    libraryRepo.find.mockResolvedValue([english()]);
    translationRepo.find.mockResolvedValue([
      {
        diseaseId: 'disease-1',
        locale: 'te',
        symptoms: [], // not yet translated for this field
        preventionMeasures: ['జీవభద్రత', 'స్క్రీనింగ్'],
        treatmentRecommendations: ['చికిత్స లేదు', 'సోకిన చెరువులను తొలగించండి'],
      },
    ]);

    const [result] = await service.findAllDiseases('te');

    expect(result.symptoms).toEqual(english().symptoms); // fell back
    expect(result.preventionMeasures).toEqual(['జీవభద్రత', 'స్క్రీనింగ్']); // translated
  });

  it('never queries translations for "en" or an unsupported locale', async () => {
    libraryRepo.find.mockResolvedValue([english()]);

    await service.findAllDiseases('en');
    await service.findAllDiseases('fr'); // not one of the app's supported languages
    await service.findAllDiseases(undefined);

    expect(translationRepo.find).not.toHaveBeenCalled();
  });

  it('findDiseaseById applies the same locale merge as findAllDiseases', async () => {
    libraryRepo.findOne.mockResolvedValue(english());
    translationRepo.find.mockResolvedValue([
      {
        diseaseId: 'disease-1',
        locale: 'bn',
        symptoms: ['খোলসে সাদা অন্তর্ভুক্তি', 'কম খাদ্য গ্রহণ', 'মৃত্যুহার'],
        preventionMeasures: [],
        treatmentRecommendations: [],
      },
    ]);

    const result = await service.findDiseaseById('disease-1', 'bn');

    expect(result.symptoms).toEqual(['খোলসে সাদা অন্তর্ভুক্তি', 'কম খাদ্য গ্রহণ', 'মৃত্যুহার']);
    expect(result.preventionMeasures).toEqual(english().preventionMeasures); // fell back
  });
});
