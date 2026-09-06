import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertOctagon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
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
import { formatDate } from "@/lib/emaap/format";
import type { Database } from "@/integrations/supabase/types";

type CertStatus = Database["public"]["Enums"]["cert_status"];

type CertificateRow = {
  id: string;
  certificate_number: string;
  verification_code: string;
  status: CertStatus;
  status_reason: string | null;
  valid_from: string;
  valid_until: string;
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
    businesses?: {
      name: string;
      city: string | null;
    } | null;
  } | null;
  verification_authorities?: {
    name: string;
    jurisdiction_label: string | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/authority/certificates")({
  head: () => ({
    meta: [
      { title: "Issued Certificates — e-Maap Authority" },
      {
        name: "description",
        content:
          "Official legal metrology verification certificates issued under this jurisdiction.",
      },
    ],
  }),
  component: AuthorityCertificatesPage,
});

function AuthorityCertificatesPage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const authorityId = account?.authorityId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCert, setSelectedCert] = useState<CertificateRow | null>(null);

  // Status management modal
  const [manageCert, setManageCert] = useState<CertificateRow | null>(null);
  const [newStatus, setNewStatus] = useState<CertStatus>("active");
  const [statusReason, setStatusReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  // Query Certificates
  const {
    data: certificates = [],
    isLoading: certsLoading,
    error: certsError,
  } = useQuery({
    queryKey: ["emaap", "authority", "certificates-all", authorityId],
    queryFn: async () => {
      let query = supabase
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
            businesses(
              name,
              city
            )
          ),
          verification_authorities(
            name,
            jurisdiction_label
          )
        `,
        )
        .order("issued_at", { ascending: false });

      if (authorityId) {
        query = query.or(`authority_id.is.null,authority_id.eq.${authorityId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as CertificateRow[]) ?? [];
    },
    enabled: true,
  });

  // Mutation to update certificate status
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!manageCert) return;
      if (!statusReason.trim()) {
        throw new Error("A reason is required to update certificate status");
      }

      const { error } = await supabase.rpc("set_certificate_status", {
        p_certificate_id: manageCert.id,
        p_status: newStatus,
        p_reason: statusReason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority", "certificates"] });
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority", "certificates-all"] });
      setManageCert(null);
      setStatusReason("");
      setStatusError(null);
    },
    onError: (err: Error) => {
      setStatusError(err.message || "Failed to update status");
    },
  });

  const isLoading = accountLoading || certsLoading;

  const filteredCerts = certificates.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      c.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.verification_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.instruments &&
        (c.instruments.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.instruments.public_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.instruments.businesses?.name.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getVerificationUrl = (code: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/verify/${code}`;
    }
    return `https://emaap.gov.in/verify/${code}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Certificates"
        description="Official legal metrology compliance certificates issued by this authority."
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="cert-search"
            placeholder="Search by certificate #, code, serial or business…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "active", "suspended", "revoked"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="text-xs capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {certsError ? (
        <div className="surface-card flex items-center gap-3 border-error/30 bg-error-subtle p-4">
          <AlertTriangle className="size-5 text-error" />
          <p className="text-sm text-error">Failed to load certificates: {(certsError as Error).message}</p>
        </div>
      ) : filteredCerts.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates found"
          description={
            searchQuery || statusFilter !== "all"
              ? "No certificates match your search filters."
              : "No legal metrology certificates have been issued yet."
          }
        />
      ) : (
        <div className="surface-card divide-y divide-slate-100">
          {filteredCerts.map((cert) => (
            <div
              key={cert.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-emerald-600" />
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {cert.certificate_number}
                  </p>
                  <StatusBadge status={cert.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500">
                  {cert.instruments?.businesses?.name ?? "Business"}
                  {cert.instruments?.businesses?.city ? `, ${cert.instruments.businesses.city}` : ""} ·{" "}
                  {cert.instruments?.category ?? "Instrument"} (SN: {cert.instruments?.serial_number ?? "—"})
                </p>
                <p className="text-[11px] text-slate-400">
                  Valid: {formatDate(cert.valid_from)} to {formatDate(cert.valid_until)} · Code:{" "}
                  <span className="font-mono">{cert.verification_code}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => setSelectedCert(cert)}
                >
                  <Eye className="size-3.5" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs text-slate-600"
                  onClick={() => {
                    setManageCert(cert);
                    setNewStatus(cert.status);
                    setStatusReason(cert.status_reason || "");
                    setStatusError(null);
                  }}
                >
                  Manage Status
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View Certificate Dialog ── */}
      <Dialog open={!!selectedCert} onOpenChange={(open) => !open && setSelectedCert(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedCert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <Award className="size-5 text-emerald-600" />
                  {selectedCert.certificate_number}
                </DialogTitle>
                <DialogDescription>
                  Official Legal Metrology Verification Certificate
                </DialogDescription>
              </DialogHeader>

              <div className="my-2 flex flex-col items-center justify-center rounded-lg bg-slate-50 p-4 border border-slate-200">
                <QRCodeSVG
                  value={getVerificationUrl(selectedCert.verification_code)}
                  size={140}
                  level="M"
                />
                <p className="mt-2 font-mono text-xs font-semibold tracking-wider text-slate-700">
                  {selectedCert.verification_code}
                </p>
                <p className="text-[11px] text-slate-400">Scan to verify authenticity publicly</p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Business:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCert.instruments?.businesses?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Instrument:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCert.instruments?.category} (SN: {selectedCert.instruments?.serial_number})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Validity:</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(selectedCert.valid_from)} — {formatDate(selectedCert.valid_until)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={selectedCert.status} size="sm" />
                </div>
                {selectedCert.conditions && (
                  <div className="py-1">
                    <span className="text-slate-500">Conditions:</span>
                    <p className="mt-0.5 text-slate-700 bg-amber-50 p-2 rounded border border-amber-200">
                      {selectedCert.conditions}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1 text-xs"
                >
                  <Printer className="size-3.5" />
                  Print
                </Button>
                <Link
                  to="/verify/$code"
                  params={{ code: selectedCert.verification_code }}
                  target="_blank"
                >
                  <Button size="sm" className="gap-1 text-xs bg-[#000080] text-white">
                    <ExternalLink className="size-3.5" />
                    Public Verification Link
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manage Certificate Status Dialog ── */}
      <Dialog open={!!manageCert} onOpenChange={(open) => !open && setManageCert(null)}>
        <DialogContent className="sm:max-w-md">
          {manageCert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <AlertOctagon className="size-5 text-amber-600" />
                  Update Certificate Status
                </DialogTitle>
                <DialogDescription>
                  Modify status for Certificate #{manageCert.certificate_number}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">New Status</Label>
                  <Select
                    value={newStatus}
                    onValueChange={(val) => setNewStatus(val as CertStatus)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Verified / Valid)</SelectItem>
                      <SelectItem value="suspended">Suspended (Temporary hold)</SelectItem>
                      <SelectItem value="revoked">Revoked (Invalidated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Reason / Official Order Note <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Seal tampering discovered during routine surprise inspection"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>

                {statusError && (
                  <p className="text-xs text-red-600 font-medium">{statusError}</p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManageCert(null)}
                  disabled={updateStatusMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#000080] text-white"
                  disabled={updateStatusMutation.isPending || !statusReason.trim()}
                  onClick={() => updateStatusMutation.mutate()}
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                      Saving…
                    </>
                  ) : (
                    "Confirm Status Update"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
