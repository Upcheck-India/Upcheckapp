import { supabase } from './supabase';
import { Pond } from '../types/database';

export const PondService = {
    async fetchPonds(farmId: string): Promise<Pond[]> {
        const { data, error } = await supabase
            .from('ponds')
            .select('*')
            .eq('farm_id', farmId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ponds:', error);
            throw error;
        }

        return data || [];
    },

    async createPond(pondData: Partial<Pond>): Promise<Pond | null> {
        const { data, error } = await supabase
            .from('ponds')
            .insert([pondData])
            .select()
            .single();

        if (error) {
            console.error('Error creating pond:', error);
            throw error;
        }

        return data;
    },

    async updatePond(id: string, updates: Partial<Pond>): Promise<Pond | null> {
        const { data, error } = await supabase
            .from('ponds')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating pond:', error);
            throw error;
        }

        return data;
    },

    async deletePond(id: string): Promise<void> {
        const { error } = await supabase
            .from('ponds')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting pond:', error);
            throw error;
        }
    }
};
