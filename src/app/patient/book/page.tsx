"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/shared/Navbar";
import { predictSeverity, predictWaitingTime, getSeverityBadge } from "@/lib/ai";
import { toast } from "sonner";
import { Brain, Clock, Stethoscope, Thermometer, Heart, Wind, User, FileText, ChevronRight, Info, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Doctor { user_id: string; name: string; email: string; specialization?: string }

export default function BookAppointmentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [doctorId, setDoctorId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [fever, setFever] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [spo2, setSpo2] = useState("");
  const [age, setAge] = useState("");

  // AI results
  const [severityResult, setSeverityResult] = useState<ReturnType<typeof predictSeverity> | null>(null);
  const [waitTime, setWaitTime] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (user.role === "doctor") { router.push("/doctor/dashboard"); return; }
    if (user.role === "admin") { router.push("/admin/dashboard"); return; }
    fetchDoctors();
  }, [user, loading, router]);

  const fetchDoctors = async () => {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("user_id, name, email")
      .eq("role", "doctor");

    if (usersError) {
      console.error("Error fetching doctors:", usersError);
      toast.error("Failed to load doctors");
      setDoctors([]);
      return;
    }

    if (!users || users.length === 0) {
      setDoctors([]);
      return;
    }

    // Get ALL staff entries (not just available ones) to show specialization
    const { data: staffData } = await supabase
      .from("staff")
      .select("doctor_id, specialization, is_available");

    const staffMap = new Map((staffData || []).map(s => [s.doctor_id, s]));

    // Show ALL doctors, with their specialization if they have a staff entry
    const allDoctors: Doctor[] = users.map(u => ({
      ...u,
      specialization: staffMap.get(u.user_id)?.specialization || "General Medicine",
    }));

    // Sort: available doctors first, then unavailable
    allDoctors.sort((a, b) => {
      const aAvailable = staffMap.get(a.user_id)?.is_available ?? false;
      const bAvailable = staffMap.get(b.user_id)?.is_available ?? false;
      return bAvailable ? 1 : aAvailable ? -1 : 0;
    });

    setDoctors(allDoctors);
  };

  const runAIAnalysis = async () => {
    if (!symptoms.trim() || !fever || !bpSys || !bpDia || !spo2 || !age) {
      toast.error("Please fill in all vitals fields");
      return;
    }
    const vitals = {
      fever: parseFloat(fever),
      systolic_bp: parseInt(bpSys),
      diastolic_bp: parseInt(bpDia),
      spo2: parseFloat(spo2),
      age: parseInt(age),
      symptoms,
    };
    const sev = predictSeverity(vitals);
    setSeverityResult(sev);

    // Get queue count for selected doctor
    let count = 0;
    if (doctorId) {
      const { count: c } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctorId)
        .eq("status", "waiting");
      count = c || 0;
    }
    setQueueCount(count);

    const wait = predictWaitingTime({
      patients_in_queue: count,
      avg_consultation_time: 8,
      emergency_cases: count > 5 ? 1 : 0,
      severity_score: sev.score,
    });
    setWaitTime(wait);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!doctorId) { toast.error("Please select a doctor"); return; }
    setSubmitting(true);

    const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true });
    const tokenNumber = (count || 0) + 1;

    const appointmentData = {
      patient_id: user!.user_id,
      doctor_id: doctorId,
      symptoms,
      fever: parseFloat(fever) || null,
      blood_pressure_systolic: parseInt(bpSys) || null,
      blood_pressure_diastolic: parseInt(bpDia) || null,
      spo2: parseFloat(spo2) || null,
      age: parseInt(age) || null,
      severity_score: severityResult?.score || 1,
      predicted_wait_time: waitTime,
      token_number: tokenNumber,
      queue_position: queueCount + 1,
      status: "waiting",
    };

    const selectedDoctor = doctors.find(d => d.user_id === doctorId);

    console.log("[Booking] Creating appointment:", {
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      selectedDoctor: selectedDoctor?.name,
      selectedDoctorEmail: selectedDoctor?.email,
    });

    const { data: insertedAppt, error } = await supabase
      .from("appointments")
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      console.error("[Booking] Error creating appointment:", error);
      setSubmitting(false);
      toast.error("Booking failed: " + error.message);
      return;
    }

    console.log("[Booking] Appointment created successfully:", insertedAppt);

    if (selectedDoctor) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/notify-doctor", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({
            doctorEmail: selectedDoctor.email,
            doctorName: selectedDoctor.name,
            patientName: user!.name,
            patientEmail: user!.email,
            symptoms,
            severityScore: severityResult?.score || 1,
            tokenNumber,
            predictedWaitTime: waitTime,
            fever: parseFloat(fever) || null,
            bloodPressureSystolic: parseInt(bpSys) || null,
            bloodPressureDiastolic: parseInt(bpDia) || null,
            spo2: parseFloat(spo2) || null,
            age: parseInt(age) || null,
          }),
        });
        toast.success(`Appointment booked! Token #${tokenNumber}. Dr. ${selectedDoctor.name} has been notified.`);
      } catch {
        toast.success(`Appointment booked! Token #${tokenNumber}`);
      }
    } else {
      toast.success(`Appointment booked! Token #${tokenNumber}`);
    }

    setSubmitting(false);
    router.push("/patient/queue");
  };

  const sevBadge = severityResult ? getSeverityBadge(severityResult.score) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="text-blue-300 mt-1">AI-powered triage and scheduling</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8 gap-2">
          {[
            { n: 1, label: "Doctor" },
            { n: 2, label: "Symptoms & Vitals" },
            { n: 3, label: "AI Review" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s.n ? "bg-cyan-500 text-white" : "bg-white/10 text-blue-300"}`}>
                {s.n}
              </div>
              <span className={`text-xs hidden sm:block ${step >= s.n ? "text-cyan-300" : "text-blue-400"}`}>{s.label}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? "bg-cyan-500" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-cyan-400" /> Select Doctor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctors.length === 0 && <p className="text-blue-300 text-sm">No doctors available at the moment. Please try again later.</p>}
              {doctors.map(doc => (
                <button key={doc.user_id} onClick={() => setDoctorId(doc.user_id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${doctorId === doc.user_id ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{doc.name}</span>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">{doc.specialization}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-blue-300">
                    <Mail className="w-3 h-3" /> {doc.email}
                  </div>
                </button>
              ))}
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 mt-4"
                disabled={!doctorId} onClick={() => setStep(2)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Symptoms & Vitals */}
        {step === 2 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Symptoms &amp; Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-blue-200 mb-2 block">Describe Your Symptoms</Label>
                <Textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                  placeholder="e.g. Chest pain, shortness of breath, headache..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400 min-h-[80px]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-blue-200 mb-2 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-red-400" /> Fever (°C)
                  </Label>
                  <Input value={fever} onChange={e => setFever(e.target.value)} type="number" step="0.1"
                    placeholder="37.0" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                </div>
                <div>
                  <Label className="text-blue-200 mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" /> Age (years)
                  </Label>
                  <Input value={age} onChange={e => setAge(e.target.value)} type="number"
                    placeholder="35" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                </div>
                <div>
                  <Label className="text-blue-200 mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-400" /> BP Systolic (mmHg)
                  </Label>
                  <Input value={bpSys} onChange={e => setBpSys(e.target.value)} type="number"
                    placeholder="120" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                </div>
                <div>
                  <Label className="text-blue-200 mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-300" /> BP Diastolic (mmHg)
                  </Label>
                  <Input value={bpDia} onChange={e => setBpDia(e.target.value)} type="number"
                    placeholder="80" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                </div>
                <div className="col-span-2">
                  <Label className="text-blue-200 mb-2 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" /> SpO2 (%)
                  </Label>
                  <Input value={spo2} onChange={e => setSpo2(e.target.value)} type="number" step="0.1" max="100"
                    placeholder="98" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="border-white/20 text-white hover:bg-white/10 flex-1">Back</Button>
                <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2"
                  onClick={runAIAnalysis}>
                  <Brain className="w-4 h-4" /> Run AI Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: AI Review */}
        {step === 3 && severityResult && (
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" /> AI Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Severity score */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-sm text-blue-300 mb-1">Severity Score</div>
                    <div className={`text-3xl font-bold ${severityResult.color}`}>{severityResult.score}/5</div>
                    {sevBadge && <Badge className={`mt-1 ${sevBadge.bg} ${sevBadge.text}`}>{severityResult.label}</Badge>}
                  </div>
                  <div className="w-20 h-20 relative flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeDasharray={`${severityResult.score * 18.85} 94.25`}
                        className={severityResult.score >= 4 ? "stroke-red-500" : severityResult.score >= 3 ? "stroke-yellow-500" : "stroke-green-500"} />
                    </svg>
                    <span className="absolute text-white font-bold text-lg">{severityResult.score}</span>
                  </div>
                </div>

                {/* Wait time */}
                {waitTime !== null && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Clock className="w-8 h-8 text-cyan-400" />
                    <div>
                      <div className="text-sm text-blue-300">Predicted Wait Time</div>
                      <div className="text-2xl font-bold text-white">{waitTime} minutes</div>
                      <div className="text-xs text-blue-400">{queueCount} patients ahead in queue</div>
                    </div>
                  </div>
                )}

                {/* Explainable AI */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Why this severity score?</span>
                  </div>
                  <ul className="space-y-1.5">
                    {severityResult.explanation.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="border-white/20 text-white hover:bg-white/10 flex-1">
                    Edit Vitals
                  </Button>
                  <Button disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2"
                    onClick={handleSubmit}>
                    {submitting ? "Booking..." : "Confirm Booking"} {!submitting && <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
