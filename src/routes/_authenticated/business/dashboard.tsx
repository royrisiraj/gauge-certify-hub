import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Plus,
  ArrowRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { MetricCard } from "@/components/emaap/MetricCard";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/business/dashboard")({
  head: () => ({
    meta: [
      { title: "Business Dashboard — e-Maap Verification Service" },
      {
        name: "description",
        content:
          "Overview of commercial weighing and measuring instruments, verification status and compliance certificates.",
      },
    ],
  }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const businessId = account?.businessId;

  // 1. Business details (trade name / legal name)
  const { data: business } = useQuery({
    queryKey: ["emaap", "business", "detail", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, address_line, city, state, pincode, registration_ref")
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // 2. Instruments query
  const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
    queryKey: ["emaap", "business", "instruments", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("instruments")
        .select(
          "id, public_code, serial_number, category, manufacturer, model, status, capacity_value, capacity_unit, unit, location_label, created_at",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

  // 3. Verification requests query
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["emaap", "business", "requests", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("verification_requests")
        .select(
          "id, request_type, status, reason, rejected_reason, submitted_at, updated_at, instruments(id, public_code, serial_number, category, manufacturer, model)",
        )
        .eq("business_id", businessId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

  // 4. Certificates query
  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ["emaap", "business", "certificates", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, certificate_number, verification_code, status, issued_at, valid_from, valid_until, conditions, instruments(id, public_code, serial_number, category, manufacturer, model)",
        )
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const isLoading = accountLoading || instrumentsLoading || requestsLoading || certsLoading;

  // Derived metrics from actual data
  const totalInstruments = instruments.length;
  const activeInstruments = instruments.filter((i) => i.status === "active").length;
  const pendingRequests = requests.filter(
    (r) => r.status === "submitted" || r.status === "assigned" || r.status === "under_review",
  ).length;
  const activeCertificates = certificates.filter((c) => c.status === "active").length;

  const nowMs = Date.now();
  const in30DaysMs = nowMs + 30 * 24 * 60 * 60 * 1000;
  const expiringSoonCount = certificates.filter((c) => {
    if (c.status !== "active") return false;
    const expiry = new Date(c.valid_until).getTime();
    return expiry >= nowMs && expiry <= in30DaysMs;
  }).length;

  const recentRequests = requests.slice(0, 5);
  const recentCertificates = certificates.slice(0, 5);
  const recentInstruments = instruments.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">Loading business dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-w-0 w-full">
      {/* Page Header with Action */}
      <PageHeader
        title={business?.name ? `${business.name} — Dashboard` : "Business Dashboard"}
        description={
          business?.address_line
            ? `Premises: ${business.address_line}${business.city ? `, ${business.city}` : ""}${business.state ? `, ${business.state}` : ""} — Legal Metrology Compliance`
            : "Commercial weighing and measuring compliance, instrument registry, and verification status."
        }
        actions={
          <Button
            asChild
            className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm font-medium"
          >
            <Link to="/business/instruments" search={{ register: true }}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              Register Instrument
            </Link>
          </Button>
        }
      />

      {/* 5 Real Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 min-w-0">
        <MetricCard
          label="Total Instruments"
          value={totalInstruments}
          hint={
            totalInstruments === 1
              ? "1 instrument registered"
              : `${totalInstruments} instruments registered`
          }
          icon={Scale}
          to="/business/instruments"
          tone="default"
        />
        <MetricCard
          label="Active Instruments"
          value={activeInstruments}
          hint="Operational units"
          icon={CheckCircle2}
          to="/business/instruments"
          tone={activeInstruments > 0 ? "success" : "default"}
        />
        <MetricCard
          label="Pending Verification"
          value={pendingRequests}
          hint="Requests in progress"
          icon={Clock}
          to="/business/requests"
          tone={pendingRequests > 0 ? "attention" : "default"}
        />
        <MetricCard
          label="Active Certificates"
          value={activeCertificates}
          hint="Official digital certs"
          icon={Award}
          to="/business/certificates"
          tone="saffron"
        />
        <MetricCard
          label="Expiring Soon"
          value={expiringSoonCount}
          hint="Within next 30 days"
          icon={AlertTriangle}
          to="/business/certificates"
          tone={expiringSoonCount > 0 ? "attention" : "default"}
        />
      </div>

      {/* If 0 instruments registered: Useful, non-blank empty state */}
      {totalInstruments === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 sm:p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-[#000080]">
            <Scale className="size-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-[18px] font-bold text-slate-900">
            No instruments registered yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600">
            Register your first weighing or measuring instrument to begin the Legal Metrology
            verification process and receive digital compliance certificates.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm font-medium"
            >
              <Link to="/business/instruments" search={{ register: true }}>
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                Register Instrument
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300">
              <Link to="/help">View Metrology Guidelines</Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Instrument Overview + Recent Requests & Certificates */
        <div className="space-y-8 min-w-0">
          {/* Instrument Overview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm overflow-hidden min-w-0 max-w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">
                  Registered Instruments Overview
                </h2>
                <p className="text-[13px] text-slate-500">
                  Commercial equipment currently registered to your business.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[#000080] hover:text-[#000080]/80 font-medium"
              >
                <Link to="/business/instruments">
                  View All Instruments
                  <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 w-full overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 pr-4">Code</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Manufacturer & Model</th>
                    <th className="py-2.5 px-4">Serial Number</th>
                    <th className="py-2.5 px-4">Capacity</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInstruments.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4 font-mono text-[13px] font-medium text-slate-800 whitespace-nowrap">
                        {inst.public_code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 break-words max-w-[200px]">{inst.category}</td>
                      <td className="py-3 px-4 text-slate-600 break-words max-w-[200px]">
                        {inst.manufacturer} {inst.model}
                      </td>
                      <td className="py-3 px-4 font-mono text-[13px] text-slate-600 whitespace-nowrap">
                        {inst.serial_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {inst.capacity_value
                          ? `${inst.capacity_value} ${inst.capacity_unit || inst.unit}`
                          : inst.unit}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={inst.status} size="sm" />
                      </td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <Button asChild variant="outline" size="sm" className="h-7 text-[12px]">
                          <Link to="/business/instruments">View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Column Grid: Recent Verification Requests & Recent Certificates */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 min-w-0">
            {/* Recent Verification Requests */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm overflow-hidden min-w-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[#000080]" aria-hidden="true" />
                  <h3 className="text-[16px] font-bold text-slate-900">
                    Recent Verification Requests
                  </h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-[#000080] text-[13px]">
                  <Link to="/business/requests">View All</Link>
                </Button>
              </div>

              {recentRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-[14px]">No verification requests submitted yet.</p>
                  <Button asChild variant="link" size="sm" className="mt-1 text-[#000080]">
                    <Link to="/business/instruments">
                      Select an instrument to request verification
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="py-3 flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[12px] font-semibold text-slate-800">
                            REQ-{req.id.slice(0, 8).toUpperCase()}
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <p className="mt-1 text-[13px] font-medium text-slate-700 break-words">
                          {req.instruments
                            ? `${req.instruments.category} (${req.instruments.serial_number})`
                            : "Instrument"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-500">
                          <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>Submitted: {new Date(req.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-7 text-[12px] shrink-0">
                        <Link to="/business/requests">Track</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Certificates */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm overflow-hidden min-w-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-[#ff671f]" aria-hidden="true" />
                  <h3 className="text-[16px] font-bold text-slate-900">
                    Recent Verification Certificates
                  </h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-[#000080] text-[13px]">
                  <Link to="/business/certificates">View All</Link>
                </Button>
              </div>

              {recentCertificates.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-[14px]">No certificates issued yet.</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Certificates will appear once an inspector approves verification.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {recentCertificates.map((cert) => (
                    <div key={cert.id} className="py-3 flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[13px] font-bold text-slate-800">
                            {cert.certificate_number}
                          </span>
                          <StatusBadge status={cert.status} size="sm" />
                        </div>
                        <p className="mt-1 text-[13px] text-slate-700 break-words">
                          {cert.instruments
                            ? `${cert.instruments.category} — ${cert.instruments.manufacturer} ${cert.instruments.model}`
                            : "Commercial Instrument"}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          Valid until: {new Date(cert.valid_until).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button asChild variant="outline" size="sm" className="h-7 text-[12px]">
                          <Link to="/business/certificates">View</Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#000080]"
                          title="Public Verification Link"
                        >
                          <Link to="/verify/$code" params={{ code: cert.verification_code }}>
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
