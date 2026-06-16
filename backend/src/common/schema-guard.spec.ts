import { DataSource } from 'typeorm';
import { assertSchemaReady } from './schema-guard';

const SENTINELS = ['users', 'farms', 'farm_members', 'ponds', 'crops'];

function dsReturning(tableNames: string[]): DataSource {
  return {
    query: jest.fn().mockResolvedValue(tableNames.map((t) => ({ table_name: t }))),
  } as unknown as DataSource;
}

describe('assertSchemaReady', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('resolves when all core tables are present', async () => {
    await expect(assertSchemaReady(dsReturning(SENTINELS))).resolves.toBeUndefined();
  });

  it('throws listing the missing tables', async () => {
    await expect(
      assertSchemaReady(dsReturning(['users', 'farms'])),
    ).rejects.toThrow(/missing core tables: farm_members, ponds, crops/);
  });

  it('throws when the database cannot be queried', async () => {
    const ds = {
      query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    } as unknown as DataSource;
    await expect(assertSchemaReady(ds)).rejects.toThrow('ECONNREFUSED');
  });
});
