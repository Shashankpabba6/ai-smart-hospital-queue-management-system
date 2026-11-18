// Script to list all doctors in the database
// Run with: npx tsx src/scripts/list-doctors.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listDoctors() {
  console.log("\n=== Fetching all doctors from database ===\n");

  // Get all users with doctor role
  const { data: doctors, error: usersError } = await supabase
    .from("users")
    .select("user_id, name, email, role, created_at")
    .eq("role", "doctor")
    .order("created_at", { ascending: true });

  if (usersError) {
    console.error("Error fetching doctors:", usersError);
    return;
  }

  if (!doctors || doctors.length === 0) {
    console.log("❌ No doctors found in the database.\n");
    console.log("To create a doctor:");
    console.log("1. Go to http://localhost:3000/auth/register");
    console.log("2. Select 'Doctor' role");
    console.log("3. Fill in details and select specialization\n");
    return;
  }

  // Get staff entries for each doctor
  const doctorIds = doctors.map(d => d.user_id);
  const { data: staffData } = await supabase
    .from("staff")
    .select("doctor_id, specialization, is_available, shift_hours, patients_handled_today")
    .in("doctor_id", doctorIds);

  const staffMap = new Map((staffData || []).map(s => [s.doctor_id, s]));

  console.log(`✅ Found ${doctors.length} doctor(s):\n`);
  console.log("─".repeat(80));

  doctors.forEach((doctor, index) => {
    const staff = staffMap.get(doctor.user_id);
    const hasStaffEntry = !!staff;
    const isAvailable = staff?.is_available ?? false;

    console.log(`\n${index + 1}. Doctor: ${doctor.name}`);
    console.log(`   Email: ${doctor.email}`);
    console.log(`   User ID: ${doctor.user_id}`);
    console.log(`   Created: ${new Date(doctor.created_at).toLocaleString()}`);
    
    if (hasStaffEntry) {
      console.log(`   ✅ Staff Entry: YES`);
      console.log(`   Specialization: ${staff.specialization}`);
      console.log(`   Shift Hours: ${staff.shift_hours}h`);
      console.log(`   Available: ${isAvailable ? "✅ YES" : "❌ NO"}`);
      console.log(`   Patients Handled Today: ${staff.patients_handled_today}`);
    } else {
      console.log(`   ⚠️  Staff Entry: MISSING (doctor won't appear in booking list)`);
    }

    // Check appointments for this doctor
    supabase
      .from("appointments")
      .select("appointment_id, patient_id, status, created_at", { count: "exact" })
      .eq("doctor_id", doctor.user_id)
      .then(({ count }) => {
        console.log(`   Appointments: ${count || 0} total`);
      });
  });

  console.log("\n" + "─".repeat(80));
  console.log("\n📋 Summary:");
  console.log(`   Total Doctors: ${doctors.length}`);
  console.log(`   With Staff Entry: ${staffData?.length || 0}`);
  console.log(`   Available: ${staffData?.filter(s => s.is_available).length || 0}`);
  
  const missingStaff = doctors.filter(d => !staffMap.has(d.user_id));
  if (missingStaff.length > 0) {
    console.log(`\n⚠️  WARNING: ${missingStaff.length} doctor(s) missing staff entries:`);
    missingStaff.forEach(d => {
      console.log(`   - ${d.name} (${d.email})`);
    });
    console.log("\n   These doctors won't appear in the booking list!");
    console.log("   Fix: Run the fix-doctors script or manually create staff entries.\n");
  }
}

listDoctors().catch(console.error);
