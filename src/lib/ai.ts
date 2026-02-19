// AI Features - Pure TypeScript implementations

// ─── 1. Severity Prediction (Decision Tree logic) ────────────────────────────
export interface VitalsInput {
  fever: number; // Celsius
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number; // %
  age: number;
  symptoms?: string;
}

export interface SeverityResult {
  score: number; // 1–5
  label: string;
  color: string;
  explanation: string[];
}

export function predictSeverity(vitals: VitalsInput): SeverityResult {
  const reasons: string[] = [];
  let points = 0;

  // Fever scoring
  if (vitals.fever >= 40) { points += 3; reasons.push(`Critical fever (${vitals.fever}°C ≥ 40°C)`); }
  else if (vitals.fever >= 39) { points += 2; reasons.push(`High fever (${vitals.fever}°C ≥ 39°C)`); }
  else if (vitals.fever >= 38) { points += 1; reasons.push(`Mild fever (${vitals.fever}°C ≥ 38°C)`); }

  // Blood pressure scoring
  if (vitals.systolic_bp >= 180 || vitals.systolic_bp < 80) { points += 3; reasons.push(`Dangerous BP (${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg)`); }
  else if (vitals.systolic_bp >= 160) { points += 2; reasons.push(`High BP (${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg)`); }
  else if (vitals.systolic_bp >= 140) { points += 1; reasons.push(`Elevated BP (${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg)`); }

  // SpO2 scoring
  if (vitals.spo2 < 90) { points += 4; reasons.push(`Critical SpO2 (${vitals.spo2}% < 90%)`); }
  else if (vitals.spo2 < 94) { points += 2; reasons.push(`Low SpO2 (${vitals.spo2}% < 94%)`); }
  else if (vitals.spo2 < 96) { points += 1; reasons.push(`Below normal SpO2 (${vitals.spo2}%)`); }

  // Age scoring
  if (vitals.age >= 75) { points += 2; reasons.push(`Advanced age (${vitals.age} years)`); }
  else if (vitals.age >= 60) { points += 1; reasons.push(`Elderly patient (${vitals.age} years)`); }
  else if (vitals.age <= 5) { points += 2; reasons.push(`Very young patient (${vitals.age} years)`); }

  // Symptom keywords
  const symptomsLower = (vitals.symptoms || "").toLowerCase();
  const criticalKeywords = ["chest pain", "breathing difficulty", "unconscious", "severe bleeding", "stroke", "heart attack"];
  const seriousKeywords = ["shortness of breath", "high fever", "severe pain", "vomiting blood", "confusion"];
  if (criticalKeywords.some(k => symptomsLower.includes(k))) {
    points += 3;
    reasons.push("Critical symptom keyword detected");
  } else if (seriousKeywords.some(k => symptomsLower.includes(k))) {
    points += 2;
    reasons.push("Serious symptom keyword detected");
  }

  // Map points to 1–5 score
  let score: number;
  if (points >= 10) score = 5;
  else if (points >= 7) score = 4;
  else if (points >= 4) score = 3;
  else if (points >= 2) score = 2;
  else score = 1;

  const labels = ["", "Minimal", "Mild", "Moderate", "Severe", "Critical"];
  const colors = ["", "text-green-600", "text-lime-600", "text-yellow-600", "text-orange-600", "text-red-600"];
  const bgColors = ["", "bg-green-100", "bg-lime-100", "bg-yellow-100", "bg-orange-100", "bg-red-100"];

  return {
    score,
    label: labels[score],
    color: colors[score],
    explanation: reasons.length > 0 ? reasons : ["Normal vitals — low severity"],
  };
}

// ─── 2. Waiting Time Prediction (Linear Regression approximation) ─────────────
export interface QueueInput {
  patients_in_queue: number;
  avg_consultation_time: number; // minutes
  emergency_cases: number;
  severity_score: number; // patient's own severity
}

