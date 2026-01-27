import { supabase } from './supabase';
import { Farm } from '../types/database';

export const FarmService = {
    async fetchFarms(): Promise<Farm[]> {
        const { data, error } = await supabase
            .from('farms')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching farms:', error);
            throw error;
        }

        return data || [];
    },

    async createFarm(farmData: Partial<Farm>): Promise<Farm | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('farms')
            .insert([
                { ...farmData, user_id: user.id }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating farm:', error);
            throw error;
        }

        return data;
    },

    async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm | null> {
        const { data, error } = await supabase
            .from('farms')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating farm:', error);
            throw error;
        }

        return data;
    },

    async deleteFarm(id: string): Promise<void> {
        const { error } = await supabase
            .from('farms')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting farm:', error);
            throw error;
        }
    }
};
