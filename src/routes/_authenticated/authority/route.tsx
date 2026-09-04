import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, type NavItem } from "@/components/emaap/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homePathForRole } from "@/lib/emaap/session";

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/authority/dashboard" },
  { label: "Queue", to: "/authority/queue" },
  { label: "Assignments", to: "/authority/assignments" },
  { label: "Certificates", to: "/authority/certificates" },
  { label: "Notifications", to: "/authority/notifications" },
  { label: "Profile", to: "/authority/profile" },
];

export const Route = createFileRoute("/_authenticated/authority")({
  // Role gate for the UI only; the backend enforces authority scope.
  beforeLoad: async () => {
    const account = await loadAccount();
    if (!account) throw redirect({ to: "/auth" });
    if (account.role !== "inspector") throw redirect({ to: homePathForRole(account.role) });
    return { account };
  },
  component: AuthorityLayout,
});

function AuthorityLayout() {
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
    <AppShell nav={NAV} contextLabel="Verification authority" unreadCount={unread ?? 0}>
      <Outlet />
    </AppShell>
  );
}
