import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase Configuration - synced with backend/.env
const SUPABASE_URL = 'https://hporygudvkfoegxzsivt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3J5Z3Vkdmtmb2VneHpzaXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTQ5NzUsImV4cCI6MjA4NTE5MDk3NX0.UzR8k_53nERSiEMbYPF4eOVvYCDDaE6onNWGUptbInc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
