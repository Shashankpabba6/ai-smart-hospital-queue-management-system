"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, User } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string, role: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("hospital_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.user_id && parsed?.role) {
          setUser(parsed);
        }
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simple password check - in production use bcrypt
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();
    if (error || !data) return { error: "Invalid email or password" };
    // For demo: password_hash must match or be 'demo_hash'
    if (data.password_hash !== password && data.password_hash !== "demo_hash") {
      return { error: "Invalid email or password" };
    }
    setUser(data);
    localStorage.setItem("hospital_user", JSON.stringify(data));
    return {};
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const { data: existing } = await supabase.from("users").select("user_id").eq("email", email.toLowerCase()).single();
    if (existing) return { error: "Email already registered" };
    const { data, error } = await supabase
      .from("users")
      .insert({ name, email: email.toLowerCase(), password_hash: password, role })
      .select()
      .single();
    if (error || !data) return { error: error?.message || "Registration failed" };
    if (role === "doctor") {
      await supabase.from("staff").insert({ doctor_id: data.user_id });
    }
    setUser(data);
    localStorage.setItem("hospital_user", JSON.stringify(data));
    return {};
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("hospital_user");
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
