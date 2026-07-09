import { DataSource } from 'typeorm';
import { Species } from '../entities/species.entity';
import { Hatchery } from '../entities/hatchery.entity';
import { Broodstock } from '../entities/broodstock.entity';

export async function seedReferenceData(dataSource: DataSource): Promise<void> {
  const speciesRepo = dataSource.getRepository(Species);
  const hatcheryRepo = dataSource.getRepository(Hatchery);
  const broodstockRepo = dataSource.getRepository(Broodstock);

  // Seed Species
  const speciesData = [
    {
      scientificName: 'Penaeus vannamei',
      commonName: 'Pacific White Shrimp',
      optimalPhMin: 7.0,
      optimalPhMax: 8.5,
      optimalSalinityMin: 5,
      optimalSalinityMax: 35,
      optimalTempMin: 26,
      optimalTempMax: 32,
    },
    {
      scientificName: 'Penaeus monodon',
      commonName: 'Giant Tiger Prawn',
      optimalPhMin: 7.5,
      optimalPhMax: 8.5,
      optimalSalinityMin: 10,
      optimalSalinityMax: 35,
      optimalTempMin: 28,
      optimalTempMax: 33,
    },
    {
      scientificName: 'Penaeus chinensis',
      commonName: 'Chinese White Shrimp',
      optimalPhMin: 7.8,
      optimalPhMax: 8.6,
      optimalSalinityMin: 15,
      optimalSalinityMax: 30,
      optimalTempMin: 22,
      optimalTempMax: 28,
    },
  ];

  for (const data of speciesData) {
    const exists = await speciesRepo.findOne({
      where: { scientificName: data.scientificName },
    });
    if (!exists) {
      await speciesRepo.save(speciesRepo.create(data));
    }
  }

  // Seed Hatcheries
  const hatcheryData = [
    {
      name: 'AquaGen Hatchery',
      location: 'Krishna District, Andhra Pradesh',
      contactInfo: { phone: '+91-9876543210', email: 'contact@aquagen.in' },
      isActive: true,
    },
    {
      name: 'SeaGrow Bio-Tech',
      location: 'Nellore, Andhra Pradesh',
      contactInfo: { phone: '+91-9123456789', email: 'info@seagrow.in' },
      isActive: true,
    },
    {
      name: 'Pacific Shrimp Solutions',
      location: 'Kakinada, Andhra Pradesh',
      contactInfo: { phone: '+91-9988776655', email: 'sales@pacificshrimp.in' },
      isActive: false,
    },
  ];

  for (const data of hatcheryData) {
    const exists = await hatcheryRepo.findOne({ where: { name: data.name } });
    if (!exists) {
      await hatcheryRepo.save(hatcheryRepo.create(data));
    }
  }

  // Seed Broodstock
  const broodstockData = [
    {
      supplier: 'AquaGen Hatchery',
      lineCode: 'VAN-SPF-01',
      origin: 'Hawaii, USA',
      specifications: {
        species: 'Penaeus vannamei',
        generation: 'SPF F2',
        avgWeight: '35g',
        diseaseFree: true,
      },
      isActive: true,
    },
    {
      supplier: 'SeaGrow Bio-Tech',
      lineCode: 'MON-BSR-02',
      origin: 'Thailand',
      specifications: {
        species: 'Penaeus monodon',
        generation: 'BSR F1',
        avgWeight: '45g',
        diseaseFree: true,
      },
      isActive: true,
    },
    {
      supplier: 'Pacific Shrimp Solutions',
      lineCode: 'VAN-FAST-03',
      origin: 'Indonesia',
      specifications: {
        species: 'Penaeus vannamei',
        generation: 'Fast-growth F3',
        avgWeight: '32g',
        diseaseFree: false,
        notes: 'TSV resistant line',
      },
      isActive: true,
    },
  ];

  for (const data of broodstockData) {
    const exists = await broodstockRepo.findOne({
      where: { lineCode: data.lineCode },
    });
    if (!exists) {
      await broodstockRepo.save(broodstockRepo.create(data));
    }
  }

  console.log('Reference seed data inserted successfully');
}
