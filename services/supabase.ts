
import { createClient } from '@supabase/supabase-js';

// It's recommended to use environment variables for these
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://xumoylqsbzfxzjlptkvm.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bW95bHFzYnpmeHpqbHB0a3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTYxMTQsImV4cCI6MjA3MjI5MjExNH0.vxhE1IIWa-yI9CQ8DP6rwWM0b6HY4z---5xtmj8jEm8';

// In a real app, you would check if the URL and key are provided.
// For this example, we'll proceed with placeholder values which will not connect.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
