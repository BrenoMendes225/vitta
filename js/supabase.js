import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Substitua pelos seus valores do Supabase
const SUPABASE_URL = 'https://rqidagaiedwphjpglebk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A_bjBwFUTFj2XMPbXX9Fjw_HVl062a_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
