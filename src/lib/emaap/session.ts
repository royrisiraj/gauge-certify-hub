import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "business" | "inspector";

export type AccountContext = {
  userId: string;
  email: string | null;
  role: AppRole | null;
  fullName: string | null;
  businessId: string | null;
  authorityId: string | null;
  designation: string | null;
};

export const accountQueryKey = ["emaap", "account"] as const;

export async function loadAccount(): Promise<AccountContext | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, business_id, authority_id, designation").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    role: (roles?.[0]?.role as AppRole | undefined) ?? null,
    fullName: profile?.full_name ?? null,
    businessId: profile?.business_id ?? null,
    authorityId: profile?.authority_id ?? null,
    designation: profile?.designation ?? null,
  };
}

export function useAccount() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: loadAccount,
    staleTime: 30_000,
  });
}

export function homePathForRole(role: AppRole | null | undefined): string {
  if (role === "business") return "/business/dashboard";
  if (role === "inspector") return "/authority/dashboard";
  return "/onboarding";
}
