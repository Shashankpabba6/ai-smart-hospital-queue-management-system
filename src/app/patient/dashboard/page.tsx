"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase, Appointment } from "@/lib/supabase";
import { Navbar } from "@/components/shared/Navbar";
import { getSeverityBadge, predictNoShow } from "@/lib/ai";
import { Calendar, Clock, Hash, AlertTriangle, CheckCircle, XCircle, Activity, Plus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function PatientDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*, doctor:doctor_id(name, email)")
      .eq("patient_id", user.user_id)
      .order("created_at", { ascending: false });
    setAppointments((data as Appointment[]) || []);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role === "doctor") { router.push("/doctor/dashboard"); return; }
    if (user.role === "admin") { router.push("/admin/dashboard"); return; }
    fetchAppointments();
  }, [user, loading, router, fetchAppointments]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 10000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("appointment_id", id);
    if (!error) { toast.success("Appointment cancelled"); fetchAppointments(); }
    else toast.error("Could not cancel appointment");
  };

  const active = appointments.filter(a => ["waiting", "in_consultation"].includes(a.status));
  const past = appointments.filter(a => ["completed", "cancelled", "no_show"].includes(a.status));

  const statusIcon = (s: string) => {
    if (s === "waiting") return <Clock className="w-4 h-4 text-yellow-400" />;
    if (s === "in_consultation") return <Activity className="w-4 h-4 text-blue-400" />;
    if (s === "completed") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s === "cancelled") return <XCircle className="w-4 h-4 text-red-400" />;
    return <AlertTriangle className="w-4 h-4 text-orange-400" />;
  };

  const statusColors: Record<string, string> = {
    waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    in_consultation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    completed: "bg-green-500/20 text-green-300 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
    no_show: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950">
        <Navbar />
        <div className="flex items-center justify-center h-80 text-white animate-pulse">Loading your appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
            <p className="text-blue-300 mt-1">Your health dashboard</p>
          </div>
          <Link href="/patient/book">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2">
              <Plus className="w-4 h-4" /> Book Appointment
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active", value: active.length, color: "text-cyan-400", icon: Activity },
            { label: "Waiting", value: appointments.filter(a => a.status === "waiting").length, color: "text-yellow-400", icon: Clock },
            { label: "Completed", value: appointments.filter(a => a.status === "completed").length, color: "text-green-400", icon: CheckCircle },
            { label: "Total", value: appointments.length, color: "text-blue-400", icon: Calendar },
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

        {/* Active appointments */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Active Appointments
          </h2>
          {active.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center text-blue-300">
                No active appointments.
                <Link href="/patient/book" className="ml-2 text-cyan-400 hover:underline">Book one now</Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {active.map(appt => {
                const sev = getSeverityBadge(appt.severity_score);
                const noShow = predictNoShow({ queue_position: appt.queue_position || 1, predicted_wait_time: appt.predicted_wait_time || 30, severity_score: appt.severity_score });
                return (
                  <Card key={appt.appointment_id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center text-lg font-bold text-cyan-400">
                            #{appt.token_number || "–"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {statusIcon(appt.status)}
                              <Badge className={`capitalize text-xs ${statusColors[appt.status]}`}>{appt.status.replace("_", " ")}</Badge>
                              <Badge className={`text-xs ${sev.bg} ${sev.text}`}>Severity {appt.severity_score}: {sev.label}</Badge>
                            </div>
                            <p className="text-sm text-white font-medium">{appt.symptoms || "No symptoms noted"}</p>
                            <div className="flex gap-4 mt-1 text-xs text-blue-300">
                              <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Queue pos: {appt.queue_position || "–"}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Wait: ~{appt.predicted_wait_time || "–"} min</span>
                              {(appt.doctor as { name?: string })?.name && (
                                <span>Doctor: {(appt.doctor as { name?: string })?.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {noShow.risk === "High" && (
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                              No-show risk: {noShow.probability}%
                            </Badge>
                          )}
                          <div className="flex gap-2">
                            <Link href="/patient/queue">
                              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1 text-xs">
                                Track <ChevronRight className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost" onClick={() => cancelAppointment(appt.appointment_id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">Cancel</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Past appointments */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" /> Appointment History
            </h2>
            <div className="space-y-3">
              {past.map(appt => {
                const sev = getSeverityBadge(appt.severity_score);
                return (
                  <Card key={appt.appointment_id} className="bg-white/5 border-white/10 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(appt.status)}
                          <div>
                            <span className="text-sm text-white">{appt.symptoms || "No symptoms"}</span>
                            <div className="text-xs text-blue-300 mt-0.5">
                              {new Date(appt.created_at).toLocaleDateString()} · Token #{appt.token_number}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`capitalize text-xs ${statusColors[appt.status]}`}>{appt.status}</Badge>
                          <Badge className={`text-xs ${sev.bg} ${sev.text}`}>{sev.label}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
