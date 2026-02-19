"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase, Resource, Staff, User as HUser } from "@/lib/supabase";
import { Navbar } from "@/components/shared/Navbar";
import { calculateFatigue, getPeakHourData, getSeverityBadge } from "@/lib/ai";
import { toast } from "sonner";
import {
  BedDouble, Users, BarChart3, Settings, Activity, AlertTriangle, RefreshCw,
  Zap, TrendingUp, Stethoscope, CheckCircle, Clock, Edit3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

type StaffWithUser = Staff & { doctor?: HUser };

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resources, setResources] = useState<Resource | null>(null);
  const [staffList, setStaffList] = useState<StaffWithUser[]>([]);
  const [appointments, setAppointments] = useState<{ severity_score: number; status: string; created_at: string }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingBeds, setEditingBeds] = useState(false);
  const [availBeds, setAvailBeds] = useState(0);
  const [icuAvail, setIcuAvail] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [{ data: res }, { data: staff }, { data: appts }] = await Promise.all([
      supabase.from("resources").select("*").limit(1).single(),
      supabase.from("staff").select("*, doctor:doctor_id(name, email, role)").eq("is_available", true),
      supabase.from("appointments").select("severity_score, status, created_at").order("created_at", { ascending: false }).limit(200),
    ]);

    setResources(res as Resource);
    setAvailBeds(res?.available_beds || 0);
    setIcuAvail(res?.icu_beds_available || 0);
    setStaffList((staff as StaffWithUser[]) || []);
    setAppointments(appts || []);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role === "patient") { router.push("/patient/dashboard"); return; }
    if (user.role === "doctor") { router.push("/doctor/dashboard"); return; }
    fetchData();
  }, [user, loading, router, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveBeds = async () => {
    if (!resources) return;
    const { error } = await supabase.from("resources")
      .update({ available_beds: availBeds, icu_beds_available: icuAvail, updated_at: new Date().toISOString() })
      .eq("resource_id", resources.resource_id);
    if (!error) { toast.success("Resources updated"); fetchData(); setEditingBeds(false); }
    else toast.error("Update failed");
  };

  const toggleDoctorAvailability = async (doctorId: string, current: boolean) => {
    await supabase.from("staff").update({ is_available: !current }).eq("doctor_id", doctorId);
    toast.success(`Doctor ${current ? "set unavailable" : "set available"}`);
    fetchData();
  };

  const peakData = getPeakHourData(appointments);
  const severityDist = [1, 2, 3, 4, 5].map(s => ({
    name: ["", "Minimal", "Mild", "Moderate", "Severe", "Critical"][s],
    value: appointments.filter(a => a.severity_score === s).length,
    fill: ["", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"][s],
  }));
  const statusDist = [
    { name: "Waiting", value: appointments.filter(a => a.status === "waiting").length, fill: "#eab308" },
    { name: "In Consult", value: appointments.filter(a => a.status === "in_consultation").length, fill: "#3b82f6" },
    { name: "Completed", value: appointments.filter(a => a.status === "completed").length, fill: "#22c55e" },
    { name: "Cancelled", value: appointments.filter(a => a.status === "cancelled").length, fill: "#ef4444" },
    { name: "No Show", value: appointments.filter(a => a.status === "no_show").length, fill: "#6b7280" },
  ].filter(d => d.value > 0);

  const workloadData = staffList.map(s => ({
    name: (s.doctor as { name?: string })?.name?.split(" ")[1] || "Dr.",
    patients: s.patients_handled_today,
    fatigue: calculateFatigue({ patients_handled_today: s.patients_handled_today, avg_consultation_time: 8, shift_hours: s.shift_hours }).percentage,
  }));

  const bedUsePct = resources ? Math.round(((resources.total_beds - resources.available_beds) / resources.total_beds) * 100) : 0;
  const icuUsePct = resources ? Math.round(((resources.icu_beds_total - resources.icu_beds_available) / resources.icu_beds_total) * 100) : 0;

  const equipment = resources ? [
    { name: "Total Beds", total: resources.total_beds, available: resources.available_beds, icon: BedDouble },
    { name: "ICU Beds", total: resources.icu_beds_total, available: resources.icu_beds_available, icon: Activity },
    { name: "Ventilators", total: resources.ventilators_total, available: resources.ventilators_available, icon: Zap },
    { name: "Wheelchairs", total: resources.wheelchairs_total, available: resources.wheelchairs_available, icon: Users },
    { name: "X-Ray Machines", total: resources.xray_machines, available: resources.xray_available, icon: Activity },
  ] : [];

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-blue-300 text-sm mt-1">Hospital Resource &amp; Analytics Overview</p>
          </div>
          <Button variant="outline" onClick={fetchData} className="border-white/20 text-white hover:bg-white/10 gap-2">
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Bed Occupancy", value: `${bedUsePct}%`, sub: `${resources?.available_beds || 0} available`, color: bedUsePct > 80 ? "text-red-400" : "text-green-400", icon: BedDouble },
            { label: "ICU Occupancy", value: `${icuUsePct}%`, sub: `${resources?.icu_beds_available || 0} free`, color: icuUsePct > 80 ? "text-red-400" : "text-yellow-400", icon: Activity },
            { label: "Doctors Active", value: staffList.length, sub: "on shift", color: "text-blue-400", icon: Stethoscope },
            { label: "Total Appts", value: appointments.length, sub: "in system", color: "text-cyan-400", icon: BarChart3 },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-blue-300">{s.label}</div>
                  <div className="text-xs text-white/40">{s.sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="beds" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/10 p-1">
            <TabsTrigger value="beds" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-blue-300">
              <BedDouble className="w-4 h-4 mr-1.5" /> Beds &amp; Equipment
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-blue-300">
              <Users className="w-4 h-4 mr-1.5" /> Staff
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-blue-300">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* Beds & Equipment tab */}
          <TabsContent value="beds" className="space-y-6">
            {/* Quick edit */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-cyan-400" /> Bed Management
                </CardTitle>
                {!editingBeds ? (
                  <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1"
                    onClick={() => setEditingBeds(true)}>
                    <Edit3 className="w-4 h-4" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-blue-300" onClick={() => setEditingBeds(false)}>Cancel</Button>
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white border-0" onClick={saveBeds}>Save</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-blue-300">General Beds</span>
                      {editingBeds ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setAvailBeds(Math.max(0, availBeds - 1))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-center">-</button>
                          <span className="text-white font-semibold w-8 text-center">{availBeds}</span>
                          <button onClick={() => setAvailBeds(Math.min(resources?.total_beds || 100, availBeds + 1))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-center">+</button>
                        </div>
                      ) : (
                        <span className="text-white font-semibold">{resources?.available_beds}/{resources?.total_beds}</span>
                      )}
                    </div>
                    <Progress value={bedUsePct} className="h-3 bg-white/10" />
                    <div className="text-xs text-blue-400 mt-1">{bedUsePct}% occupied</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-blue-300">ICU Beds</span>
                      {editingBeds ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIcuAvail(Math.max(0, icuAvail - 1))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-center">-</button>
                          <span className="text-white font-semibold w-8 text-center">{icuAvail}</span>
                          <button onClick={() => setIcuAvail(Math.min(resources?.icu_beds_total || 20, icuAvail + 1))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white text-center">+</button>
                        </div>
                      ) : (
                        <span className="text-white font-semibold">{resources?.icu_beds_available}/{resources?.icu_beds_total}</span>
                      )}
                    </div>
                    <Progress value={icuUsePct} className="h-3 bg-white/10" />
                    <div className="text-xs text-blue-400 mt-1">{icuUsePct}% occupied</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map(eq => {
                const usePct = Math.round(((eq.total - eq.available) / eq.total) * 100);
                const critical = usePct > 80;
                return (
                  <Card key={eq.name} className={`border ${critical ? "border-orange-500/30 bg-orange-500/5" : "bg-white/5 border-white/10"}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <eq.icon className={`w-5 h-5 ${critical ? "text-orange-400" : "text-cyan-400"}`} />
                          <span className="font-medium text-sm text-white">{eq.name}</span>
                        </div>
                        {critical && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className={critical ? "text-orange-300" : "text-green-300"}>{eq.available} available</span>
                        <span className="text-blue-300">{eq.total} total</span>
                      </div>
                      <Progress value={usePct} className="h-2 bg-white/10" />
                      <div className="text-xs text-blue-400 mt-1">{usePct}% in use</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Staff tab */}
          <TabsContent value="staff" className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-cyan-400" /> Active Medical Staff
            </h2>
            {staffList.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center text-blue-300">No active doctors found.</CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {staffList.map(s => {
                  const fatigue = calculateFatigue({ patients_handled_today: s.patients_handled_today, avg_consultation_time: 8, shift_hours: s.shift_hours });
                  const docName = (s.doctor as { name?: string })?.name || "Doctor";
                  return (
                    <Card key={s.doctor_id} className={`border ${fatigue.alert ? "border-orange-500/30 bg-orange-500/5" : "bg-white/5 border-white/10"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">{docName}</span>
                              {fatigue.alert && <Badge className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" /> High Fatigue
                              </Badge>}
                            </div>
                            <div className="text-sm text-blue-300">{s.specialization}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => toggleDoctorAvailability(s.doctor_id, s.is_available)}
                            className={s.is_available ? "text-green-400 hover:bg-green-500/10 text-xs" : "text-red-400 hover:bg-red-500/10 text-xs"}>
                            {s.is_available ? "Available" : "Unavailable"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-lg font-bold text-cyan-400">{s.patients_handled_today}</div>
                            <div className="text-xs text-blue-300">Patients</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-lg font-bold text-blue-400">{s.shift_hours}h</div>
                            <div className="text-xs text-blue-300">Shift</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className={`text-lg font-bold ${fatigue.color}`}>{fatigue.status}</div>
                            <div className="text-xs text-blue-300">Fatigue</div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-blue-300 mb-1">
                            <span>Workload</span><span>{fatigue.percentage}%</span>
                          </div>
                          <Progress value={fatigue.percentage} className="h-2 bg-white/10" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Peak hours */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" /> Peak Hour Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={peakData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="hour" tick={{ fill: "#93c5fd", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#93c5fd", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                        {peakData.map((entry, index) => (
                          <Cell key={index} fill={entry.load >= 80 ? "#ef4444" : entry.load >= 60 ? "#f97316" : "#22d3ee"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-2 text-xs justify-center">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Normal</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> High</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Peak</span>
                  </div>
                </CardContent>
              </Card>

              {/* Severity distribution */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" /> Severity Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""} labelLine={false}>
                        {severityDist.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Doctor workload */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-cyan-400" /> Doctor Workload Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workloadData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-blue-300 text-sm">No staff data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={workloadData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fill: "#93c5fd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#93c5fd", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="patients" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Patients" />
                        <Bar dataKey="fatigue" fill="#f97316" radius={[4, 4, 0, 0]} name="Fatigue %" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Appointment status */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" /> Appointment Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                        {statusDist.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={(v) => <span className="text-xs text-blue-200">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Fatigue alerts table */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" /> Staff Fatigue Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffList.length === 0 ? (
                  <p className="text-blue-300 text-sm">No staff data available</p>
                ) : (
                  <div className="space-y-3">
                    {staffList.map(s => {
                      const fatigue = calculateFatigue({ patients_handled_today: s.patients_handled_today, avg_consultation_time: 8, shift_hours: s.shift_hours });
                      return (
                        <div key={s.doctor_id} className="flex items-center gap-4">
                          <span className="text-sm text-white min-w-[120px]">{(s.doctor as { name?: string })?.name || "Doctor"}</span>
                          <Progress value={fatigue.percentage} className="flex-1 h-2 bg-white/10" />
                          <span className={`text-xs font-medium min-w-[60px] text-right ${fatigue.color}`}>{fatigue.status}</span>
                          {fatigue.alert && <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
