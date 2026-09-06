import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ClipboardList,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Users,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { MetricCard } from "@/components/emaap/MetricCard";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/emaap/format";

export const Route = createFileRoute("/_authenticated/authority/dashboard")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard — e-Maap Legal Metrology Hub" },
      {
        name: "description",
        content:
          "LMO Officer dashboard — incoming verification requests, active assignments, and certificate issuance overview.",
      },
    ],
  }),
  component: AuthorityDashboard,
});

function AuthorityDashboard() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const authorityId = account?.authorityId;
  const userId = account?.userId;

  // Authority info
  const { data: authority } = useQuery({
    queryKey: ["emaap", "authority", "detail", authorityId],
    queryFn: async () => {
      if (!authorityId) return null;
      const { data, error } = await supabase
        .from("verification_authorities")
        .select("id, name, jurisdiction_label, contact_email")
        .eq("id", authorityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!authorityId,
  });

  // Queue: requests assigned to this authority that are pending
  const { data: queueRequests = [], isLoading: queueLoading } = useQuery({
    queryKey: ["emaap", "authority", "queue", authorityId],
    queryFn: async () => {
      let query = supabase
        .from("verification_requests")
        .select(
          "id, status, request_type, submitted_at, instrument_id, business_id, assigned_to, assigned_at",
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
      return data ?? [];
    },
    enabled: !accountLoading,
  });

  // My assignments
  const { data: myAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["emaap", "authority", "my-assignments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("verification_requests")
        .select(
          "id, status, request_type, submitted_at, assigned_at, instrument_id, business_id",
        )
        .eq("assigned_to", userId)
        .in("status", ["assigned", "under_review"])
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  // Certificates issued by authority
  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ["emaap", "authority", "certificates", authorityId],
    queryFn: async () => {
      let query = supabase
        .from("certificates")
        .select("id, certificate_number, status, valid_from, valid_until, issued_at")
        .order("issued_at", { ascending: false })
        .limit(10);

      if (authorityId) {
        query = query.or(`authority_id.is.null,authority_id.eq.${authorityId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !accountLoading,
  });

  const isLoading = accountLoading || queueLoading || assignmentsLoading || certsLoading;

  const pendingCount = queueRequests.filter((r) => r.status === "submitted").length;
  const activeCount = queueRequests.filter(
    (r) => r.status === "assigned" || r.status === "under_review",
  ).length;
  const myActiveCount = myAssignments.length;
  const certCount = certificates.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${account?.fullName ?? "Officer"}`}
        description={
          authority
            ? `${authority.name}${authority.jurisdiction_label ? ` — ${authority.jurisdiction_label}` : ""}`
            : "LMO Officer Portal"
        }
      />

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pending Queue"
          value={pendingCount}
          hint="Awaiting assignment"
          icon={ClipboardList}
          to="/authority/queue"
          tone={pendingCount > 0 ? "attention" : "default"}
        />
        <MetricCard
          label="Active Reviews"
          value={activeCount}
          hint="Assigned or under review"
          icon={Scale}
          to="/authority/queue"
          tone="saffron"
        />
        <MetricCard
          label="My Assignments"
          value={myActiveCount}
          hint="Assigned to you"
          icon={Users}
          to="/authority/assignments"
        />
        <MetricCard
          label="Certificates"
          value={certCount}
          hint="Recently issued"
          icon={Award}
          to="/authority/certificates"
          tone="success"
        />
      </div>

      {/* ── Recent queue items ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h4 font-semibold text-slate-800">Incoming Requests</h2>
          <Link to="/authority/queue">
            <Button variant="ghost" size="sm" className="gap-1 text-[13px]">
              View all <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {queueRequests.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending requests"
            description="All verification requests have been processed. New submissions will appear here."
          />
        ) : (
          <div className="surface-card divide-y divide-slate-100">
            {queueRequests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {req.request_type === "initial"
                      ? "Initial Verification"
                      : "Re-verification"}{" "}
                    Request
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Submitted {formatDate(req.submitted_at)}
                  </p>
                </div>
                <StatusBadge status={req.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent certificates ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h4 font-semibold text-slate-800">Recent Certificates</h2>
          <Link to="/authority/certificates">
            <Button variant="ghost" size="sm" className="gap-1 text-[13px]">
              View all <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {certificates.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No certificates issued"
            description="Certificates will appear here once verification decisions are finalized."
          />
        ) : (
          <div className="surface-card divide-y divide-slate-100">
            {certificates.slice(0, 5).map((cert) => (
              <div
                key={cert.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {cert.certificate_number}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Valid {formatDate(cert.valid_from)} — {formatDate(cert.valid_until)}
                  </p>
                </div>
                <StatusBadge status={cert.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
