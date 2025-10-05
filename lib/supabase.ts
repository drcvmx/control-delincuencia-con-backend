// Archivo deprecado - mantener solo para compatibilidad temporal
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qfvariuypmrnkzycehux.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmFyaXV5cG1ybmt6eWNlaHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjQyNjMsImV4cCI6MjA2MjcwMDI2M30.teM08mimTCPplPYD0uAXZeFQ-8Zvn7sbGyidZI7D3ow";

// DEPRECADO: Usar apiService en su lugar
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createServerSupabaseClient = () => {
  console.warn('createServerSupabaseClient is deprecated. Use apiService instead.');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
};