"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HeartPulse, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, role } = await login(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Welcome back!");
      if (role === "patient") router.push("/patient/dashboard");
      else if (role === "doctor") router.push("/doctor/dashboard");
      else router.push("/admin/dashboard");
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
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-white">Sign In</CardTitle>
            <CardDescription className="text-blue-300">Access your hospital portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-200">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.com" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-200">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-400 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 gap-2">
                {loading ? "Signing in..." : <><LogIn className="w-4 h-4" /> Sign In</>}
              </Button>
            </form>

            <p className="text-center text-blue-300 mt-6 text-sm">
              No account?{" "}
              <Link href="/auth/register" className="text-cyan-400 hover:text-cyan-300 font-medium">Register here</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