export function predictWaitingTime(input: QueueInput): number {
  // Each patient takes avg_consultation_time minutes
  // Emergency cases jump queue (reduce their wait; increases others by 10min each)
  const base = (input.patients_in_queue - input.emergency_cases) * input.avg_consultation_time;
  const emergencyImpact = input.emergency_cases * 10;
  // High severity patients wait less (they get bumped up)
  const severityBonus = (5 - input.severity_score) * input.avg_consultation_time;
  const predicted = Math.max(0, base + emergencyImpact - (5 - input.severity_score) * 5);
  return Math.round(predicted + severityBonus * 0.2);
}

// ─── 3. Staff Fatigue Index ───────────────────────────────────────────────────
export interface FatigueInput {
  patients_handled_today: number;
  avg_consultation_time: number; // minutes
  shift_hours: number;
}

export interface FatigueResult {
  fatigue_score: number;
  percentage: number; // 0–100
  status: "Normal" | "Moderate" | "High" | "Critical";
  color: string;
  alert: boolean;
}

export function calculateFatigue(input: FatigueInput): FatigueResult {
  const threshold = input.shift_hours * 60; // total minutes in shift
  const actual = input.patients_handled_today * input.avg_consultation_time;
  const fatigue_score = parseFloat((actual / input.shift_hours).toFixed(2));
  const percentage = Math.min(100, Math.round((actual / threshold) * 100));

  let status: FatigueResult["status"];
  let color: string;
  if (percentage >= 90) { status = "Critical"; color = "text-red-600"; }
  else if (percentage >= 70) { status = "High"; color = "text-orange-600"; }
  else if (percentage >= 50) { status = "Moderate"; color = "text-yellow-600"; }
  else { status = "Normal"; color = "text-green-600"; }

  return {
    fatigue_score,
    percentage,
    status,
    color,
    alert: percentage >= 70,
  };
}

// ─── 4. No-show prediction ────────────────────────────────────────────────────
export function predictNoShow(appointment: {
  queue_position: number;
  predicted_wait_time: number;
  severity_score: number;
}): { probability: number; risk: string } {
  // Simple heuristic: long waits + low severity = higher no-show risk
  let prob = 0;
  if (appointment.predicted_wait_time > 120) prob += 0.3;
  else if (appointment.predicted_wait_time > 60) prob += 0.15;
  if (appointment.severity_score <= 2) prob += 0.2;
  if (appointment.queue_position > 10) prob += 0.1;
  prob = Math.min(0.95, prob);
  const risk = prob >= 0.4 ? "High" : prob >= 0.2 ? "Medium" : "Low";
  return { probability: Math.round(prob * 100), risk };
}

// ─── Peak Hour Prediction ─────────────────────────────────────────────────────
export function getPeakHourData(): { hour: string; load: number }[] {
  return [
    { hour: "8 AM", load: 45 },
    { hour: "9 AM", load: 72 },
    { hour: "10 AM", load: 88 },
    { hour: "11 AM", load: 95 },
    { hour: "12 PM", load: 70 },
    { hour: "1 PM", load: 55 },
    { hour: "2 PM", load: 60 },
    { hour: "3 PM", load: 78 },
    { hour: "4 PM", load: 82 },
    { hour: "5 PM", load: 65 },
    { hour: "6 PM", load: 40 },
    { hour: "7 PM", load: 30 },
  ];
}

export function getSeverityBadge(score: number): { label: string; bg: string; text: string } {
  const map: Record<number, { label: string; bg: string; text: string }> = {
    1: { label: "Minimal", bg: "bg-green-100", text: "text-green-800" },
    2: { label: "Mild", bg: "bg-lime-100", text: "text-lime-800" },
    3: { label: "Moderate", bg: "bg-yellow-100", text: "text-yellow-800" },
    4: { label: "Severe", bg: "bg-orange-100", text: "text-orange-800" },
    5: { label: "Critical", bg: "bg-red-100", text: "text-red-800" },
  };
  return map[score] || map[1];
}
