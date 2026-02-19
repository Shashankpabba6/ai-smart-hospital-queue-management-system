import { NextRequest, NextResponse } from "next/server";
import { sendDoctorNotification, sendPatientConfirmation, DoctorNotificationPayload } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body: DoctorNotificationPayload = await req.json();

    if (!body.doctorEmail || !body.patientName || !body.tokenNumber) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const doctorResult = await sendDoctorNotification(body);

    let patientResult: { success: boolean; simulated?: boolean; error?: string } | null = null;
    if (body.patientEmail) {
      patientResult = await sendPatientConfirmation({
        doctorName: body.doctorName,
        patientName: body.patientName,
        patientEmail: body.patientEmail,
        symptoms: body.symptoms,
        severityScore: body.severityScore,
        tokenNumber: body.tokenNumber,
        predictedWaitTime: body.predictedWaitTime,
      });
    }

    return NextResponse.json({
      success: doctorResult.success && (patientResult?.success ?? true),
      doctor: doctorResult,
      patient: patientResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[API notify-doctor]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
