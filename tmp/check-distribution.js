import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env.local
const envPath = path.resolve(".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkLeads() {
  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, city, assigned_firms, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (leadError) {
    console.error("Lead Error:", leadError);
    return;
  }

  for (const lead of leads) {
    console.log(`Lead ID: ${lead.id}, City: ${lead.city}, Created At: ${lead.created_at}`);
    if (lead.assigned_firms && lead.assigned_firms.length > 0) {
      const { data: firms, error: firmError } = await supabase
        .from("firms")
        .select("user_id, company_name, city, is_approved, is_active")
        .in("user_id", lead.assigned_firms);

      if (firmError) {
        console.error("Firm Error:", firmError);
      } else {
        firms.forEach(f => {
          console.log(`  -> Assigned Firm: ${f.company_name}, City: ${f.city}, Approved: ${f.is_approved}, Active: ${f.is_active}`);
        });
      }
    } else {
      console.log("  -> No firms assigned.");
    }
    console.log("---");
  }
}

checkLeads();
