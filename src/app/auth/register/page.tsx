"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HeartPulse, Eye, EyeOff, UserPlus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ROLES = [
  { value: "patient", label: "Patient", desc: "Book appointments & track queue" },
  { value: "doctor", label: "Doctor", desc: "Manage patient consultations" },
];

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "ENT (Ear, Nose & Throat)",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Surgery",
  "Urology",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [specialization, setSpecialization] = useState("General Medicine");
  const [shiftHours, setShiftHours] = useState("8");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const doctorOptions = role === "doctor" ? { specialization, shiftHours: parseInt(shiftHours) || 8 } : undefined;
    const { error, needsConfirmation } = await register(name, email, password, role, doctorOptions);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else if (needsConfirmation) {
      toast.success("Account created! Check your email to confirm it, then log in.");
      router.push("/auth/login");
    } else {
      toast.success("Account created! Welcome to MediQueue AI.");
      router.push(role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">MediQueue <span className="text-cyan-400">AI</span></span>
          </Link>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
            <CardDescription className="text-blue-300">Join the smart hospital network</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role selector */}
            <div className="mb-6">
              <Label className="text-blue-200 mb-3 block">Select Your Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`p-3 rounded-xl border text-center transition-all ${role === r.value
                      ? "border-cyan-400 bg-cyan-500/20 text-white"
                      : "border-white/10 bg-white/5 text-blue-300 hover:border-white/20"}`}>
                    <div className="font-semibold text-sm">{r.label}</div>
                    <div className="text-xs mt-1 opacity-70 leading-tight hidden sm:block">{r.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-400 mt-2">Admin accounts are set up by the hospital administrator.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-blue-200">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={role === "doctor" ? "Dr. Jane Smith" : "John Doe"} required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-200">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-200">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {role === "doctor" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-blue-200 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-cyan-400" /> Specialization
                    </Label>
                    <select id="specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full h-10 rounded-md border bg-white/10 border-white/20 text-white px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none">
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftHours" className="text-blue-200">Shift Duration (hours)</Label>
                    <Input id="shiftHours" type="number" min="4" max="16" value={shiftHours}
                      onChange={(e) => setShiftHours(e.target.value)} placeholder="8"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 gap-2">
                {loading ? "Creating account..." : <><UserPlus className="w-4 h-4" /> Create Account</>}
              </Button>
            </form>

            <p className="text-center text-blue-300 mt-6 text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
