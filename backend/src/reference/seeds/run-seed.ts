import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedReferenceData } from './reference.seed';

dotenv.config({ path: '.env' });

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
    entities: [__dirname + '/../entities/*.entity.js'],
  });

  try {
    await dataSource.initialize();
    console.log('Data source initialized');
    await seedReferenceData(dataSource);
    console.log('Seeding complete');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

run();
