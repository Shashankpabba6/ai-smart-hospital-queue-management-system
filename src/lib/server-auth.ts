import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/supabase";

// Server-only client: the service-role key bypasses row-level security, so API
// routes must check the caller with requireUser() before using it.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type AuthResult = { userId: string; role: UserRole } | { denied: NextResponse };

/** Verifies the Supabase access token sent as `Authorization: Bearer <token>`. */
export async function requireUser(req: NextRequest, roles?: UserRole[]): Promise<AuthResult> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { denied: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { denied: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin.from("users").select("role").eq("user_id", data.user.id).single();
  if (!profile) return { denied: NextResponse.json({ error: "Profile not found" }, { status: 403 }) };
  if (roles && !roles.includes(profile.role)) {
    return { denied: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  }
  return { userId: data.user.id, role: profile.role };
}
