import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UserCheck,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  Scale,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/emaap/format";

type AssignmentRow = {
  id: string;
  status: string;
  request_type: string;
  submitted_at: string;
  assigned_at: string | null;
  instrument_id: string;
  business_id: string;
  reason: string | null;
  preferred_date?: string | null;
  preferred_time_slot?: string | null;
  instruments?: { public_code: string; serial_number: string; category: string } | null;
  businesses?: { name: string; city: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/authority/assignments")({
  head: () => ({
    meta: [
      { title: "My Assignments — e-Maap Authority" },
      {
        name: "description",
        content:
          "Verification requests currently assigned to you for inspection and decision.",
      },
    ],
  }),
  component: AuthorityAssignmentsPage,
});

function AuthorityAssignmentsPage() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const userId = account?.userId;

  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["emaap", "authority", "assignments-full", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("verification_requests")
        .select(
          "id, status, request_type, submitted_at, assigned_at, instrument_id, business_id, reason, preferred_date, preferred_time_slot, instruments(public_code, serial_number, category), businesses(name, city)",
        )
        .eq("assigned_to", userId)
        .in("status", ["assigned", "under_review"])
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
    enabled: !!userId,
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
        title="My Assignments"
        description="Verification requests assigned to you for inspection and decision."
      />

      {error ? (
        <div className="surface-card flex items-center gap-3 border-error/30 bg-error-subtle p-4">
          <AlertTriangle className="size-5 text-error" />
          <p className="text-sm text-error">
            Failed to load assignments: {(error as Error).message}
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No active assignments"
          description="You don't have any verification requests assigned to you right now. Claim requests from the Queue."
        />
      ) : (
        <div className="surface-card divide-y divide-slate-100">
          {assignments.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-slate-400" />
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
                  {req.businesses?.city ? `, ${req.businesses.city}` : ""} · Assigned{" "}
                  {formatDate(req.assigned_at)}
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
                {req.reason ? (
                  <p className="text-xs text-slate-400 italic">Reason: {req.reason}</p>
                ) : null}
              </div>
              <StatusBadge status={req.status} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
