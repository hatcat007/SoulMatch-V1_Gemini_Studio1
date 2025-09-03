
import { createClient } from '@supabase/supabase-js';

// These credentials are provided for the sandbox environment.
const supabaseUrl = 'https://xumoylqsbzfxzjlptkvm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bW95bHFzYnpmeHpqbHB0a3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTYxMTQsImV4cCI6MjA3MjI5MjExNH0.vxhE1IIWa-yI9CQ8DP6rwWM0b6HY4z---5xtmj8jEm8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);