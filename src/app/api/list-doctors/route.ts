import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseAdmin as supabase } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req, ["admin"]);
    if ("denied" in auth) return auth.denied;

    // Get all doctors
    const { data: doctors, error: usersError } = await supabase
      .from("users")
      .select("user_id, name, email, role, created_at")
      .eq("role", "doctor")
      .order("created_at", { ascending: true });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!doctors || doctors.length === 0) {
      return NextResponse.json({ doctors: [], message: "No doctors found" });
    }

    // Get staff entries
    const doctorIds = doctors.map(d => d.user_id);
    const { data: staffData } = await supabase
      .from("staff")
      .select("doctor_id, specialization, is_available, shift_hours, patients_handled_today")
      .in("doctor_id", doctorIds);

    const staffMap = new Map((staffData || []).map(s => [s.doctor_id, s]));

    // Get appointment counts
    const appointmentCounts = await Promise.all(
      doctors.map(async (doctor) => {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctor.user_id);
        return { doctor_id: doctor.user_id, count: count || 0 };
      })
    );

    const countsMap = new Map(appointmentCounts.map(a => [a.doctor_id, a.count]));

    const result = doctors.map(doctor => {
      const staff = staffMap.get(doctor.user_id);
      return {
        name: doctor.name,
        email: doctor.email,
        user_id: doctor.user_id,
        created_at: doctor.created_at,
        has_staff_entry: !!staff,
        specialization: staff?.specialization || "Not set",
        is_available: staff?.is_available ?? false,
        shift_hours: staff?.shift_hours || null,
        patients_handled_today: staff?.patients_handled_today || 0,
        total_appointments: countsMap.get(doctor.user_id) || 0,
      };
    });

    return NextResponse.json({
      doctors: result,
      summary: {
        total: doctors.length,
        with_staff_entry: staffData?.length || 0,
        available: staffData?.filter(s => s.is_available).length || 0,
        missing_staff_entry: doctors.filter(d => !staffMap.has(d.user_id)).length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
