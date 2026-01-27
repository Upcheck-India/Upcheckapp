import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://ncsjoymktfeevhxbfwfn.supabase.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc2pveW1rdGZlZXZoeGJmd2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTIxMTksImV4cCI6MjA4NDk4ODExOX0.W6-wwSeuR7DY5i_MH_tNQLpTkc0T1ym25VobCZuJLGc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
