"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase, Appointment } from "@/lib/supabase";
import { Navbar } from "@/components/shared/Navbar";
import { getSeverityBadge } from "@/lib/ai";
import { Clock, Hash, Activity, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function QueueStatusPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allWaiting, setAllWaiting] = useState<Appointment[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [fetching, setFetching] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: myAppts } = await supabase
      .from("appointments")
      .select("*, doctor:doctor_id(name)")
      .eq("patient_id", user.user_id)
      .in("status", ["waiting", "in_consultation"])
      .order("queue_position", { ascending: true });

    const { data: queueData } = await supabase
      .from("appointments")
      .select("appointment_id, queue_position, token_number, severity_score, status, patient_id")
      .in("status", ["waiting", "in_consultation"])
      .order("severity_score", { ascending: false })
      .order("queue_position", { ascending: true });

    setAppointments((myAppts as Appointment[]) || []);
    setAllWaiting((queueData as Appointment[]) || []);
    setLastUpdated(new Date());
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role === "doctor") { router.push("/doctor/dashboard"); return; }
    if (user.role === "admin") { router.push("/admin/dashboard"); return; }
    fetchData();
  }, [user, loading, router, fetchData]);

  // Real-time polling every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statusColors: Record<string, string> = {
    waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    in_consultation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Queue Status</h1>
            <p className="text-blue-300 text-sm mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Auto-refreshing · Last: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} className="border-white/20 text-white hover:bg-white/10 gap-2">
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* My appointments in queue */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> My Active Queue
          </h2>
          {appointments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center text-blue-300">
                You have no active appointments in queue.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map(appt => {
                const sev = getSeverityBadge(appt.severity_score);
                const positionInQueue = allWaiting.findIndex(a => a.appointment_id === appt.appointment_id) + 1;
                const progressPct = allWaiting.length > 0 ? Math.max(5, 100 - (positionInQueue / allWaiting.length) * 100) : 50;

                return (
                  <Card key={appt.appointment_id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="text-3xl font-bold text-cyan-400">#{appt.token_number}</div>
                            <Badge className={`capitalize ${statusColors[appt.status]}`}>{appt.status.replace("_", " ")}</Badge>
                            <Badge className={`${sev.bg} ${sev.text}`}>Severity {appt.severity_score}: {sev.label}</Badge>
                          </div>
                          {(appt.doctor as { name?: string })?.name && (
                            <p className="text-sm text-blue-300">Doctor: {(appt.doctor as { name?: string })?.name}</p>
                          )}
                        </div>
                        {appt.status === "in_consultation" && (
                          <div className="flex items-center gap-2 text-blue-400 text-sm animate-pulse">
                            <Activity className="w-4 h-4" /> In Consultation
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                          <Hash className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                          <div className="text-xl font-bold text-white">{positionInQueue || appt.queue_position || "–"}</div>
                          <div className="text-xs text-blue-300">Queue Position</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                          <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                          <div className="text-xl font-bold text-white">{appt.predicted_wait_time || "–"}</div>
                          <div className="text-xs text-blue-300">Est. Minutes</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                          <AlertTriangle className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                          <div className="text-xl font-bold text-white">{allWaiting.length}</div>
                          <div className="text-xs text-blue-300">Total in Queue</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-blue-300 mb-1.5">
                          <span>Queue progress</span>
                          <span>{Math.round(progressPct)}% ahead of you done</span>
                        </div>
                        <Progress value={progressPct} className="h-2 bg-white/10" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Live queue board */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-400" /> Live Queue Board
          </h2>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-0">
              {allWaiting.length === 0 ? (
                <div className="p-8 text-center text-blue-300">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  Queue is clear — no waiting patients
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {allWaiting.map((a, idx) => {
                    const sev = getSeverityBadge(a.severity_score);
                    const isMe = appointments.some(my => my.appointment_id === a.appointment_id);
                    return (
                      <div key={a.appointment_id}
                        className={`flex items-center gap-4 px-5 py-3 ${isMe ? "bg-cyan-500/10" : ""}`}>
                        <span className="w-7 text-center text-sm font-bold text-blue-400">{idx + 1}</span>
                        <span className="text-sm font-mono text-white">#{a.token_number}</span>
                        <Badge className={`text-xs ${sev.bg} ${sev.text}`}>{sev.label}</Badge>
                        <Badge className={`text-xs capitalize ${a.status === "in_consultation" ? "bg-blue-500/20 text-blue-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                          {a.status.replace("_", " ")}
                        </Badge>
                        {isMe && <Badge className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30 ml-auto">You</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
