import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  UserPlus,
  Search,
  Calendar,
  Clock,
  Eye,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  preferred_date?: string | null;
  preferred_time_slot?: string | null;
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
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueRow | null>(null);

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
          "id, status, request_type, submitted_at, assigned_to, assigned_at, instrument_id, business_id, reason, preferred_date, preferred_time_slot, instruments(public_code, serial_number, category), businesses(name, city)",
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
                {/* Clearly display Preferred Date and Preferred Time Slot */}
                {(req.preferred_date || req.preferred_time_slot) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {req.preferred_date && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-[#000080] border border-blue-200">
                        <Calendar className="size-3.5 text-[#000080]" aria-hidden="true" />
                        <span>Preferred Date: {formatDate(req.preferred_date)}</span>
                      </span>
                    )}
                    {req.preferred_time_slot && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-800 border border-slate-200">
                        <Clock className="size-3.5 text-slate-600" aria-hidden="true" />
                        <span>Preferred Time Slot: {req.preferred_time_slot}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={req.status} size="sm" />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => setSelectedQueueItem(req)}
                >
                  <Eye className="size-3.5" />
                  View Details
                </Button>
                {req.status === "submitted" && (
                  <Button
                    size="sm"
                    className="gap-1 text-xs bg-[#000080] hover:bg-[#000080]/90 text-white"
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

      {/* REQUEST DETAIL DIALOG */}
      <Dialog open={!!selectedQueueItem} onOpenChange={(open) => !open && setSelectedQueueItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="size-5 text-[#000080]" aria-hidden="true" />
              Verification Request Details
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Formal inspection and certification request from commercial establishment.
            </DialogDescription>
          </DialogHeader>
          {selectedQueueItem && (
            <div className="space-y-4 py-2 text-[14px]">
              {/* Instrument Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                  Instrument
                </span>
                <div className="font-bold text-slate-900">{selectedQueueItem.instruments?.category ?? "Instrument"}</div>
                <div className="text-slate-600 font-mono text-[12px]">
                  SN: {selectedQueueItem.instruments?.serial_number ?? "—"} ({selectedQueueItem.instruments?.public_code ?? "—"})
                </div>
              </div>

              {/* Business Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                  Business Entity
                </span>
                <div className="font-bold text-slate-900">{selectedQueueItem.businesses?.name ?? "Business"}</div>
                {selectedQueueItem.businesses?.city && (
                  <div className="text-slate-600 text-[12px]">{selectedQueueItem.businesses.city}</div>
                )}
              </div>

              {/* Requested Appointment Preferences */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#000080] block">
                  Requested Appointment Preference
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Preferred Date</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="size-3.5 text-[#000080]" />
                      {selectedQueueItem.preferred_date ? formatDate(selectedQueueItem.preferred_date) : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Preferred Time Slot</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Clock className="size-3.5 text-[#000080]" />
                      {selectedQueueItem.preferred_time_slot ?? "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Notes */}
              {selectedQueueItem.reason && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                    Notes
                  </span>
                  <p className="text-slate-700 mt-0.5">{selectedQueueItem.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedQueueItem(null)}>
              Close
            </Button>
            {selectedQueueItem?.status === "submitted" && (
              <Button
                className="bg-[#000080] hover:bg-[#000080]/90 text-white"
                disabled={claimMutation.isPending}
                onClick={() => {
                  claimMutation.mutate(selectedQueueItem.id);
                  setSelectedQueueItem(null);
                }}
              >
                Claim Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
