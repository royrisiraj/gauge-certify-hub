import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "business" | "inspector";

export type AccountContext = {
  userId: string;
  email: string | null;
  role: AppRole | null;
  fullName: string | null;
  phone: string | null;
  businessId: string | null;
  authorityId: string | null;
  designation: string | null;
};

export const accountQueryKey = ["emaap", "account"] as const;

export function isAccountOnboarded(account: AccountContext | null | undefined): boolean {
  if (!account || !account.role || !account.fullName) return false;
  if (account.role === "business") {
    return Boolean(account.businessId);
  }
  if (account.role === "inspector") {
    return Boolean(account.authorityId);
  }
  return false;
}

export async function loadAccount(): Promise<AccountContext | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, business_id, authority_id, designation")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const role = (roles?.[0]?.role as AppRole | undefined) ?? null;
  const fullName = profile?.full_name ?? null;
  let businessId = profile?.business_id ?? null;
  const authorityId = profile?.authority_id ?? null;
  const designation = profile?.designation ?? null;

  // For Business Owner: verify the business actually exists and belongs to the user
  if (role === "business" && businessId) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .maybeSingle();

    if (!business) {
      businessId = null;
    }
  }

  // If Business Owner profile exists but business_id is null, attempt safe linkage via bootstrap_account
  if (role === "business" && !businessId && fullName) {
    try {
      const { data: repairData } = await supabase.rpc("bootstrap_account", {
        p_role: "business",
        p_full_name: fullName,
      });
      const repairedId = (repairData as { business_id?: string })?.business_id;
      if (repairedId) {
        businessId = repairedId;
      }
    } catch {
      // Safe fallback: user will be directed to /onboarding to supply business details
    }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    fullName,
    phone: profile?.phone ?? null,
    businessId,
    authorityId,
    designation,
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
  if (role === "inspector") return "/authority";
  return "/onboarding";
}
