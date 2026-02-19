"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, Brain, BedDouble, Clock, Users, ChevronRight, Shield, Zap, BarChart3, HeartPulse, Stethoscope, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "patient") router.push("/patient/dashboard");
      else if (user.role === "doctor") router.push("/doctor/dashboard");
      else if (user.role === "admin") router.push("/admin/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-cyan-900">
        <div className="animate-pulse text-white text-xl font-semibold">Loading MediQueue AI...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">MediQueue <span className="text-cyan-400">AI</span></span>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white border border-white/20">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-4 py-1.5 text-sm">
          AI-Powered Hospital Management
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Smart Queue &amp;<br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Resource Management
          </span>
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto mb-10">
          AI-driven triage, real-time queue updates, severity scoring and resource tracking — 
          all in one platform for modern hospitals.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 text-lg px-8 gap-2">
              Get Started <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white text-lg px-8">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {[
            { label: "AI Triage", value: "5-Level Scoring", icon: Brain },
            { label: "Queue Updates", value: "Real-time", icon: Clock },
            { label: "Staff Monitoring", value: "Fatigue Index", icon: Activity },
            { label: "Resource Tracking", value: "Live Status", icon: BedDouble },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-blue-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">Everything Your Hospital Needs</h2>
        <p className="text-blue-300 text-center mb-14 text-lg">Three powerful portals for patients, doctors, and administrators</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: "Patient Portal",
              color: "from-green-500 to-emerald-600",
              items: ["AI-powered appointment booking", "Real-time queue position", "Severity score display", "Predicted wait time"],
              href: "/auth/register",
              cta: "Register as Patient",
            },
            {
              icon: Stethoscope,
              title: "Doctor Dashboard",
              color: "from-blue-500 to-cyan-600",
              items: ["Auto-prioritized patient list", "Severity-based queue order", "Mark consultations complete", "Staff fatigue monitoring"],
              href: "/auth/login",
              cta: "Doctor Login",
            },
            {
              icon: Settings,
              title: "Admin Dashboard",
              color: "from-purple-500 to-violet-600",
              items: ["Live bed availability", "Equipment tracking", "Analytics & peak hours", "Doctor workload charts"],
              href: "/auth/login",
              cta: "Admin Login",
            },
          ].map((portal) => (
            <Card key={portal.title} className="bg-white/5 border-white/10 hover:border-white/20 transition-all hover:bg-white/8 group">
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${portal.color} flex items-center justify-center mb-6`}>
                  <portal.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{portal.title}</h3>
                <ul className="space-y-2 mb-8">
                  {portal.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-blue-200 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={portal.href}>
                  <Button className={`w-full bg-gradient-to-r ${portal.color} border-0 text-white`}>
                    {portal.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-white/10 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-10 text-center">Built-in AI Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, title: "Severity Prediction", desc: "Decision-tree scoring from vitals: fever, BP, SpO2, age" },
              { icon: Clock, title: "Wait Time Forecast", desc: "Linear regression with queue depth and emergency adjustments" },
              { icon: Zap, title: "Staff Fatigue Index", desc: "Real-time workload analysis with automatic admin alerts" },
              { icon: BarChart3, title: "No-show Risk", desc: "Predicts appointment abandonment to optimize scheduling" },
            ].map((feat) => (
              <div key={feat.title} className="text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                  <feat.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">{feat.title}</h4>
                <p className="text-sm text-blue-300">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-blue-400 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <HeartPulse className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white">MediQueue AI</span>
        </div>
        AI Smart Hospital Queue &amp; Resource Management System © 2026
      </footer>
    </div>
  );
}
