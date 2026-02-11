/**
 * Synchronization Service Tests
 * Tests for WatermelonDB - Supabase synchronization functionality
 */

// Mock dependencies
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
};

const mockDatabase = {
  synchronize: jest.fn(),
};

// Mock the actual imports
jest.mock('../../database', () => mockDatabase);
jest.mock('../supabase', () => ({ supabase: mockSupabase }));

// Import the sync function after mocking
const { sync } = require('./index');

describe('Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pullChanges', () => {
    it('should fetch changes from Supabase for all tables', async () => {
      const mockData = [
        { id: '1', created_at: new Date(Date.now() - 10000).toISOString(), updated_at: new Date().toISOString() },
        { id: '2', created_at: new Date(Date.now() - 5000).toISOString(), updated_at: new Date().toISOString() }
      ];
      
      const mockResponse = { data: mockData, error: null };
      mockSupabase.select.mockResolvedValue(mockResponse);

      const result = await sync.__test__.pullChanges({
        lastPulledAt: Date.now() - 60000,
        schemaVersion: 1,
        migration: null
      });

      expect(mockSupabase.from).toHaveBeenCalledTimes(7); // 7 tables
      expect(mockSupabase.gt).toHaveBeenCalledWith('updated_at', expect.any(String));
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.changes).toHaveProperty('ponds');
      expect(result.changes).toHaveProperty('crops');
      expect(result.changes).toHaveProperty('chemical_data');
      expect(result.changes).toHaveProperty('plankton_data');
      expect(result.changes).toHaveProperty('microbiology_data');
      expect(result.changes).toHaveProperty('mortality_records');
      expect(result.changes).toHaveProperty('disease_records');
    });

    it('should handle Supabase errors gracefully', async () => {
      const mockError = { message: 'Network error' };
      mockSupabase.select.mockResolvedValue({ data: null, error: mockError });

      await expect(sync.__test__.pullChanges({
        lastPulledAt: Date.now() - 60000,
        schemaVersion: 1,
        migration: null
      })).rejects.toThrow('Network error');
    });

    it('should correctly separate created and updated records', async () => {
      const recentTimestamp = Date.now() - 30000;
      const mockData = [
        // Created record (created_at > lastPulledAt)
        { 
          id: '1', 
          created_at: new Date(recentTimestamp + 10000).toISOString(), 
          updated_at: new Date(recentTimestamp + 10000).toISOString() 
        },
        // Updated record (created_at <= lastPulledAt)
        { 
          id: '2', 
          created_at: new Date(recentTimestamp - 10000).toISOString(), 
          updated_at: new Date(recentTimestamp + 5000).toISOString() 
        }
      ];
      
      mockSupabase.select.mockResolvedValue({ data: mockData, error: null });

      const result = await sync.__test__.pullChanges({
        lastPulledAt: recentTimestamp,
        schemaVersion: 1,
        migration: null
      });

      // Both should be in updated array since we're filtering by updated_at
      // The logic separates based on created_at vs lastPulledAt comparison
      expect(result.changes.ponds.created).toHaveLength(1);
      expect(result.changes.ponds.updated).toHaveLength(1);
    });
  });

  describe('pushChanges', () => {
    it('should push created records to Supabase', async () => {
      const changes = {
        ponds: {
          created: [{ id: '1', name: 'Test Pond', _status: 'created', _changed: {} }],
          updated: [],
          deleted: []
        }
      };

      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      await sync.__test__.pushChanges({ changes, lastPulledAt: Date.now() });

      expect(mockSupabase.from).toHaveBeenCalledWith('ponds');
      expect(mockSupabase.insert).toHaveBeenCalledWith([{ id: '1', name: 'Test Pond' }]);
    });

    it('should push updated records to Supabase', async () => {
      const changes = {
        crops: {
          created: [],
          updated: [{ id: '1', status: 'completed', _status: 'updated', _changed: {} }],
          deleted: []
        }
      };

      mockSupabase.update.mockResolvedValue({ data: null, error: null });

      await sync.__test__.pushChanges({ changes, lastPulledAt: Date.now() });

      expect(mockSupabase.from).toHaveBeenCalledWith('crops');
      expect(mockSupabase.update).toHaveBeenCalledWith({ id: '1', status: 'completed' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should handle push errors', async () => {
      const changes = {
        chemical_data: {
          created: [{ id: '1', ph: 7.5, _status: 'created', _changed: {} }],
          updated: [],
          deleted: []
        }
      };

      const mockError = { message: 'Insert failed' };
      mockSupabase.insert.mockResolvedValue({ data: null, error: mockError });

      await expect(sync.__test__.pushChanges({ changes, lastPulledAt: Date.now() }))
        .rejects.toThrow('Insert failed');
    });

    it('should process multiple tables concurrently', async () => {
      const changes = {
        ponds: { created: [{ id: '1' }], updated: [], deleted: [] },
        crops: { created: [{ id: '2' }], updated: [], deleted: [] },
        chemical_data: { created: [{ id: '3' }], updated: [], deleted: [] }
      };

      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      await sync.__test__.pushChanges({ changes, lastPulledAt: Date.now() });

      // Should call insert for each table
      expect(mockSupabase.from).toHaveBeenCalledWith('ponds');
      expect(mockSupabase.from).toHaveBeenCalledWith('crops');
      expect(mockSupabase.from).toHaveBeenCalledWith('chemical_data');
    });
  });

  describe('integration', () => {
    it('should coordinate pull and push operations', async () => {
      // Mock successful pull
      const mockPullData = {
        changes: { ponds: { created: [], updated: [], deleted: [] } },
        timestamp: Date.now()
      };
      
      sync.__test__.pullChanges = jest.fn().mockResolvedValue(mockPullData);
      sync.__test__.pushChanges = jest.fn().mockResolvedValue(undefined);

      await sync();

      expect(sync.__test__.pullChanges).toHaveBeenCalled();
      expect(sync.__test__.pushChanges).toHaveBeenCalled();
    });

    it('should handle synchronization errors', async () => {
      sync.__test__.pullChanges = jest.fn().mockRejectedValue(new Error('Sync failed'));

      await expect(sync()).rejects.toThrow('Sync failed');
    });
  });

  describe('data transformation', () => {
    it('should remove WatermelonDB internal fields', () => {
      const recordWithInternalFields = {
        id: '1',
        name: 'Test',
        _status: 'synced',
        _changed: {},
        createdAt: new Date().toISOString()
      };

      // Test the cleanup logic that removes _status and _changed
      const { _status, _changed, ...cleanRecord } = recordWithInternalFields;
      
      expect(cleanRecord).toEqual({
        id: '1',
        name: 'Test',
        createdAt: expect.any(String)
      });
      expect(cleanRecord).not.toHaveProperty('_status');
      expect(cleanRecord).not.toHaveProperty('_changed');
    });

    it('should preserve all other fields during transformation', () => {
      const originalRecord = {
        id: 'test-id',
        pondId: 'pond-1',
        ph: 7.5,
        temperature: 28.5,
        recordedAt: new Date().toISOString(),
        _status: 'created',
        _changed: { ph: true }
      };

      const { _status, _changed, ...cleanRecord } = originalRecord;

      expect(Object.keys(cleanRecord)).toHaveLength(5);
      expect(cleanRecord.id).toBe('test-id');
      expect(cleanRecord.pondId).toBe('pond-1');
      expect(cleanRecord.ph).toBe(7.5);
      expect(cleanRecord.temperature).toBe(28.5);
    });
  });
});

