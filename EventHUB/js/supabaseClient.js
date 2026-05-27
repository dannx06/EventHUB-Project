// EventHUB - Conexão com Supabase
// Cole aqui os dados do seu projeto Supabase.
// Project Settings > API > Project URL e anon/public key.

const SUPABASE_URL = 'SUA_URL';
const SUPABASE_KEY = 'SUA_ANON_KEY';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
