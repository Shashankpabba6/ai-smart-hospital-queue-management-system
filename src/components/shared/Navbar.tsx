"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { HeartPulse, LogOut, Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface NavLink { href: string; label: string }

const NAV_LINKS: Record<string, NavLink[]> = {
  patient: [
    { href: "/patient/dashboard", label: "Dashboard" },
    { href: "/patient/book", label: "Book Appointment" },
    { href: "/patient/queue", label: "My Queue" },
  ],
  doctor: [
    { href: "/doctor/dashboard", label: "Dashboard" },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/doctors", label: "All Doctors" },
  ],
};

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const links = user ? NAV_LINKS[user.role] || [] : [];

  const roleColors: Record<string, string> = {
    patient: "bg-green-500/20 text-green-300 border-green-500/30",
    doctor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };

  return (
    <nav className="border-b border-white/10 backdrop-blur-sm bg-slate-950/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href={user?.role ? `/${user.role}/dashboard` : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">MediQueue <span className="text-cyan-400">AI</span></span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="px-3 py-1.5 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-white/10 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {user && (
          <div className="hidden md:flex items-center gap-3">
            <Badge className={`capitalize ${roleColors[user.role]}`}>{user.role}</Badge>
            <span className="text-sm text-blue-200">{user.name}</span>
            <Button size="sm" variant="ghost" onClick={handleLogout}
              className="text-blue-300 hover:text-white hover:bg-white/10 gap-1">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        )}

        {/* Mobile menu toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950 px-4 py-4 space-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-white/10">
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <Badge className={`capitalize mb-1 ${roleColors[user.role]}`}>{user.role}</Badge>
                <div className="text-sm text-white">{user.name}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout}
                className="text-blue-300 hover:text-white gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
