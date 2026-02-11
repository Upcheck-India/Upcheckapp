import { synchronize } from '@nozbe/watermelondb/sync';
import database from '../../database';
import { supabase } from '../supabase';

export async function sync() {
    if (!database) {
        console.warn('Sync skipped: WatermelonDB not available (Expo Go).');
        return;
    }
    await synchronize({
        database,
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            const timestamp = lastPulledAt || 0;

            // Helper to fetch changes for a table
            const fetchChanges = async (table: string) => {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .gt('updated_at', new Date(timestamp).toISOString());

                if (error) throw error;

                return {
                    created: data?.filter((r: any) => new Date(r.created_at).getTime() > timestamp) || [],
                    updated: data?.filter((r: any) => new Date(r.created_at).getTime() <= timestamp) || [],
                    deleted: [], // TODO: Handle soft deletes
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
        pushChanges: async ({ changes, lastPulledAt }) => {
            const syncChanges = changes as any;
            // Helper to push changes
            const pushTable = async (table: string, created: any[], updated: any[], deleted: any[]) => {
                if (created.length > 0) {
                    const { error } = await supabase.from(table).insert(created.map(r => {
                        const { _status, _changed, ...rest } = r; // Remove Watermelon internal fields
                        return rest;
                    }));
                    if (error) throw error;
                }
                if (updated.length > 0) {
                    for (const record of updated) {
                        const { _status, _changed, ...rest } = record;
                        const { error } = await supabase.from(table).update(rest).eq('id', rest.id);
                        if (error) throw error;
                    }
                }
                // TODO: deleted
            };

            await Promise.all([
                pushTable('ponds', syncChanges.ponds.created, syncChanges.ponds.updated, syncChanges.ponds.deleted),
                pushTable('crops', syncChanges.crops.created, syncChanges.crops.updated, syncChanges.crops.deleted),
                pushTable('chemical_data', syncChanges.chemical_data.created, syncChanges.chemical_data.updated, syncChanges.chemical_data.deleted),
                pushTable('plankton_data', syncChanges.plankton_data.created, syncChanges.plankton_data.updated, syncChanges.plankton_data.deleted),
                pushTable('microbiology_data', syncChanges.microbiology_data.created, syncChanges.microbiology_data.updated, syncChanges.microbiology_data.deleted),
                pushTable('mortality_records', syncChanges.mortality_records.created, syncChanges.mortality_records.updated, syncChanges.mortality_records.deleted),
                pushTable('disease_records', syncChanges.disease_records.created, syncChanges.disease_records.updated, syncChanges.disease_records.deleted),
            ]);
        },
    });
}
