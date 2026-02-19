"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase, Appointment, Staff } from "@/lib/supabase";
import { Navbar } from "@/components/shared/Navbar";
import { getSeverityBadge, calculateFatigue, predictNoShow } from "@/lib/ai";
import { toast } from "sonner";
import {
  Users, Clock, CheckCircle, Activity, RefreshCw, Stethoscope, AlertTriangle, Zap, Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type AppointmentWithPatient = Appointment & { patient?: { name?: string; email?: string } | null };

export default function DoctorDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<AppointmentWithPatient[]>([]);
  const [staffInfo, setStaffInfo] = useState<Staff | null>(null);
  const [fetching, setFetching] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: appts, error: apptError } = await supabase
      .from("appointments")
      .select("*, patient:patient_id(name, email)")
      .eq("doctor_id", user.user_id)
      .in("status", ["waiting", "in_consultation"])
      .order("severity_score", { ascending: false })
      .order("queue_position", { ascending: true });

    let enrichedAppts = (appts as AppointmentWithPatient[]) || [];

    if (apptError) {
      console.error("Failed to fetch appointments with join, trying without join:", apptError);
      const { data: rawAppts } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", user.user_id)
        .in("status", ["waiting", "in_consultation"])
        .order("severity_score", { ascending: false })
        .order("queue_position", { ascending: true });

      if (rawAppts && rawAppts.length > 0) {
        const patientIds = [...new Set(rawAppts.map(a => a.patient_id))];
        const { data: patients } = await supabase
          .from("users")
          .select("user_id, name, email")
          .in("user_id", patientIds);

        const patientMap = new Map((patients || []).map(p => [p.user_id, { name: p.name, email: p.email }]));
        enrichedAppts = rawAppts.map(a => ({
          ...a,
          patient: patientMap.get(a.patient_id) || null,
        })) as AppointmentWithPatient[];
      }
    }

    const hasPatientNames = enrichedAppts.some(a => a.patient?.name);
    if (!hasPatientNames && enrichedAppts.length > 0) {
      const patientIds = [...new Set(enrichedAppts.map(a => a.patient_id))];
      const { data: patients } = await supabase
        .from("users")
        .select("user_id, name, email")
        .in("user_id", patientIds);

      if (patients && patients.length > 0) {
        const patientMap = new Map(patients.map(p => [p.user_id, { name: p.name, email: p.email }]));
        enrichedAppts = enrichedAppts.map(a => ({
          ...a,
          patient: patientMap.get(a.patient_id) || a.patient,
        })) as AppointmentWithPatient[];
      }
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("*")
      .eq("doctor_id", user.user_id)
      .single();

    setQueue(enrichedAppts);
    setStaffInfo(staff as Staff);
    setLastUpdated(new Date());
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role === "patient") { router.push("/patient/dashboard"); return; }
    if (user.role === "admin") { router.push("/admin/dashboard"); return; }
    fetchData();
  }, [user, loading, router, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const markStatus = async (id: string, status: "in_consultation" | "completed") => {
    const { error } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("appointment_id", id);

    if (error) { toast.error("Update failed"); return; }

    if (status === "completed" && staffInfo) {
      await supabase.from("staff")
        .update({ patients_handled_today: (staffInfo.patients_handled_today || 0) + 1 })
        .eq("doctor_id", user!.user_id);
    }
    toast.success(status === "completed" ? "Consultation marked complete" : "Patient called in");
    fetchData();
  };

  const markNoShow = async (id: string) => {
    await supabase.from("appointments").update({ status: "no_show", updated_at: new Date().toISOString() }).eq("appointment_id", id);
    toast.info("Marked as no-show");
    fetchData();
  };

  const fatigue = staffInfo ? calculateFatigue({
    patients_handled_today: staffInfo.patients_handled_today,
    avg_consultation_time: 8,
    shift_hours: staffInfo.shift_hours,
  }) : null;

  const statusColors: Record<string, string> = {
    waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    in_consultation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };

  const completedToday = staffInfo?.patients_handled_today || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
            <p className="text-blue-300 text-sm mt-1">Dr. {user?.name} · {staffInfo?.specialization || "General"}</p>
          </div>
          <Button variant="outline" onClick={fetchData} className="border-white/20 text-white hover:bg-white/10 gap-2">
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "In Queue", value: queue.filter(a => a.status === "waiting").length, color: "text-yellow-400", icon: Users },
            { label: "In Consultation", value: queue.filter(a => a.status === "in_consultation").length, color: "text-blue-400", icon: Activity },
            { label: "Completed Today", value: completedToday, color: "text-green-400", icon: CheckCircle },
            { label: "Avg Wait", value: `${queue.length * 8}m`, color: "text-cyan-400", icon: Clock },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-blue-300">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fatigue alert */}
        {fatigue && (
          <Card className={`mb-6 border ${fatigue.alert ? "border-orange-500/40 bg-orange-500/10" : "bg-white/5 border-white/10"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className={`w-5 h-5 ${fatigue.color}`} />
                  <span className="font-semibold text-white">Staff Fatigue Index</span>
                  {fatigue.alert && <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">Alert</Badge>}
                </div>
                <span className={`text-lg font-bold ${fatigue.color}`}>{fatigue.status}</span>
              </div>
              <Progress value={fatigue.percentage} className="h-3 bg-white/10 mb-2" />
              <div className="flex justify-between text-xs text-blue-300">
                <span>{fatigue.percentage}% workload capacity used</span>
                <span>Score: {fatigue.fatigue_score} · Shift: {staffInfo?.shift_hours}h</span>
              </div>
              {fatigue.alert && (
                <p className="text-sm text-orange-300 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Workload is high — consider requesting support or extending break time
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patient queue */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-cyan-400" /> Today's Patient Queue
            <span className="text-sm font-normal text-blue-400 ml-1">(sorted by severity)</span>
          </h2>

          {queue.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-blue-300">Queue is clear — no waiting patients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {queue.map((appt, idx) => {
                const sev = getSeverityBadge(appt.severity_score);
                const noShow = predictNoShow({
                  queue_position: idx + 1,
                  predicted_wait_time: appt.predicted_wait_time || 30,
                  severity_score: appt.severity_score,
                });
                const patientData = appt.patient as { name?: string; email?: string } | null;
                const patientName = patientData?.name || "Patient";
                const patientEmail = patientData?.email || "";
                const isActive = appt.status === "in_consultation";

                return (
                  <Card key={appt.appointment_id}
                    className={`border transition-all ${isActive ? "border-blue-500/40 bg-blue-500/5" : appt.severity_score >= 4 ? "border-red-500/30 bg-red-500/5" : "bg-white/5 border-white/10"}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Position + token */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">#{idx + 1}</div>
                            <div className="text-xs text-blue-300">Position</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-cyan-400">T{appt.token_number}</div>
                            <div className="text-xs text-blue-300">Token</div>
                          </div>
                        </div>

                        {/* Patient info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-white">{patientName}</span>
                            <Badge className={`${sev.bg} ${sev.text} text-xs`}>
                              Severity {appt.severity_score}: {sev.label}
                            </Badge>
                            <Badge className={`capitalize text-xs ${statusColors[appt.status]}`}>
                              {appt.status.replace("_", " ")}
                            </Badge>
                            {appt.severity_score >= 4 && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Priority
                              </Badge>
                            )}
                          </div>
                          {patientEmail && (
                            <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {patientEmail}
                            </p>
                          )}
                          <p className="text-sm text-blue-200 mb-1">{appt.symptoms || "No symptoms recorded"}</p>
                          <div className="flex gap-4 text-xs text-blue-300 flex-wrap">
                            {appt.fever && <span>Fever: {appt.fever}°C</span>}
                            {appt.blood_pressure_systolic && <span>BP: {appt.blood_pressure_systolic}/{appt.blood_pressure_diastolic}</span>}
                            {appt.spo2 && <span>SpO2: {appt.spo2}%</span>}
                            {appt.age && <span>Age: {appt.age}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{appt.predicted_wait_time || 8} min wait</span>
                          </div>
                        </div>

                        {/* AI insights */}
                        <div className="flex flex-col gap-2 items-end">
                          {noShow.risk !== "Low" && (
                            <Badge className={`text-xs ${noShow.risk === "High" ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"}`}>
                              No-show risk: {noShow.risk} ({noShow.probability}%)
                            </Badge>
                          )}
                          <div className="flex gap-2 flex-wrap justify-end">
                            {!isActive && (
                              <Button size="sm" onClick={() => markStatus(appt.appointment_id, "in_consultation")}
                                className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-xs gap-1">
                                <Activity className="w-3 h-3" /> Call In
                              </Button>
                            )}
                            <Button size="sm" onClick={() => markStatus(appt.appointment_id, "completed")}
                              className="bg-green-600 hover:bg-green-500 text-white border-0 text-xs gap-1">
                              <CheckCircle className="w-3 h-3" /> Done
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => markNoShow(appt.appointment_id)}
                              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs">
                              No-show
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Vitals bar */}
                      {(appt.fever || appt.spo2 || appt.blood_pressure_systolic) && (
                        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-blue-300 mb-1">Fever</div>
                            <div className={`text-sm font-bold ${(appt.fever || 0) >= 39 ? "text-red-400" : "text-green-400"}`}>
                              {appt.fever ? `${appt.fever}°C` : "–"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-blue-300 mb-1">SpO2</div>
                            <div className={`text-sm font-bold ${(appt.spo2 || 100) < 94 ? "text-red-400" : "text-green-400"}`}>
                              {appt.spo2 ? `${appt.spo2}%` : "–"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-blue-300 mb-1">Blood Pressure</div>
                            <div className={`text-sm font-bold ${(appt.blood_pressure_systolic || 120) >= 160 ? "text-red-400" : "text-green-400"}`}>
                              {appt.blood_pressure_systolic ? `${appt.blood_pressure_systolic}/${appt.blood_pressure_diastolic}` : "–"}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Last updated */}
        <p className="text-center text-blue-400 text-xs mt-8">
          Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 8s
        </p>
      </div>
    </div>
  );
}
