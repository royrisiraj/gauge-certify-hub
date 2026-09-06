import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/emaap/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homePathForRole } from "@/lib/emaap/session";
import { NAV } from "../authority/route";

export const Route = createFileRoute("/_authenticated/lmo")({
  // Role gate for the UI; backend enforces authority scope.
  beforeLoad: async () => {
    const account = await loadAccount();
    if (!account) throw redirect({ to: "/auth" });
    if (account.role !== "inspector") throw redirect({ to: homePathForRole(account.role) });
    return { account };
  },
  component: LmoLayout,
});

function LmoLayout() {
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
    <AppShell nav={NAV} contextLabel="LMO Officer" unreadCount={unread ?? 0}>
      <Outlet />
    </AppShell>
  );
}
