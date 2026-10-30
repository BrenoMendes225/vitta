import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Substitua pelos seus valores do Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
