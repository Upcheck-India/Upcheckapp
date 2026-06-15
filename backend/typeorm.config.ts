import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const shared = {
  type: 'postgres' as const,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'src', 'migrations', '*.{ts,js}')],
};

const dbUrl = process.env.DATABASE_URL ?? '';
const sslDisabled = process.env.PGSSL === 'disable';
const isLocalHost = (h?: string) => h === 'localhost' || h === '127.0.0.1';

// Prefer DATABASE_URL when provided (CI / Render). Otherwise connect with the
// discrete PG* vars from .env — this matches the project's env shape AND avoids
// the URL parser URL-decoding the password / mangling the Supabase pooler
// username (the "URL-decode trap"). Local Postgres doesn't speak SSL; remote
// (Supabase pooler / Render) requires it.
const options: DataSourceOptions = dbUrl
  ? {
      ...shared,
      url: dbUrl,
      ssl: /@(localhost|127\.0\.0\.1)/.test(dbUrl) || sslDisabled ? false : { rejectUnauthorized: false },
    }
  : {
      ...shared,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT ?? '5432', 10),
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: sslDisabled || isLocalHost(process.env.PGHOST) ? false : { rejectUnauthorized: false },
    };

export default new DataSource(options);
