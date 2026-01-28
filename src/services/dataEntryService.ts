import database from '../database';
import ChemicalData from '../database/models/ChemicalData';
import MortalityRecord from '../database/models/MortalityRecord';
import PlanktonData from '../database/models/PlanktonData';
import MicrobiologyData from '../database/models/MicrobiologyData';

export const DataEntryService = {
    // Chemical
    addChemicalRecord: async (dto: any) => {
        return database.write(async () => {
            await database.collections.get<ChemicalData>('chemical_data').create(record => {
                record.cropId = dto.cropId;
                record.measurementDate = dto.measurementDate;
                record.measurementTime = dto.measurementTime;
                record.ammoniaNh3Ppm = dto.ammoniaNh3Ppm;
                record.nitriteNo2Ppm = dto.nitriteNo2Ppm;
                record.alkalinityPpm = dto.alkalinityPpm;
            });
        });
    },

    // Plankton
    addPlanktonRecord: async (dto: any) => {
        return database.write(async () => {
            await database.collections.get<PlanktonData>('plankton_data').create(record => {
                record.cropId = dto.cropId;
                record.measurementDate = dto.measurementDate;
                record.measurementTime = dto.measurementTime;
                record.greenAlgaeGaCellMl = dto.greenAlgaeGaCellMl;
                record.blueGreenAlgaeBgaCellMl = dto.blueGreenAlgaeBgaCellMl;
                record.diatomCellMl = dto.diatomCellMl;
            });
        });
    },

    // Microbiology
    addMicrobiologyRecord: async (dto: any) => {
        return database.write(async () => {
            await database.collections.get<MicrobiologyData>('microbiology_data').create(record => {
                record.cropId = dto.cropId;
                record.measurementDate = dto.measurementDate;
                record.measurementTime = dto.measurementTime;
                record.yellowVibrioCfuMl = dto.yellowVibrioCfuMl;
                record.greenVibrioCfuMl = dto.greenVibrioCfuMl;
            });
        });
    },

    // Mortality
    addMortalityRecord: async (dto: any) => {
        return database.write(async () => {
            await database.collections.get<MortalityRecord>('mortality_records').create(record => {
                record.cropId = dto.cropId;
                record.mortalityDate = dto.mortalityDate;
                record.basedOn = dto.basedOn;
                record.totalQuantity = dto.totalQuantity;
                record.totalWeightKg = dto.totalWeightKg;
            });
        });
    },
};
