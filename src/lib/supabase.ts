import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  user_id: string;
  name: string;
  role: UserRole;
  email: string;
  created_at: string;
}

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string | null;
  symptoms: string | null;
  fever: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  spo2: number | null;
  age: number | null;
  severity_score: number;
  predicted_wait_time: number | null;
  token_number: number | null;
  status: "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show";
  queue_position: number | null;
  created_at: string;
  updated_at: string;
  patient?: User;
  doctor?: User;
}

export interface Resource {
  resource_id: string;
  total_beds: number;
  available_beds: number;
  icu_beds_total: number;
  icu_beds_available: number;
  ventilators_total: number;
  ventilators_available: number;
  wheelchairs_total: number;
  wheelchairs_available: number;
  xray_machines: number;
  xray_available: number;
  updated_at: string;
}

export interface Staff {
  doctor_id: string;
  specialization: string;
  shift_hours: number;
  patients_handled_today: number;
  is_available: boolean;
  doctor?: User;
}
