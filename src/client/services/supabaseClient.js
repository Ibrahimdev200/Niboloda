import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qjidwqtwymzwvanknxue.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaWR3cXR3eW16d3ZhbmtueHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjY4ODYsImV4cCI6MjEwNDY0Mjg4Nn0.NZIuKa-uRbJBHycJdGePOWzk7c1MjmIAMTmHPEbQiDI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
