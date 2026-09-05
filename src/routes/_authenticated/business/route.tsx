import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, type NavItem } from "@/components/emaap/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homePathForRole } from "@/lib/emaap/session";

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/business/dashboard" },
  { label: "Instruments", to: "/business/instruments" },
  { label: "Verification requests", to: "/business/requests" },
  { label: "Certificates", to: "/business/certificates" },
  { label: "Notifications", to: "/business/notifications" },
  { label: "Profile", to: "/business/profile" },
];

export const Route = createFileRoute("/_authenticated/business")({
  // Role gate for the UI only. Every read and write is additionally enforced
  // by row level security and security-definer routines in the backend.
  beforeLoad: async () => {
    const account = await loadAccount();
    if (!account) throw redirect({ to: "/auth" });
    if (account.role !== "business") throw redirect({ to: homePathForRole(account.role) });
    if (!account.businessId || !account.fullName) {
      throw redirect({ to: "/onboarding" });
    }
    return { account };
  },
  component: BusinessLayout,
});

function BusinessLayout() {
  const { data: unread } = useQuery({
    queryKey: ["emaap", "notifications", "unread"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  return (
    <AppShell nav={NAV} contextLabel="Business Owner" unreadCount={unread ?? 0}>
      <Outlet />
    </AppShell>
  );
}
