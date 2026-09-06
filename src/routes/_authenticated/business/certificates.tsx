import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Search,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Calendar,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Printer,
  QrCode,
  Eye,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CertificateRow = {
  id: string;
  certificate_number: string;
  verification_code: string;
  status: string;
  status_reason: string | null;
  valid_from: string;
  valid_until: string | null;
  issued_at: string;
  conditions: string | null;
  instrument_id: string;
  authority_id: string | null;
  instruments?: {
    id: string;
    public_code: string;
    serial_number: string;
    category: string;
    manufacturer: string;
    model: string;
    capacity_value: number | null;
    capacity_unit: string | null;
    unit: string;
  } | null;
  verification_authorities?: {
    name: string;
    jurisdiction_label: string | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/business/certificates")({
  head: () => ({
    meta: [
      { title: "Verification Certificates — e-Maap" },
      {
        name: "description",
        content:
          "Official digital certificates of verification issued under the Legal Metrology Act.",
      },
    ],
  }),
  component: BusinessCertificatesPage,
});

function BusinessCertificatesPage() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const businessId = account?.businessId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCert, setSelectedCert] = useState<CertificateRow | null>(null);

  // Query Certificates for this business
  const {
    data: certificates = [],
    isLoading: certsLoading,
    error: certsError,
  } = useQuery({
    queryKey: ["emaap", "business", "certificates", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          id,
          certificate_number,
          verification_code,
          status,
          status_reason,
          valid_from,
          valid_until,
          issued_at,
          conditions,
          instrument_id,
          authority_id,
          instruments(
            id,
            public_code,
            serial_number,
            category,
            manufacturer,
            model,
            capacity_value,
            capacity_unit,
            unit
          ),
          verification_authorities(
            name,
            jurisdiction_label
          )
        `,
        )
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as CertificateRow[]) ?? [];
    },
    enabled: !!businessId,
  });

  const isLoading = accountLoading || certsLoading;

  // Filter certificates
  const filteredCerts = certificates.filter((cert) => {
    const matchesSearch =
      searchQuery === "" ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.verification_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.instruments &&
        (cert.instruments.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cert.instruments.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cert.instruments.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())));

    const isCertFailed = cert.status === "failed" || cert.certificate_number.startsWith("VR-");
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "failed"
        ? isCertFailed
        : statusFilter === "active"
          ? !isCertFailed && cert.status === "active"
          : cert.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">
          Loading verification certificates…
        </p>
      </div>
    );
  }

  if (certsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertTriangle className="mx-auto size-8 text-red-600" aria-hidden="true" />
        <h2 className="mt-2 text-lg font-bold">Unable to load certificates</h2>
        <p className="mt-1 text-sm">
          {certsError instanceof Error ? certsError.message : "Database error"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Certificates"
        description="Official certificates of verification and re-verification issued under the Legal Metrology Act and Rules."
        crumbs={[{ label: "Dashboard", to: "/business/dashboard" }, { label: "Certificates" }]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search certificate number, verification code, serial…"
            className="pl-9 text-[14px] border-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="status-filter"
            className="text-[13px] font-medium text-slate-600 whitespace-nowrap"
          >
            Status:
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-[180px] text-[13px] border-slate-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="active">Pass / Verified</SelectItem>
              <SelectItem value="failed">Fail / Not Verified</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates or results issued yet"
          description="Certificates and verification results are generated once an authorized Legal Metrology Officer completes the verification."
          action={
            <Button asChild className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm">
              <Link to="/business/requests">View Verification Requests</Link>
            </Button>
          }
        />
      ) : filteredCerts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="text-[15px] font-medium">No certificates or results match your search criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-3"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[12px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Certificate / Result No.</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Verification Date</th>
                  <th className="py-3 px-4">Validity / Outcome</th>
                  <th className="py-3 px-4">Issuing Authority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCerts.map((cert) => {
                  const isFailed = cert.status === "failed" || cert.certificate_number.startsWith("VR-");
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#000080] text-[13px]">
                        <div>{cert.certificate_number}</div>
                        <span
                          className={cn(
                            "inline-block rounded px-1.5 py-0.2 text-[10px] font-bold uppercase mt-0.5 border",
                            isFailed
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200",
                          )}
                        >
                          {isFailed ? "NOT VERIFIED — FAIL" : "VERIFIED — PASS"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {cert.instruments ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {cert.instruments.category}
                            </div>
                            <div className="font-mono text-[12px] text-slate-500">
                              SN: {cert.instruments.serial_number} ({cert.instruments.public_code})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Instrument ID: {cert.instrument_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[13px]">
                        {new Date(cert.issued_at || cert.valid_from).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 text-[13px]">
                        {isFailed ? (
                          <div>
                            <div className="font-semibold text-red-600">NOT VERIFIED</div>
                            <div className="text-[11px] text-slate-400">Failed Tolerance Assessment</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">
                              {cert.valid_until ? `Until ${new Date(cert.valid_until).toLocaleDateString()}` : "—"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              From {new Date(cert.valid_from).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[13px]">
                        {cert.verification_authorities?.name || "Legal Metrology Dept"}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={isFailed ? "failed" : cert.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCert(cert)}
                            className="h-8 text-[12px]"
                          >
                            <Eye className="size-3.5 mr-1" aria-hidden="true" />
                            View
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[#000080]"
                            title="Public Verification Link"
                          >
                            <Link to="/verify/$code" params={{ code: cert.verification_code }}>
                              <ExternalLink className="size-3.5" aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredCerts.map((cert) => {
              const isFailed = cert.status === "failed" || cert.certificate_number.startsWith("VR-");
              return (
                <div key={cert.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[13px] font-bold text-[#000080]">
                        {cert.certificate_number}
                      </span>
                      <h3 className="font-bold text-slate-900 text-[15px]">
                        {cert.instruments?.category || "Instrument"}
                      </h3>
                      <p className="font-mono text-[12px] text-slate-500">
                        SN: {cert.instruments?.serial_number || "—"}
                      </p>
                    </div>
                    <StatusBadge status={isFailed ? "failed" : cert.status} size="sm" />
                  </div>

                  <div className="text-[12px] text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                    {isFailed ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Result:</span>
                        <span className="font-bold text-red-600">NOT VERIFIED — FAIL</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valid Until:</span>
                        <span className="font-semibold text-slate-800">
                          {cert.valid_until ? new Date(cert.valid_until).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verification Date:</span>
                      <span>{new Date(cert.issued_at || cert.valid_from).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCert(cert)}
                      className="flex-1 h-8 text-[12px]"
                    >
                      <Eye className="size-3.5 mr-1" aria-hidden="true" />
                      View {isFailed ? "Result" : "Certificate"}
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-[12px] bg-[#000080] text-white hover:bg-[#000080]/90"
                    >
                      <Link to="/verify/$code" params={{ code: cert.verification_code }}>
                        <ExternalLink className="size-3.5 mr-1" aria-hidden="true" />
                        Verify Link
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OFFICIAL CERTIFICATE / RESULT DETAILS MODAL */}
      <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedCert ? (() => {
            const isFailed = selectedCert.status === "failed" || selectedCert.certificate_number.startsWith("VR-");
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="size-5 text-[#ff671f]" aria-hidden="true" />
                      <DialogTitle className="text-lg font-bold text-slate-900">
                        {isFailed
                          ? "Legal Metrology Verification Result"
                          : "Certificate of Legal Metrology Verification"}
                      </DialogTitle>
                    </div>
                    <StatusBadge status={isFailed ? "failed" : selectedCert.status} size="sm" />
                  </div>
                  <DialogDescription className="sr-only">
                    Official legal metrology certificate details for commercial instrument.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-[14px]">
                  {/* Dual Accent Bar */}
                  <div
                    className="grid h-1.5 w-full grid-cols-2 rounded-full overflow-hidden"
                    aria-hidden="true"
                  >
                    <div className="bg-[#ff671f]" />
                    <div className={isFailed ? "bg-red-600" : "bg-[#138808]"} />
                  </div>

                  {/* Certificate Header Banner */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {isFailed ? "Official Verification Result Number" : "Official Certificate Number"}
                    </span>
                    <span className="font-mono text-[20px] font-extrabold text-[#000080] block mt-0.5">
                      {selectedCert.certificate_number}
                    </span>
                    <span className="text-[12px] text-slate-600 block mt-1">
                      {isFailed
                        ? "Assessment completed under the Legal Metrology Act, 2009 — NOT VERIFIED"
                        : "Issued under the provisions of the Legal Metrology Act, 2009 — VERIFIED"}
                    </span>
                  </div>

                  {/* Public Verification Identity */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">
                        Public Verification Security Code
                      </span>
                      <span className="font-mono text-[16px] font-bold text-[#000080]">
                        {selectedCert.verification_code}
                      </span>
                      <span className="text-[12px] text-slate-500 block mt-0.5">
                        Anyone can verify this record at e-Maap Public Portal
                      </span>
                    </div>
                    <Button
                      asChild
                      className="bg-[#000080] text-white hover:bg-[#000080]/90 text-[12px]"
                    >
                      <Link to="/verify/$code" params={{ code: selectedCert.verification_code }}>
                        <ExternalLink className="size-3.5 mr-1" aria-hidden="true" />
                        Open Public Record
                      </Link>
                    </Button>
                  </div>

                  {/* Instrument & Validity Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Category
                      </span>
                      <span className="font-semibold text-slate-900">
                        {selectedCert.instruments?.category}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Serial Number
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {selectedCert.instruments?.serial_number}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Manufacturer & Model
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedCert.instruments?.manufacturer} {selectedCert.instruments?.model}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Capacity / Interval
                      </span>
                      <span className="font-medium text-slate-900">
                        {selectedCert.instruments?.capacity_value
                          ? `${selectedCert.instruments.capacity_value} ${selectedCert.instruments.capacity_unit || selectedCert.instruments.unit}`
                          : selectedCert.instruments?.unit}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Verification Date
                      </span>
                      <span className="font-medium text-slate-900">
                        {new Date(selectedCert.issued_at || selectedCert.valid_from).toLocaleDateString()}
                      </span>
                    </div>
                    {!isFailed && selectedCert.valid_until ? (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                          Valid Until
                        </span>
                        <span className="font-semibold text-[#138808]">
                          {new Date(selectedCert.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                        <span className="text-red-500 block text-[11px] font-semibold uppercase">
                          Outcome
                        </span>
                        <span className="font-bold text-red-700">
                          NOT VERIFIED — FAIL
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conditions or Failure Reason */}
                  {isFailed ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px]">
                      <span className="text-red-500 block text-[11px] font-semibold uppercase">
                        Assessment Summary / Failure Note
                      </span>
                      <p className="text-red-800 mt-0.5 font-medium">
                        {selectedCert.status_reason || "Instrument did not meet statutory legal metrology tolerance requirements."}
                      </p>
                    </div>
                  ) : selectedCert.conditions ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                        Endorsement Conditions
                      </span>
                      <p className="text-slate-700 mt-0.5">{selectedCert.conditions}</p>
                    </div>
                  ) : null}

                  {/* Authority Info */}
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-[13px] flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] font-semibold block uppercase">
                        Issuing Authority
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedCert.verification_authorities?.name || "Legal Metrology Department"}
                      </span>
                    </div>
                    <ShieldCheck className={cn("size-6", isFailed ? "text-red-600" : "text-[#138808]")} aria-hidden="true" />
                  </div>
                </div>
              </>
            );
          })() : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="border-slate-300 text-slate-700"
            >
              <Printer className="size-4 mr-1.5" aria-hidden="true" />
              Print Certificate
            </Button>
            <Button variant="outline" onClick={() => setSelectedCert(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
