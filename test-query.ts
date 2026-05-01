import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: firmPlants, error: e1 } = await supabase.from('firm_plants').select('*');
  console.log('firmPlants:', firmPlants, 'error:', e1);
  
  const { data: firmProducts, error: e2 } = await supabase.from('firm_products').select('*');
  console.log('firmProducts:', firmProducts, 'error:', e2);
}

test();
