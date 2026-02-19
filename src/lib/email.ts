const SEVERITY_LABELS = ["", "Minimal", "Mild", "Moderate", "Severe", "Critical"];
const SEVERITY_COLORS = ["", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export interface DoctorNotificationPayload {
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  symptoms: string;
  severityScore: number;
  tokenNumber: number;
  predictedWaitTime: number | null;
  fever?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  spo2?: number | null;
  age?: number | null;
}

export interface PatientNotificationPayload {
  doctorName: string;
  patientName: string;
  patientEmail: string;
  symptoms: string;
  severityScore: number;
  tokenNumber: number;
  predictedWaitTime: number | null;
}

export function buildDoctorEmailHtml(payload: DoctorNotificationPayload): string {
  const { doctorName, patientName, patientEmail, symptoms, severityScore, tokenNumber, predictedWaitTime, fever, bloodPressureSystolic, bloodPressureDiastolic, spo2, age } = payload;

  const vitalsRows = [
    fever ? `<tr><td style="padding:6px 12px;color:#93c5fd;">Temperature</td><td style="padding:6px 12px;font-weight:bold;color:${(fever >= 39) ? '#ef4444' : '#22c55e'}">${fever}°C</td></tr>` : "",
    bloodPressureSystolic ? `<tr><td style="padding:6px 12px;color:#93c5fd;">Blood Pressure</td><td style="padding:6px 12px;font-weight:bold;color:${(bloodPressureSystolic >= 160) ? '#ef4444' : '#22c55e'}">${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg</td></tr>` : "",
    spo2 ? `<tr><td style="padding:6px 12px;color:#93c5fd;">SpO2</td><td style="padding:6px 12px;font-weight:bold;color:${(spo2 < 94) ? '#ef4444' : '#22c55e'}">${spo2}%</td></tr>` : "",
    age ? `<tr><td style="padding:6px 12px;color:#93c5fd;">Age</td><td style="padding:6px 12px;font-weight:bold;color:white">${age} years</td></tr>` : "",
  ].filter(Boolean).join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
    <div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);padding:24px 32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;color:white;">&#x1F3E5; MediQueue AI</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">New Patient Appointment Notification</p>
    </div>
    <div style="padding:32px;">
      <p style="color:white;font-size:16px;margin:0 0 16px;">Hello Dr. ${doctorName},</p>
      <p style="color:#93c5fd;font-size:14px;margin:0 0 24px;">A new patient has been assigned to your queue. Please review the details below:</p>
      
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin:0 0 20px;">
        <h3 style="color:#22d3ee;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Patient Details</h3>
        <p style="color:white;margin:0 0 6px;font-size:16px;font-weight:bold;">${patientName}</p>
        <p style="color:#93c5fd;margin:0 0 12px;font-size:13px;">${patientEmail}</p>
        <div style="display:flex;gap:12px;">
          <span style="background:rgba(6,182,212,0.2);color:#22d3ee;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:bold;">Token #${tokenNumber}</span>
          <span style="background:${SEVERITY_COLORS[severityScore]}22;color:${SEVERITY_COLORS[severityScore]};padding:4px 12px;border-radius:6px;font-size:13px;font-weight:bold;">Severity: ${SEVERITY_LABELS[severityScore]} (${severityScore}/5)</span>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin:0 0 20px;">
        <h3 style="color:#22d3ee;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Symptoms</h3>
        <p style="color:white;margin:0;font-size:14px;">${symptoms || "Not specified"}</p>
      </div>

      ${vitalsRows ? `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;margin:0 0 20px;">
        <h3 style="color:#22d3ee;margin:0;padding:16px 20px 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Vitals</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${vitalsRows}
        </table>
        <div style="height:12px;"></div>
      </div>` : ""}

      ${predictedWaitTime ? `
      <div style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:8px;padding:16px 20px;margin:0 0 24px;text-align:center;">
        <p style="color:#93c5fd;margin:0 0 4px;font-size:13px;">Estimated Wait Time</p>
        <p style="color:white;margin:0;font-size:24px;font-weight:bold;">~${predictedWaitTime} minutes</p>
      </div>` : ""}

      <p style="color:#64748b;font-size:12px;margin:24px 0 0;text-align:center;">
        This is an automated notification from MediQueue AI. Please check your dashboard for full details.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendDoctorNotification(payload: DoctorNotificationPayload): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "MediQueue AI <noreply@mediqueue.ai>";

  if (!apiKey) {
    console.log(`[Email] No RESEND_API_KEY set. Simulating email to ${payload.doctorEmail}`);
    console.log(`[Email] Subject: New Patient Assigned - Token #${payload.tokenNumber}`);
    console.log(`[Email] To enable real emails, add RESEND_API_KEY to your .env.local`);
    return { success: true, simulated: true };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend") as { Resend: new (key: string) => { emails: { send: (opts: { from: string; to: string; subject: string; html: string }) => Promise<unknown> } } };
    const resend = new Resend(apiKey);

    const html = buildDoctorEmailHtml(payload);

    await resend.emails.send({
      from: fromEmail,
      to: payload.doctorEmail,
      subject: `New Patient Assigned - Token #${payload.tokenNumber} (Severity: ${SEVERITY_LABELS[payload.severityScore]})`,
      html,
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Failed to send:", msg);
    if (msg.includes("Cannot find module")) {
      console.log("[Email] Resend package not installed. Run: npm install resend");
      return { success: true, simulated: true };
    }
    return { success: false, error: msg };
  }
}

export function buildPatientEmailHtml(payload: PatientNotificationPayload): string {
  const { doctorName, patientName, symptoms, severityScore, tokenNumber, predictedWaitTime } = payload;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
    <div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);padding:24px 32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;color:white;">&#x1F3E5; MediQueue AI</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Your Appointment Is Confirmed</p>
    </div>
    <div style="padding:32px;">
      <p style="color:white;font-size:16px;margin:0 0 16px;">Hello ${patientName},</p>
      <p style="color:#93c5fd;font-size:14px;margin:0 0 16px;">
        Your appointment has been booked successfully with <strong>Dr. ${doctorName}</strong>.
      </p>

      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin:0 0 20px;">
        <h3 style="color:#22d3ee;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Appointment Details</h3>
        <p style="color:white;margin:0 0 8px;font-size:14px;">Doctor: Dr. ${doctorName}</p>
        <p style="color:white;margin:0 0 8px;font-size:14px;">Token Number: <strong>#${tokenNumber}</strong></p>
        <p style="color:white;margin:0 0 4px;font-size:14px;">Severity Score: <strong>${severityScore}/5</strong></p>
        ${predictedWaitTime ? `<p style="color:white;margin:0;font-size:14px;">Estimated Wait Time: <strong>~${predictedWaitTime} minutes</strong></p>` : ""}
      </div>

      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin:0 0 20px;">
        <h3 style="color:#22d3ee;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Provided Symptoms</h3>
        <p style="color:white;margin:0;font-size:14px;">${symptoms || "Not specified"}</p>
      </div>

      <p style="color:#64748b;font-size:12px;margin:24px 0 0;text-align:center;">
        Please arrive a few minutes early and bring any previous medical records if available.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPatientConfirmation(payload: PatientNotificationPayload): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "MediQueue AI <noreply@mediqueue.ai>";

  if (!apiKey) {
    console.log(`[Email] No RESEND_API_KEY set. Simulating patient email to ${payload.patientEmail}`);
    console.log(`[Email] Subject: Appointment Confirmed - Token #${payload.tokenNumber}`);
    console.log(`[Email] To enable real emails, add RESEND_API_KEY to your .env.local`);
    return { success: true, simulated: true };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend") as { Resend: new (key: string) => { emails: { send: (opts: { from: string; to: string; subject: string; html: string }) => Promise<unknown> } } };
    const resend = new Resend(apiKey);

    const html = buildPatientEmailHtml(payload);

    await resend.emails.send({
      from: fromEmail,
      to: payload.patientEmail,
      subject: `Appointment Confirmed - Token #${payload.tokenNumber}`,
      html,
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Failed to send patient email:", msg);
    if (msg.includes("Cannot find module")) {
      console.log("[Email] Resend package not installed. Run: npm install resend");
      return { success: true, simulated: true };
    }
    return { success: false, error: msg };
  }
}
