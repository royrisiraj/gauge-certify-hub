import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Loader2,
  Eye,
  Calendar,
  Building2,
  Scale,
  ShieldCheck,
  XCircle,
  Check,
  X,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type RequestRow = {
  id: string;
  instrument_id: string;
  business_id: string;
  authority_id: string | null;
  status: string;
  request_type: string;
  reason: string | null;
  rejected_reason: string | null;
  submitted_at: string;
  assigned_at: string | null;
  updated_at: string;
  instruments?: {
    id: string;
    public_code: string;
    serial_number: string;
    category: string;
    manufacturer: string;
    model: string;
    unit: string;
  } | null;
  verification_authorities?: {
    name: string;
    jurisdiction_label: string | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/business/requests")({
  head: () => ({
    meta: [
      { title: "Verification Requests — e-Maap" },
      {
        name: "description",
        content:
          "Track verification, stamping, and legal metrology inspection requests for commercial equipment.",
      },
    ],
  }),
  component: BusinessRequestsPage,
});

function BusinessRequestsPage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const businessId = account?.businessId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Request Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);

  // New Request Dialog State
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState("");
  const [requestType, setRequestType] = useState("periodic");
  const [requestReason, setRequestReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // IDs for accessibility
  const instSelectId = useId();
  const reqTypeId = useId();
  const reqReasonId = useId();

  // Query Requests
  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ["emaap", "business", "requests", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("verification_requests")
        .select(
          `
          id,
          instrument_id,
          business_id,
          authority_id,
          status,
          request_type,
          reason,
          rejected_reason,
          submitted_at,
          assigned_at,
          updated_at,
          instruments(
            id,
            public_code,
            serial_number,
            category,
            manufacturer,
            model,
            unit
          ),
          verification_authorities(
            name,
            jurisdiction_label
          )
        `,
        )
        .eq("business_id", businessId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as RequestRow[]) ?? [];
    },
    enabled: !!businessId,
  });

  // Query Instruments for the "New Request" dropdown
  const { data: availableInstruments = [] } = useQuery({
    queryKey: ["emaap", "business", "instruments", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("instruments")
        .select("id, public_code, serial_number, category, manufacturer, model")
        .eq("business_id", businessId)
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId && isNewRequestOpen,
  });

  // Mutation to Submit Request
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Missing business profile");
      if (!selectedInstrumentId) throw new Error("Please select an instrument");

      const { error } = await supabase.from("verification_requests").insert({
        business_id: businessId,
        instrument_id: selectedInstrumentId,
        request_type: requestType,
        reason: requestReason.trim() || null,
        status: "submitted",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "business"] });
      setIsNewRequestOpen(false);
      setSelectedInstrumentId("");
      setRequestReason("");
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create verification request");
    },
  });

  const isLoading = accountLoading || requestsLoading;

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      searchQuery === "" ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.instruments &&
        (req.instruments.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.instruments.public_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.instruments.category.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">
          Loading verification requests…
        </p>
      </div>
    );
  }

  if (requestsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertTriangle className="mx-auto size-8 text-red-600" aria-hidden="true" />
        <h2 className="mt-2 text-lg font-bold">Unable to load requests</h2>
        <p className="mt-1 text-sm">
          {requestsError instanceof Error ? requestsError.message : "Database error"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 w-full">
      <PageHeader
        title="Verification Requests"
        description="Track formal requests submitted to Legal Metrology authorities for initial or periodic stamping."
        crumbs={[
          { label: "Dashboard", to: "/business/dashboard" },
          { label: "Verification requests" },
        ]}
        actions={
          <Button
            onClick={() => {
              setFormError(null);
              setIsNewRequestOpen(true);
            }}
            className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm font-medium"
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            New Request
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
        <div className="relative flex-1 max-w-md min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, serial number, code…"
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
            <SelectTrigger id="status-filter" className="w-full sm:w-[180px] text-[13px] border-slate-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No verification requests"
          description="Submit a verification request for your registered instruments to initiate inspection by a Legal Metrology Officer."
          action={
            <Button
              onClick={() => setIsNewRequestOpen(true)}
              className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm"
            >
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              Submit Verification Request
            </Button>
          }
        />
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="text-[15px] font-medium">No requests match your filter criteria.</p>
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0 max-w-full">
          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[12px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Request Ref</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 text-[13px] whitespace-nowrap">
                      REQ-{req.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      {req.instruments ? (
                        <div>
                          <div className="font-semibold text-slate-900 break-words">
                            {req.instruments.category}
                          </div>
                          <div className="font-mono text-[12px] text-slate-500 break-words">
                            SN: {req.instruments.serial_number} ({req.instruments.public_code})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Instrument ID: {req.instrument_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 capitalize">
                      {req.request_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[13px]">
                      {new Date(req.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-700">
                      {req.status === "submitted" && "Awaiting officer assignment"}
                      {req.status === "assigned" && "Assigned to LMO Officer"}
                      {req.status === "under_review" && "Physical inspection underway"}
                      {req.status === "completed" && "Decision recorded"}
                      {req.status === "rejected" && "Request rejected"}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(req)}
                        className="h-8 text-[12px]"
                      >
                        <Eye className="size-3.5 mr-1" aria-hidden="true" />
                        Track
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[12px] font-bold text-slate-800">
                      REQ-{req.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="font-bold text-slate-900 text-[15px]">
                      {req.instruments?.category || "Instrument"}
                    </h3>
                    <p className="font-mono text-[12px] text-slate-500">
                      SN: {req.instruments?.serial_number || "—"}
                    </p>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <div className="text-[12px] text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="capitalize font-medium">
                      {req.request_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submitted:</span>
                    <span>{new Date(req.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(req)}
                  className="w-full h-8 text-[12px]"
                >
                  <Eye className="size-3.5 mr-1" aria-hidden="true" />
                  View Progress & Details
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REQUEST DETAIL & TIMELINE MODAL */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Request Progress Tracker</span>
              {selectedRequest ? <StatusBadge status={selectedRequest.status} size="sm" /> : null}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600 font-mono">
              Ref: REQ-{selectedRequest?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest ? (
            <div className="space-y-5 py-2 text-[14px]">
              {/* Stepper / Progress Timeline */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-600">
                  Verification Lifecycle Stage
                </h4>

                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-[#138808] text-white text-[12px] font-bold">
                      <Check className="size-3.5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-[13px]">
                        Request Submitted
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {new Date(selectedRequest.submitted_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        selectedRequest.status === "submitted"
                          ? "border border-slate-300 bg-white text-slate-400"
                          : "bg-[#138808] text-white"
                      }`}
                    >
                      {selectedRequest.status === "submitted" ? (
                        "2"
                      ) : (
                        <Check className="size-3.5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-[13px]">
                        Officer Assigned
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {selectedRequest.assigned_at
                          ? `Assigned on ${new Date(selectedRequest.assigned_at).toLocaleDateString()}`
                          : "Awaiting inspection assignment by authority"}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        selectedRequest.status === "under_review" ||
                        selectedRequest.status === "completed"
                          ? "bg-[#138808] text-white"
                          : "border border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {selectedRequest.status === "completed" ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        "3"
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-[13px]">
                        Physical Stamping & Tolerance Test
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {selectedRequest.status === "under_review"
                          ? "Officer conducting field tests and standard comparison"
                          : selectedRequest.status === "completed"
                            ? "Tolerance measurements completed"
                            : "Scheduled upon officer arrival"}
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        selectedRequest.status === "completed"
                          ? "bg-[#138808] text-white"
                          : selectedRequest.status === "rejected"
                            ? "bg-red-600 text-white"
                            : "border border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {selectedRequest.status === "completed" ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : selectedRequest.status === "rejected" ? (
                        <X className="size-3.5" aria-hidden="true" />
                      ) : (
                        "4"
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-[13px]">
                        {selectedRequest.status === "rejected"
                          ? "Request Rejected"
                          : "Certification & Decision"}
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {selectedRequest.status === "completed"
                          ? "Certificate generated and published in registry"
                          : selectedRequest.status === "rejected"
                            ? selectedRequest.rejected_reason || "Requirements not satisfied"
                            : "Final certificate issued upon passing"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instrument Information */}
              {selectedRequest.instruments ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Associated Instrument
                  </span>
                  <div className="font-bold text-slate-900 text-[15px]">
                    {selectedRequest.instruments.category}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Manufacturer:</span>
                      <span>
                        {selectedRequest.instruments.manufacturer}{" "}
                        {selectedRequest.instruments.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Serial Number:</span>
                      <span className="font-mono">{selectedRequest.instruments.serial_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Public Code:</span>
                      <span className="font-mono text-[#000080] font-semibold">
                        {selectedRequest.instruments.public_code}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Request Type:</span>
                      <span className="capitalize">
                        {selectedRequest.request_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              {selectedRequest.reason ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Business Notes
                  </span>
                  <p className="text-slate-700 mt-0.5">{selectedRequest.reason}</p>
                </div>
              ) : null}

              {/* Authority Information */}
              {selectedRequest.verification_authorities ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-[13px] flex items-center gap-2.5">
                  <Building2 className="size-4 text-[#000080]" aria-hidden="true" />
                  <div>
                    <span className="text-slate-500 text-[11px] font-semibold block uppercase">
                      Verification Authority
                    </span>
                    <span className="font-semibold text-slate-900">
                      {selectedRequest.verification_authorities.name}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW REQUEST SUBMISSION DIALOG */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Submit Verification Request
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Schedule official inspection and stamping for a registered commercial instrument.
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="space-y-4 py-2 text-[14px]">
            {/* Instrument Selection */}
            <div>
              <Label htmlFor={instSelectId} className="text-[13px] font-semibold text-slate-700">
                Select Instrument <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedInstrumentId} onValueChange={setSelectedInstrumentId}>
                <SelectTrigger id={instSelectId} className="mt-1">
                  <SelectValue placeholder="Choose an instrument…" />
                </SelectTrigger>
                <SelectContent>
                  {availableInstruments.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.category} (SN: {inst.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableInstruments.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-amber-700">
                  You haven't registered any instruments yet.{" "}
                  <Link
                    to="/business/instruments"
                    search={{ register: true }}
                    className="underline font-semibold"
                  >
                    Register one first
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            {/* Request Type */}
            <div>
              <Label htmlFor={reqTypeId} className="text-[13px] font-semibold text-slate-700">
                Request Category
              </Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger id={reqTypeId} className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="periodic">Periodic Stamping / Annual Verification</SelectItem>
                  <SelectItem value="initial">Initial Stamping (New Commissioning)</SelectItem>
                  <SelectItem value="post_repair">Post-Repair Re-verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor={reqReasonId} className="text-[13px] font-semibold text-slate-700">
                Inspection Remarks / Operating Hours (Optional)
              </Label>
              <Textarea
                id={reqReasonId}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Current stamp expired last month. Shop open daily from 9:30 AM."
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsNewRequestOpen(false)}
              disabled={createRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createRequestMutation.mutate()}
              disabled={createRequestMutation.isPending || !selectedInstrumentId}
              className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium"
            >
              {createRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
