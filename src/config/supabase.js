import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uvytsjfxoiilmdawsonj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2eXRzamZ4b2lpbG1kYXdzb25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjUzODQsImV4cCI6MjA2NDU0MTM4NH0.CYXBTqYTTlyviZKpxWhZYDpDfanDx-u4Xh_P6cnY-zE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
