import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import Pond from './models/Pond';
import Crop from './models/Crop';
import ChemicalData from './models/ChemicalData';
import PlanktonData from './models/PlanktonData';
import MicrobiologyData from './models/MicrobiologyData';
import MortalityRecord from './models/MortalityRecord';
import DiseaseRecord from './models/DiseaseRecord';

let database: Database | null = null;

try {
    // Create the adapter to the underlying database:
    const adapter = new SQLiteAdapter({
        schema: mySchema,
        // (You might want to comment out migrations if you're not using them yet)
        // migrations,
        // jsi: true, /* Platform.OS === 'ios' */
        onSetUpError: error => {
            // Database failed to load -- offer the user to reload the app or log out
            console.error('Database setup failed', error);
        },
    });

    // Then, make a Watermelon database from it!
    database = new Database({
        adapter,
        modelClasses: [
            Pond,
            Crop,
            ChemicalData,
            PlanktonData,
            MicrobiologyData,
            MortalityRecord,
            DiseaseRecord,
        ],
    });
} catch (error) {
    console.warn(
        'WatermelonDB native module not available. ' +
        'Offline database features are disabled (this is expected in Expo Go).',
        error,
    );
}

export default database;
