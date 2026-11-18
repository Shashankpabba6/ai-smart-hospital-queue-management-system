"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, User, UserRole } from "@/lib/supabase";

interface DoctorOptions {
  specialization?: string;
  shiftHours?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; role?: UserRole }>;
  register: (name: string, email: string, password: string, role: string, doctorOptions?: DoctorOptions) =>
    Promise<{ error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Passwords are handled entirely by Supabase Auth (stored as bcrypt hashes in
// auth.users). public.users only holds the profile: name, email and role.
async function fetchProfile(userId: string): Promise<User | null> {
  const { data } = await supabase.from("users").select("*").eq("user_id", userId).single();
  return (data as User) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    setUser(userId ? await fetchProfile(userId) : null);
  }, []);

  useEffect(() => {
    // Old versions cached the full user row (including the password) here.
    localStorage.removeItem("hospital_user");

    supabase.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setUser(null);
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Defer the query: Supabase recommends not awaiting inside this callback
        setTimeout(() => loadProfile(session?.user.id), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        return { error: "Please confirm your email first (check your inbox), then log in." };
      }
      return { error: "Invalid email or password" };
    }
    const profile = await fetchProfile(data.user.id);
    if (!profile) return { error: "Account profile not found. Please contact the administrator." };
    setUser(profile);
    return { role: profile.role };
  };

  const register = async (name: string, email: string, password: string, role: string, doctorOptions?: DoctorOptions) => {
    // The on_auth_user_created trigger (supabase/002_supabase_auth.sql) creates
    // the public.users profile and, for doctors, the staff row from this metadata.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          role,
          ...(role === "doctor" && {
            specialization: doctorOptions?.specialization || "General Medicine",
            shift_hours: doctorOptions?.shiftHours || 8,
          }),
        },
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) return { error: "Email already registered" };
      return { error: error.message || "Registration failed" };
    }
    // Email confirmation is on in the Supabase project: no session until confirmed
    if (!data.session || !data.user) return { needsConfirmation: true };
    const profile = await fetchProfile(data.user.id);
    if (!profile) return { error: "Registration succeeded but the profile was not created." };
    setUser(profile);
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
