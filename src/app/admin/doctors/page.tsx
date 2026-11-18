"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Stethoscope, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface DoctorInfo {
  name: string;
  email: string;
  user_id: string;
  created_at: string;
  has_staff_entry: boolean;
  specialization: string;
  is_available: boolean;
  shift_hours: number | null;
  patients_handled_today: number;
  total_appointments: number;
}

export default function DoctorsListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (user.role !== "admin") {
      router.push(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
      return;
    }
    fetchDoctors();
  }, [user, loading, router]);

  const fetchDoctors = async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/list-doctors", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setDoctors(data.doctors || []);
      setSummary(data.summary);
    } catch (error) {
      toast.error("Failed to fetch doctors");
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950">
        <Navbar />
        <div className="flex items-center justify-center h-80 text-white">Loading doctors...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">All Doctors</h1>
            <p className="text-blue-300 text-sm mt-1">Doctor accounts and credentials</p>
          </div>
          <Button variant="outline" onClick={fetchDoctors} className="border-white/20 text-white hover:bg-white/10 gap-2">
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-cyan-400">{summary.total}</div>
                <div className="text-xs text-blue-300">Total Doctors</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">{summary.with_staff_entry}</div>
                <div className="text-xs text-blue-300">With Staff Entry</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400">{summary.available}</div>
                <div className="text-xs text-blue-300">Available</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-400">{summary.missing_staff_entry}</div>
                <div className="text-xs text-blue-300">Missing Staff Entry</div>
              </CardContent>
            </Card>
          </div>
        )}

        {doctors.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center text-blue-300">
              No doctors found. Register doctors at <a href="/auth/register" className="text-cyan-400 hover:underline">/auth/register</a>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {doctors.map((doctor) => (
              <Card key={doctor.user_id} className={`bg-white/5 border ${doctor.has_staff_entry && doctor.is_available ? "border-green-500/30" : "border-orange-500/30"}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-xl font-bold text-white">{doctor.name}</h3>
                        {doctor.has_staff_entry ? (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Has Staff Entry</Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">Missing Staff Entry</Badge>
                        )}
                        {doctor.is_available ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Available</Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Unavailable</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-blue-300">
                          <Mail className="w-4 h-4" />
                          <span className="font-mono">{doctor.email}</span>
                        </div>
                        {doctor.has_staff_entry && (
                          <div className="flex items-center gap-2 text-blue-300">
                            <Stethoscope className="w-4 h-4" />
                            <span>{doctor.specialization} · {doctor.shift_hours}h shift</span>
                          </div>
                        )}
                        <div className="text-xs text-blue-400 mt-2">
                          Created: {new Date(doctor.created_at).toLocaleString()} · 
                          Appointments: {doctor.total_appointments} · 
                          Patients Today: {doctor.patients_handled_today}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(doctor.email);
                          toast.success("Email copied to clipboard");
                        }}
                        className="border-white/20 text-white hover:bg-white/10">
                        Copy Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
