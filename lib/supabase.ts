import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wcynjonfxpuqlyzlnxtq.supabase.co";
const supabaseAnonKey = "sb_publishable_At3c6VhzD9TF82c0QCrYbQ_94WHhy1A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);