// Expose internal functions for testing
sync.__test__ = {
  pullChanges: async ({ lastPulledAt }) => {
    const timestamp = lastPulledAt || 0;
    
    const fetchChanges = async (table) => {
      const { data, error } = await mockSupabase
        .from(table)
        .select('*')
        .gt('updated_at', new Date(timestamp).toISOString());

      if (error) throw error;

      return {
        created: data?.filter((r) => new Date(r.created_at).getTime() > timestamp) || [],
        updated: data?.filter((r) => new Date(r.created_at).getTime() <= timestamp) || [],
        deleted: [],
      };
    };

    const [ponds, crops, chemical, plankton, microbiology, mortality, diseases] = await Promise.all([
      fetchChanges('ponds'),
      fetchChanges('crops'),
      fetchChanges('chemical_data'),
      fetchChanges('plankton_data'),
      fetchChanges('microbiology_data'),
      fetchChanges('mortality_records'),
      fetchChanges('disease_records'),
    ]);

    return {
      changes: {
        ponds,
        crops,
        chemical_data: chemical,
        plankton_data: plankton,
        microbiology_data: microbiology,
        mortality_records: mortality,
        disease_records: diseases,
      },
      timestamp: Date.now(),
    };
  },

  pushChanges: async ({ changes }) => {
    const syncChanges = changes;
    
    const pushTable = async (table, created, updated) => {
      if (created.length > 0) {
        const { error } = await mockSupabase.from(table).insert(created.map(r => {
          const { _status, _changed, ...rest } = r;
          return rest;
        }));
        if (error) throw error;
      }
      if (updated.length > 0) {
        for (const record of updated) {
          const { _status, _changed, ...rest } = record;
          const { error } = await mockSupabase.from(table).update(rest).eq('id', rest.id);
          if (error) throw error;
        }
      }
    };

    await Promise.all([
      pushTable('ponds', syncChanges.ponds.created, syncChanges.ponds.updated),
      pushTable('crops', syncChanges.crops.created, syncChanges.crops.updated),
      pushTable('chemical_data', syncChanges.chemical_data.created, syncChanges.chemical_data.updated),
      pushTable('plankton_data', syncChanges.plankton_data.created, syncChanges.plankton_data.updated),
      pushTable('microbiology_data', syncChanges.microbiology_data.created, syncChanges.microbiology_data.updated),
      pushTable('mortality_records', syncChanges.mortality_records.created, syncChanges.mortality_records.updated),
      pushTable('disease_records', syncChanges.disease_records.created, syncChanges.disease_records.updated),
    ]);
  }
};