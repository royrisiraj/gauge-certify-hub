import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Clock,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/emaap/format";

type QueueRow = {
  id: string;
  status: string;
  request_type: string;
  submitted_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  instrument_id: string;
  business_id: string;
  reason: string | null;
  instruments?: { public_code: string; serial_number: string; category: string } | null;
  businesses?: { name: string; city: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/authority/queue")({
  head: () => ({
    meta: [
      { title: "Verification Queue — e-Maap Authority" },
      {
        name: "description",
        content:
          "Incoming verification requests awaiting assignment or review by LMO officers.",
      },
    ],
  }),
  component: AuthorityQueuePage,
});

function AuthorityQueuePage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const authorityId = account?.authorityId;
  const userId = account?.userId;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "assigned" | "under_review">("all");

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["emaap", "authority", "queue-full", authorityId],
    queryFn: async () => {
      let query = supabase
        .from("verification_requests")
        .select(
          "id, status, request_type, submitted_at, assigned_to, assigned_at, instrument_id, business_id, reason, instruments(public_code, serial_number, category), businesses(name, city)",
        )
        .in("status", ["submitted", "assigned", "under_review"])
        .order("submitted_at", { ascending: false });

      if (authorityId) {
        query = query.or(`authority_id.is.null,authority_id.eq.${authorityId}`);
      } else {
        query = query.is("authority_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
    enabled: !accountLoading,
  });

  // Claim request mutation
  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("claim_request", {
        p_request_id: requestId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority"] });
    },
  });

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesInstrument =
        r.instruments?.public_code?.toLowerCase().includes(q) ||
        r.instruments?.serial_number?.toLowerCase().includes(q) ||
        r.instruments?.category?.toLowerCase().includes(q);
      const matchesBusiness = r.businesses?.name?.toLowerCase().includes(q);
      if (!matchesInstrument && !matchesBusiness) return false;
    }
    return true;
  });

  if (accountLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Queue"
        description="Incoming requests awaiting assignment or under active review."
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="queue-search"
            placeholder="Search by instrument or business…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "submitted", "assigned", "under_review"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="text-xs capitalize"
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="surface-card flex items-center gap-3 border-error/30 bg-error-subtle p-4">
          <AlertTriangle className="size-5 text-error" />
          <p className="text-sm text-error">Failed to load queue: {(error as Error).message}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Queue is clear"
          description={
            search || statusFilter !== "all"
              ? "No requests match your current filters."
              : "No pending verification requests at this time."
          }
        />
      ) : (
        <div className="surface-card divide-y divide-slate-100">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {req.instruments?.public_code ?? "Instrument"} —{" "}
                    {req.instruments?.serial_number ?? ""}
                  </p>
                  <Badge variant="outline" className="text-[11px]">
                    {req.instruments?.category ?? req.request_type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {req.businesses?.name ?? "Business"}
                  {req.businesses?.city ? `, ${req.businesses.city}` : ""} · Submitted{" "}
                  {formatDate(req.submitted_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={req.status} size="sm" />
                {req.status === "submitted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    disabled={claimMutation.isPending}
                    onClick={() => claimMutation.mutate(req.id)}
                  >
                    <UserPlus className="size-3.5" />
                    Claim
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
