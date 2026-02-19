// Script to fix doctors missing staff entries
// Run with: npx tsx src/scripts/fix-doctors.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDoctors() {
  console.log("\n=== Fixing doctors missing staff entries ===\n");

  // Get all doctors without staff entries
  const { data: doctors } = await supabase
    .from("users")
    .select("user_id, name, email")
    .eq("role", "doctor");

  if (!doctors || doctors.length === 0) {
    console.log("❌ No doctors found.\n");
    return;
  }

  const { data: existingStaff } = await supabase
    .from("staff")
    .select("doctor_id");

  const existingStaffIds = new Set((existingStaff || []).map(s => s.doctor_id));

  const doctorsToFix = doctors.filter(d => !existingStaffIds.has(d.user_id));

  if (doctorsToFix.length === 0) {
    console.log("✅ All doctors already have staff entries!\n");
    return;
  }

  console.log(`Found ${doctorsToFix.length} doctor(s) missing staff entries:\n`);

  for (const doctor of doctorsToFix) {
    console.log(`Creating staff entry for: ${doctor.name} (${doctor.email})...`);
    
    const { error } = await supabase.from("staff").insert({
      doctor_id: doctor.user_id,
      specialization: "General Medicine",
      shift_hours: 8,
      patients_handled_today: 0,
      is_available: true,
    });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Created staff entry`);
    }
  }

  console.log("\n✅ Done! All doctors now have staff entries.\n");
}

fixDoctors().catch(console.error);
