import database from '../database';
import ChemicalData from '../database/models/ChemicalData';
import MortalityRecord from '../database/models/MortalityRecord';
import PlanktonData from '../database/models/PlanktonData';
import MicrobiologyData from '../database/models/MicrobiologyData';

const DB_WARN = 'DataEntryService: WatermelonDB not available (Expo Go).';

export const DataEntryService = {
    // Chemical
    addChemicalRecord: async (dto: any) => {
        if (!database) { console.warn(DB_WARN); return; }
        const db = database;
        return db.write(async () => {
            await db.collections.get<ChemicalData>('chemical_data').create(record => {
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
        if (!database) { console.warn(DB_WARN); return; }
        const db = database;
        return db.write(async () => {
            await db.collections.get<PlanktonData>('plankton_data').create(record => {
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
        if (!database) { console.warn(DB_WARN); return; }
        const db = database;
        return db.write(async () => {
            await db.collections.get<MicrobiologyData>('microbiology_data').create(record => {
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
        if (!database) { console.warn(DB_WARN); return; }
        const db = database;
        return db.write(async () => {
            await db.collections.get<MortalityRecord>('mortality_records').create(record => {
                record.cropId = dto.cropId;
                record.mortalityDate = dto.mortalityDate;
                record.basedOn = dto.basedOn;
                record.totalQuantity = dto.totalQuantity;
                record.totalWeightKg = dto.totalWeightKg;
            });
        });
    },
};
