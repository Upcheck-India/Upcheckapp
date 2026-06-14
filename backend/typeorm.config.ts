import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

// Local Postgres (localhost/127.0.0.1) doesn't speak SSL; remote (Supabase/Render)
// requires it. Gate SSL so the same config works for local migration runs.
const dbUrl = process.env.DATABASE_URL ?? '';
const isLocal = /@(localhost|127\.0\.0\.1)/.test(dbUrl) || process.env.PGSSL === 'disable';

export default new DataSource({
  type: 'postgres',
  url: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'src', 'migrations', '*.{ts,js}')],
});
