import { createFileRoute } from "@tanstack/react-router";
import { useState, useId, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  Scale,
  Calendar,
  Clock,
  Search,
  ShieldCheck,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck2,
  Building2,
  FileText,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { StatusBadge } from "@/components/emaap/StatusBadge";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, measurementText, signedText, withUnit } from "@/lib/emaap/format";

// ── Types ──

type VerifyRow = {
  id: string;
  status: string;
  request_type: string;
  submitted_at: string;
  assigned_at: string | null;
  assigned_to: string | null;
  instrument_id: string;
  business_id: string;
  reason: string | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  tolerance_rule_id: string | null;
  instruments: {
    id: string;
    public_code: string;
    serial_number: string;
    category: string;
    manufacturer: string;
    model: string;
    capacity_value: number | null;
    capacity_unit: string | null;
    resolution_value: number | null;
    unit: string;
    location_label: string | null;
  } | null;
  businesses: {
    name: string;
    city: string | null;
    address_line: string | null;
    contact_phone: string | null;
  } | null;
};

type ToleranceRule = {
  id: string;
  name: string;
  category: string;
  tolerance_type: string;
  tolerance_value: number;
  unit: string;
  near_boundary_fraction: number;
  source_note: string | null;
};

type InspectionRow = {
  id: string;
  request_id: string;
  instrument_id: string;
  inspector_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  notes: string | null;
  tolerance_rule_id: string | null;
};

type MeasurementRow = {
  id: string;
  inspection_id: string;
  point_index: number;
  reference_value: number;
  observed_value: number;
  deviation: number | null;
  tolerance_applied: number | null;
  result: string | null;
  unit: string;
  note: string | null;
};

type DecisionRow = {
  id: string;
  inspection_id: string;
  request_id: string;
  instrument_id: string;
  decision: string;
  calculated_result: string;
  conditions: string | null;
  override_reason: string | null;
  decided_at: string;
  decided_by: string;
};

// ── Route ──

export const Route = createFileRoute("/_authenticated/authority/verify")({
  head: () => ({
    meta: [
      { title: "Verify Instruments — e-Maap Authority" },
      {
        name: "description",
        content:
          "Conduct physical inspections, record measurements, and issue verification decisions for assigned instruments.",
      },
    ],
  }),
  component: AuthorityVerifyPage,
});

// ── Main Component ──

function AuthorityVerifyPage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const userId = account?.userId;
  const authorityId = account?.authorityId;

  const [search, setSearch] = useState("");
  const [activeRequest, setActiveRequest] = useState<VerifyRow | null>(null);

  // ── Assigned requests ready for verification ──
  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ["emaap", "authority", "verify-queue", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("verification_requests")
        .select(
          `id, status, request_type, submitted_at, assigned_at, assigned_to,
           instrument_id, business_id, reason, preferred_date, preferred_time_slot, tolerance_rule_id,
           instruments(id, public_code, serial_number, category, manufacturer, model, capacity_value, capacity_unit, resolution_value, unit, location_label),
           businesses(name, city, address_line, contact_phone)`,
        )
        .eq("assigned_to", userId)
        .in("status", ["assigned", "under_review"])
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VerifyRow[];
    },
    enabled: !!userId,
  });

  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.instruments?.public_code?.toLowerCase().includes(q) ||
      r.instruments?.serial_number?.toLowerCase().includes(q) ||
      r.instruments?.category?.toLowerCase().includes(q) ||
      r.businesses?.name?.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  if (accountLoading || requestsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">Loading verification assignments…</p>
      </div>
    );
  }

  // ── Detail / Inspection View ──
  if (activeRequest) {
    return (
      <InspectionView
        request={activeRequest}
        userId={userId!}
        authorityId={authorityId ?? null}
        onBack={() => {
          setActiveRequest(null);
          queryClient.invalidateQueries({ queryKey: ["emaap", "authority", "verify-queue"] });
        }}
      />
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Instruments"
        description="Conduct inspections, record measurements, and issue verification decisions for your assigned requests."
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="verify-search"
            placeholder="Search by instrument, business, or request ID…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="text-xs">
          {filtered.length} assignment{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {requestsError ? (
        <div className="surface-card flex items-center gap-3 border-error/30 bg-error-subtle p-4">
          <AlertTriangle className="size-5 text-error" />
          <p className="text-sm text-error">
            Failed to load assignments: {(requestsError as Error).message}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={search ? "No matching assignments" : "No assignments to verify"}
          description={
            search
              ? "No assignments match your search criteria."
              : "All your assigned verification requests have been completed. Claim new requests from the Queue."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer border border-slate-200 rounded-xl"
              onClick={() => setActiveRequest(req)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveRequest(req);
                }
              }}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-[#000080]" aria-hidden="true" />
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {req.instruments?.category ?? "Instrument"}
                  </p>
                  <Badge variant="outline" className="text-[11px]">
                    {req.request_type.replace(/_/g, " ")}
                  </Badge>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Business:</span>{" "}
                    <span className="font-medium text-slate-700">{req.businesses?.name ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Serial No:</span>{" "}
                    <span className="font-mono font-medium text-slate-700">
                      {req.instruments?.serial_number ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Code:</span>{" "}
                    <span className="font-mono font-semibold text-[#000080]">
                      {req.instruments?.public_code ?? "—"}
                    </span>
                  </div>
                </div>

                {(req.preferred_date || req.preferred_time_slot) && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                    {req.preferred_date && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-[#000080] border border-blue-200">
                        <Calendar className="size-3.5 text-[#000080]" aria-hidden="true" />
                        <span>{formatDate(req.preferred_date)}</span>
                      </span>
                    )}
                    {req.preferred_time_slot && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-800 border border-slate-200">
                        <Clock className="size-3.5 text-slate-600" aria-hidden="true" />
                        <span>{req.preferred_time_slot}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-[#000080] hover:bg-[#000080]/90 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRequest(req);
                  }}
                >
                  <ShieldCheck className="size-3.5" />
                  Verify
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// INSPECTION VIEW — full inspection workflow for a single request
// ════════════════════════════════════════════════════════════════════════════════

function InspectionView({
  request,
  userId,
  authorityId,
  onBack,
}: {
  request: VerifyRow;
  userId: string;
  authorityId: string | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const inst = request.instruments;
  const biz = request.businesses;

  // ── State for decision dialog ──
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [decisionType, setDecisionType] = useState<"verified" | "verified_with_conditions" | "failed">("verified");
  const [decisionConditions, setDecisionConditions] = useState("");
  const [decisionOverride, setDecisionOverride] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // ── State for certificate dialog ──
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [certSuccess, setCertSuccess] = useState(false);

  // ── State for measurement form ──
  const [newRefValue, setNewRefValue] = useState("");
  const [newObsValue, setNewObsValue] = useState("");
  const [newMeasNote, setNewMeasNote] = useState("");
  const [measError, setMeasError] = useState<string | null>(null);

  // ── State for inspection notes ──
  const [inspectionNotes, setInspectionNotes] = useState("");

  // ── IDs for accessibility ──
  const refId = useId();
  const obsId = useId();
  const noteId = useId();

  // ── Load all configured tolerance rules ──
  const { data: allToleranceRules = [], isLoading: toleranceLoading } = useQuery({
    queryKey: ["emaap", "tolerance-rules", authorityId],
    queryFn: async () => {
      let query = supabase
        .from("tolerance_rules")
        .select("id, name, category, tolerance_type, tolerance_value, unit, near_boundary_fraction, source_note")
        .order("is_demo", { ascending: true })
        .order("created_at", { ascending: true });

      if (authorityId) {
        query = query.or(`authority_id.is.null,authority_id.eq.${authorityId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ToleranceRule[];
    },
  });

  // Filter and prioritize rules for this instrument category and its aliases
  const toleranceRules = useMemo(() => {
    if (!inst) return [];
    const catLower = inst.category.toLowerCase();

    const matchesCategory = (ruleCat: string) => {
      if (ruleCat === inst.category) return true;
      const rcLower = ruleCat.toLowerCase();
      if (
        (catLower.includes("nawi") || catLower.includes("scale") || catLower.includes("weighing")) &&
        (rcLower.includes("nawi") || rcLower.includes("scale") || rcLower.includes("weighing")) &&
        !rcLower.includes("catchweigh") &&
        !catLower.includes("catchweigh")
      )
        return true;
      if (
        (catLower.includes("catchweigh") || catLower.includes("automatic")) &&
        (rcLower.includes("catchweigh") || rcLower.includes("automatic"))
      )
        return true;
      if (
        (catLower.includes("dispenser") || catLower.includes("flow") || catLower.includes("volumetric") || catLower.includes("volume")) &&
        (rcLower.includes("dispenser") || rcLower.includes("flow") || rcLower.includes("volumetric") || rcLower.includes("volume"))
      )
        return true;
      if (
        (catLower.includes("tank") || catLower.includes("storage")) &&
        (rcLower.includes("tank") || rcLower.includes("storage"))
      )
        return true;
      if (
        (catLower.includes("length") || catLower.includes("linear") || catLower.includes("meter")) &&
        (rcLower.includes("length") || rcLower.includes("linear") || rcLower.includes("meter"))
      )
        return true;
      if (
        catLower.includes("weight") &&
        rcLower.includes("weight") &&
        !rcLower.includes("weighing") &&
        !rcLower.includes("catchweigh")
      )
        return true;
      if (catLower.includes("weighbridge") && rcLower.includes("weighbridge")) return true;
      return false;
    };

    const specificRules = allToleranceRules.filter((r) => matchesCategory(r.category));
    const fallbackRules = allToleranceRules.filter((r) => r.category === "Other Legal Metrology Equipment");

    if (specificRules.length > 0) {
      const matchingUnit = specificRules.filter((r) => r.unit === inst.unit);
      const otherUnits = specificRules.filter((r) => r.unit !== inst.unit);
      return [...matchingUnit, ...otherUnits, ...fallbackRules];
    }
    return fallbackRules.length > 0 ? fallbackRules : allToleranceRules;
  }, [allToleranceRules, inst]);

  // Default matching rule prioritizing specific non-fallback rules first
  const defaultMatchedRule = useMemo(() => {
    if (!toleranceRules.length) return undefined;
    const nonFallback = toleranceRules.filter((r) => r.category !== "Other Legal Metrology Equipment");
    const pool = nonFallback.length > 0 ? nonFallback : toleranceRules;

    return (
      pool.find((r) => r.category === inst?.category && r.unit === inst?.unit) ??
      pool.find((r) => r.unit === inst?.unit) ??
      pool[0] ??
      toleranceRules[0]
    );
  }, [toleranceRules, inst]);

  const [selectedToleranceId, setSelectedToleranceId] = useState<string>("");

  // ── Load existing inspection for this request ──
  const {
    data: inspection,
    isLoading: inspectionLoading,
    refetch: refetchInspection,
  } = useQuery({
    queryKey: ["emaap", "inspection", request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id, request_id, instrument_id, inspector_id, status, started_at, submitted_at, notes, tolerance_rule_id")
        .eq("request_id", request.id)
        .eq("inspector_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InspectionRow | null;
    },
  });

  // ── Load measurements for active inspection ──
  const {
    data: measurements = [],
    refetch: refetchMeasurements,
  } = useQuery({
    queryKey: ["emaap", "measurements", inspection?.id],
    queryFn: async () => {
      if (!inspection) return [];
      const { data, error } = await supabase
        .from("measurements")
        .select("id, inspection_id, point_index, reference_value, observed_value, deviation, tolerance_applied, result, unit, note")
        .eq("inspection_id", inspection.id)
        .order("point_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeasurementRow[];
    },
    enabled: !!inspection,
  });

  // ── Load existing decision ──
  const { data: existingDecision, refetch: refetchDecision } = useQuery({
    queryKey: ["emaap", "decision", request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_decisions")
        .select("id, inspection_id, request_id, instrument_id, decision, calculated_result, conditions, override_reason, decided_at, decided_by")
        .eq("request_id", request.id)
        .order("decided_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DecisionRow | null;
    },
  });

  // ── Create Inspection mutation ──
  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      if (!inst) throw new Error("Missing instrument data");

      const ruleToUse = selectedToleranceId || defaultMatchedRule?.id;
      const insertPayload: {
        request_id: string;
        instrument_id: string;
        inspector_id: string;
        status: string;
        tolerance_rule_id?: string;
      } = {
        request_id: request.id,
        instrument_id: request.instrument_id,
        inspector_id: userId,
        status: "in_progress",
      };

      if (ruleToUse) {
        insertPayload.tolerance_rule_id = ruleToUse;
      }

      const { data, error } = await supabase
        .from("inspections")
        .insert(insertPayload as never)
        .select()
        .single();
      if (error) throw error;

      // Update request status to under_review
      await supabase
        .from("verification_requests")
        .update({ status: "under_review" } as never)
        .eq("id", request.id);

      return data;
    },
    onSuccess: () => {
      refetchInspection();
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority"] });
    },
  });

  // ── Add Measurement mutation ──
  const addMeasurementMutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No active inspection");
      const ref = parseFloat(newRefValue);
      const obs = parseFloat(newObsValue);
      if (isNaN(ref)) throw new Error("Reference value must be a valid number");
      if (isNaN(obs)) throw new Error("Observed value must be a valid number");

      const deviation = obs - ref;
      const nextIndex = measurements.length + 1;

      // Find tolerance to apply
      const effectiveToleranceId = inspection.tolerance_rule_id || selectedToleranceId || defaultMatchedRule?.id;
      const activeRule = allToleranceRules.find((r) => r.id === effectiveToleranceId) ?? defaultMatchedRule;
      let toleranceApplied: number | null = null;
      let result: "pass" | "review" | "fail" | null = null;

      if (activeRule) {
        toleranceApplied = activeRule.tolerance_type === "percent"
          ? Math.abs(ref) * (activeRule.tolerance_value / 100)
          : activeRule.tolerance_value;

        // Requirement 2: Automatic Catchweighing Instrument: ±0.3% OR ±1 verification scale interval, whichever is greater
        const isCatchweigher =
          activeRule.category.toLowerCase().includes("catchweigh") ||
          activeRule.category.toLowerCase().includes("automatic weighing") ||
          (inst?.category.toLowerCase().includes("catchweigh") ?? false) ||
          (inst?.category.toLowerCase().includes("automatic weighing") ?? false);

        if (isCatchweigher && inst?.resolution_value != null && Number(inst.resolution_value) > 0) {
          toleranceApplied = Math.max(toleranceApplied, Number(inst.resolution_value));
        }

        // Requirement 5: Material Measure of Length: ±1 mm per metre (±0.1%), with minimum ±1 mm
        const isLength =
          activeRule.category.toLowerCase().includes("length") ||
          activeRule.category.toLowerCase().includes("linear") ||
          (inst?.category.toLowerCase().includes("length") ?? false) ||
          (inst?.category.toLowerCase().includes("linear") ?? false);

        if (isLength) {
          const minTol = inst?.unit === "cm" ? 0.1 : inst?.unit === "mm" ? 1.0 : 0.001; // 1 mm minimum
          toleranceApplied = Math.max(toleranceApplied, minTol);
        }

        const absDev = Math.abs(deviation);
        if (absDev <= toleranceApplied) {
          const nearBoundary = toleranceApplied * activeRule.near_boundary_fraction;
          result = absDev >= nearBoundary ? "review" : "pass";
        } else {
          result = "fail";
        }
      }

      // Proactively ensure inspection has tolerance_rule_id if it was null
      if (!inspection.tolerance_rule_id && activeRule) {
        await supabase
          .from("inspections")
          .update({ tolerance_rule_id: activeRule.id } as never)
          .eq("id", inspection.id);
      }

      const { error } = await supabase.from("measurements").insert({
        inspection_id: inspection.id,
        point_index: nextIndex,
        reference_value: ref,
        observed_value: obs,
        deviation,
        tolerance_applied: toleranceApplied,
        result,
        unit: inst?.unit ?? "kg",
        note: newMeasNote.trim() || null,
      } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewRefValue("");
      setNewObsValue("");
      setNewMeasNote("");
      setMeasError(null);
      refetchMeasurements();
    },
    onError: (err: Error) => {
      setMeasError(err.message);
    },
  });

  // ── Delete Measurement mutation ──
  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabase.from("measurements").delete().eq("id", measurementId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMeasurements();
    },
  });

  // ── Submit Inspection mutation ──
  const submitInspectionMutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No active inspection");
      if (measurements.length === 0) throw new Error("At least one measurement is required before submitting");

      const { error } = await supabase
        .from("inspections")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          notes: inspectionNotes.trim() || null,
        } as never)
        .eq("id", inspection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchInspection();
    },
  });

  // ── Record Decision mutation ──
  const recordDecisionMutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No active inspection");

      const params: {
        p_inspection_id: string;
        p_decision: "verified" | "verified_with_conditions" | "failed";
        p_conditions?: string;
        p_override_reason?: string;
      } = {
        p_inspection_id: inspection.id,
        p_decision: decisionType,
      };
      if (decisionConditions.trim()) {
        params.p_conditions = decisionConditions.trim();
      }
      if (decisionOverride.trim()) {
        params.p_override_reason = decisionOverride.trim();
      }

      const { data, error } = await supabase.rpc("record_decision", params);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      setShowDecisionDialog(false);
      setDecisionError(null);
      refetchInspection();
      refetchDecision();
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority"] });
    },
    onError: (err: Error) => {
      setDecisionError(err.message);
    },
  });

  // ── Issue Certificate mutation ──
  const issueCertificateMutation = useMutation({
    mutationFn: async () => {
      if (!existingDecision) throw new Error("No decision recorded");
      const { data, error } = await supabase.rpc("issue_certificate", {
        p_decision_id: existingDecision.id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      setCertSuccess(true);
      setCertError(null);
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority"] });
      setTimeout(() => {
        setShowCertDialog(false);
        setCertSuccess(false);
        onBack();
      }, 2000);
    },
    onError: (err: Error) => {
      setCertError(err.message);
    },
  });

  // ── Computed helpers ──
  const effectiveToleranceId = inspection?.tolerance_rule_id || selectedToleranceId || defaultMatchedRule?.id || "";
  const selectedRule = allToleranceRules.find((r) => r.id === effectiveToleranceId) ?? defaultMatchedRule;

  const passCount = measurements.filter((m) => m.result === "pass").length;
  const reviewCount = measurements.filter((m) => m.result === "review").length;
  const failCount = measurements.filter((m) => m.result === "fail").length;

  const canSubmitInspection = inspection?.status === "in_progress" && measurements.length > 0;
  const canRecordDecision = inspection?.status === "submitted" && !existingDecision;
  const canIssueCertificate =
    existingDecision &&
    (existingDecision.decision === "verified" || existingDecision.decision === "verified_with_conditions");

  // Derive suggested decision from measurement results
  const suggestedDecision: "verified" | "verified_with_conditions" | "failed" =
    failCount > 0 ? "failed" : reviewCount > 0 ? "verified_with_conditions" : "verified";

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-3 text-xs text-slate-500 hover:text-slate-700 gap-1"
        >
          <ChevronLeft className="size-3.5" />
          Back to Verify List
        </Button>
        <PageHeader
          title="Instrument Verification"
          description={`Inspection and verification for ${inst?.category ?? "instrument"} — ${inst?.serial_number ?? ""}`}
        />
      </div>

      {/* ── Request & Instrument Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Instrument Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Scale className="size-4 text-[#000080]" />
            Instrument Details
          </div>
          <div className="text-lg font-bold text-slate-900">{inst?.category ?? "—"}</div>
          <div className="grid grid-cols-2 gap-3 text-[13px] text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Manufacturer</span>
              <span className="font-medium">{inst?.manufacturer ?? "—"} {inst?.model ?? ""}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Serial Number</span>
              <span className="font-mono font-semibold">{inst?.serial_number ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Public Code</span>
              <span className="font-mono font-semibold text-[#000080]">{inst?.public_code ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Capacity</span>
              <span className="font-medium">
                {inst?.capacity_value != null ? `${inst.capacity_value} ${inst.capacity_unit ?? inst.unit}` : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Resolution</span>
              <span className="font-medium">
                {inst?.resolution_value != null ? `${inst.resolution_value} ${inst.unit}` : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Location</span>
              <span className="font-medium">{inst?.location_label ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Business & Request Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Building2 className="size-4 text-[#000080]" />
            Business & Request
          </div>
          <div className="text-lg font-bold text-slate-900">{biz?.name ?? "—"}</div>
          <div className="grid grid-cols-2 gap-3 text-[13px] text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">City</span>
              <span className="font-medium">{biz?.city ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Contact</span>
              <span className="font-medium">{biz?.contact_phone ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Verification Type</span>
              <span className="font-medium capitalize">{request.request_type.replace(/_/g, " ")}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Request Status</span>
              <StatusBadge status={request.status} size="sm" />
            </div>
          </div>

          {/* Preferred Date and Time Slot */}
          {(request.preferred_date || request.preferred_time_slot) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1.5 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#000080] block">
                Appointment Preference
              </span>
              <div className="flex flex-wrap gap-3 text-[13px]">
                {request.preferred_date && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                    <Calendar className="size-3.5 text-[#000080]" />
                    {formatDate(request.preferred_date)}
                  </span>
                )}
                {request.preferred_time_slot && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                    <Clock className="size-3.5 text-[#000080]" />
                    {request.preferred_time_slot}
                  </span>
                )}
              </div>
            </div>
          )}

          {request.reason && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[13px] mt-2">
              <span className="text-slate-400 text-[10px] font-semibold uppercase block">Business Notes</span>
              <p className="text-slate-700 mt-0.5">{request.reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Inspection Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-[#000080]" />
            <h2 className="text-base font-bold text-slate-900">Physical Inspection</h2>
          </div>
          {inspection && (
            <StatusBadge status={inspection.status} size="sm" />
          )}
        </div>

        {inspectionLoading ? (
          <div className="flex items-center gap-2 py-4 text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading inspection data…
          </div>
        ) : !inspection ? (
          /* ── Start Inspection ── */
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600">
              Start the physical inspection to begin recording measurements and observations.
            </p>

            {/* Tolerance Rule Selection or Administrative Warning */}
            {toleranceLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> Loading applicable tolerance rules…
              </div>
            ) : toleranceRules.length === 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  Administrative Configuration Required
                </div>
                <p className="text-[13px] text-amber-900 leading-relaxed">
                  No official statutory tolerance rule is configured for{" "}
                  <strong>{inst?.category ?? "this instrument"}</strong> ({inst?.unit ?? ""}).
                  Under Legal Metrology regulations, verification cannot proceed without an approved tolerance specification issued or configured by the Controller of Legal Metrology.
                </p>
                <p className="text-[12px] text-amber-700">
                  Please contact the administration authority to configure tolerance parameters for this equipment type before conducting physical verification.
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-[13px] font-semibold text-slate-700">
                  Applicable Legal Metrology Rule
                </Label>
                <Select
                  value={effectiveToleranceId}
                  onValueChange={setSelectedToleranceId}
                >
                  <SelectTrigger className="mt-1 max-w-lg bg-white">
                    <SelectValue placeholder="Select tolerance rule…" />
                  </SelectTrigger>
                  <SelectContent>
                    {toleranceRules.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name} (±{rule.tolerance_value}{rule.tolerance_type === "percent" ? "%" : ` ${rule.unit}`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRule && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-[12px] text-slate-700 space-y-1">
                    <div className="font-semibold text-[#000080] flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[#000080]" />
                      Statutory Standard: {selectedRule.name}
                    </div>
                    <p className="text-slate-600">
                      Tolerance: ±{selectedRule.tolerance_value}{selectedRule.tolerance_type === "percent" ? "%" : ` ${selectedRule.unit}`}
                      {" · "}Near-boundary: {(selectedRule.near_boundary_fraction * 100).toFixed(0)}%
                    </p>
                    {selectedRule.source_note && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Source: {selectedRule.source_note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => createInspectionMutation.mutate()}
                disabled={createInspectionMutation.isPending || toleranceRules.length === 0}
                className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium gap-1.5"
              >
                {createInspectionMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Starting…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" /> Start Inspection
                  </>
                )}
              </Button>
              {toleranceRules.length === 0 && (
                <span className="text-[12px] text-amber-700">
                  Inspection blocked: requires administrative tolerance configuration.
                </span>
              )}
            </div>
            {createInspectionMutation.error && (
              <p className="text-[13px] text-red-600">
                {(createInspectionMutation.error as Error).message}
              </p>
            )}
          </div>
        ) : (
          /* ── Active Inspection ── */
          <div className="space-y-5">
            {/* Tolerance Rule Info */}
            {selectedRule ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-[13px] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  Active Statutory Tolerance Rule
                </span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedRule.name} — ±{selectedRule.tolerance_value}{selectedRule.tolerance_type === "percent" ? "%" : ` ${selectedRule.unit}`}
                </p>
                <p className="text-slate-600 text-[12px]">
                  Type: {selectedRule.tolerance_type} · Near boundary threshold at {(selectedRule.near_boundary_fraction * 100).toFixed(0)}%
                </p>
                {selectedRule.source_note && (
                  <p className="text-[11px] text-slate-600 font-mono bg-white/70 p-2 rounded border border-emerald-100 mt-1">
                    Source: {selectedRule.source_note}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  Administrative Configuration Required
                </div>
                <p className="text-[13px] text-amber-900">
                  No tolerance rule is configured for this inspection. Recording measurements is disabled until an authorized rule is configured.
                </p>
              </div>
            )}

            {/* Measurements Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Measurement Points</h3>
              {measurements.length === 0 ? (
                <p className="text-[13px] text-slate-500 italic">
                  No measurements recorded yet. Add measurement points below.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-right">Reference</th>
                        <th className="py-2.5 px-3 text-right">Observed</th>
                        <th className="py-2.5 px-3 text-right">Deviation</th>
                        <th className="py-2.5 px-3 text-right">Tolerance</th>
                        <th className="py-2.5 px-3 text-center">Result</th>
                        <th className="py-2.5 px-3 text-left">Note</th>
                        {inspection.status === "in_progress" && (
                          <th className="py-2.5 px-3 text-center w-10"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {measurements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{m.point_index}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {withUnit(m.reference_value, m.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {withUnit(m.observed_value, m.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {signedText(m.deviation)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {m.tolerance_applied != null ? `±${m.tolerance_applied}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <MeasurementResultBadge result={m.result} />
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[120px] truncate">
                            {m.note ?? "—"}
                          </td>
                          {inspection.status === "in_progress" && (
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-slate-400 hover:text-red-600"
                                onClick={() => deleteMeasurementMutation.mutate(m.id)}
                                disabled={deleteMeasurementMutation.isPending}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Measurement Summary */}
              {measurements.length > 0 && (
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-slate-500">{measurements.length} point{measurements.length !== 1 ? "s" : ""}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="size-3" /> {passCount} pass
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertCircle className="size-3" /> {reviewCount} review
                  </span>
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <XCircle className="size-3" /> {failCount} fail
                  </span>
                </div>
              )}
            </div>

            {/* Add Measurement Form (only when in_progress) */}
            {inspection.status === "in_progress" && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Plus className="size-3.5" /> Add Measurement Point
                </h4>
                {measError && (
                  <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">{measError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={refId} className="text-[12px] font-semibold text-slate-600">
                      Reference Value ({inst?.unit ?? "unit"}) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={refId}
                      type="number"
                      step="any"
                      value={newRefValue}
                      onChange={(e) => setNewRefValue(e.target.value)}
                      placeholder="e.g. 10.000"
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor={obsId} className="text-[12px] font-semibold text-slate-600">
                      Observed Value ({inst?.unit ?? "unit"}) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={obsId}
                      type="number"
                      step="any"
                      value={newObsValue}
                      onChange={(e) => setNewObsValue(e.target.value)}
                      placeholder="e.g. 10.005"
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor={noteId} className="text-[12px] font-semibold text-slate-600">
                      Note (optional)
                    </Label>
                    <Input
                      id={noteId}
                      value={newMeasNote}
                      onChange={(e) => setNewMeasNote(e.target.value)}
                      placeholder="e.g. Zero-load test"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => addMeasurementMutation.mutate()}
                  disabled={!selectedRule || addMeasurementMutation.isPending || !newRefValue || !newObsValue}
                  className="gap-1.5 bg-[#000080] hover:bg-[#000080]/90 text-white"
                >
                  {addMeasurementMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Record Measurement
                </Button>
                {!selectedRule && (
                  <p className="text-[12px] text-amber-700">
                    Measurement recording requires an authoritative tolerance rule.
                  </p>
                )}
              </div>
            )}

            {/* Inspection Notes & Submit */}
            {inspection.status === "in_progress" && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700">
                    Inspector Notes (optional)
                  </Label>
                  <Textarea
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Record any observations, environmental conditions, or findings from the physical inspection…"
                    className="mt-1 text-[14px]"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => submitInspectionMutation.mutate()}
                    disabled={!canSubmitInspection || submitInspectionMutation.isPending}
                    className="gap-1.5 bg-[#138808] hover:bg-[#138808]/90 text-white font-medium"
                  >
                    {submitInspectionMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <FileText className="size-4" /> Submit Inspection
                      </>
                    )}
                  </Button>
                  {measurements.length === 0 && (
                    <p className="text-[12px] text-amber-600">Add at least one measurement point first.</p>
                  )}
                </div>
                {submitInspectionMutation.error && (
                  <p className="text-[13px] text-red-600">
                    {(submitInspectionMutation.error as Error).message}
                  </p>
                )}
              </div>
            )}

            {/* Inspection Notes (read-only if submitted) */}
            {inspection.status === "submitted" && inspection.notes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
                <span className="text-slate-400 text-[10px] font-semibold uppercase block">Inspector Notes</span>
                <p className="text-slate-700 mt-0.5">{inspection.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Decision Section ── */}
      {inspection && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#000080]" />
              <h2 className="text-base font-bold text-slate-900">Verification Decision</h2>
            </div>
          </div>

          {existingDecision ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <DecisionIcon decision={existingDecision.decision} />
                  <div>
                    <p className="font-bold text-slate-900 capitalize">
                      {existingDecision.decision.replace(/_/g, " ")}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      Decided {formatDateTime(existingDecision.decided_at)}
                    </p>
                  </div>
                </div>
                {existingDecision.conditions && (
                  <div className="text-[13px]">
                    <span className="text-slate-500 text-[11px] font-semibold block">Conditions</span>
                    <p className="text-slate-700">{existingDecision.conditions}</p>
                  </div>
                )}
                {existingDecision.override_reason && (
                  <div className="text-[13px]">
                    <span className="text-slate-500 text-[11px] font-semibold block">Override Reason</span>
                    <p className="text-slate-700">{existingDecision.override_reason}</p>
                  </div>
                )}
              </div>

              {/* Issue Certificate Button */}
              {canIssueCertificate && (
                <Button
                  onClick={() => setShowCertDialog(true)}
                  className="gap-1.5 bg-[#138808] hover:bg-[#138808]/90 text-white font-medium"
                >
                  <Award className="size-4" />
                  Issue Certificate
                </Button>
              )}
            </div>
          ) : canRecordDecision ? (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-600">
                The inspection has been submitted with {measurements.length} measurement point{measurements.length !== 1 ? "s" : ""}.
                Record your verification decision.
              </p>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-slate-500">Suggested outcome based on measurements:</span>
                <DecisionIcon decision={suggestedDecision} />
                <span className="font-semibold capitalize text-slate-800">
                  {suggestedDecision.replace(/_/g, " ")}
                </span>
              </div>
              <Button
                onClick={() => {
                  setDecisionType(suggestedDecision);
                  setDecisionError(null);
                  setShowDecisionDialog(true);
                }}
                className="gap-1.5 bg-[#000080] hover:bg-[#000080]/90 text-white font-medium"
              >
                <ShieldCheck className="size-4" />
                Record Decision
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">
              {inspection.status === "in_progress"
                ? "Submit the inspection to record a verification decision."
                : "Decision will be available once the inspection is submitted."}
            </p>
          )}
        </div>
      )}

      {/* ── Decision Dialog ── */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#000080]" />
              Record Verification Decision
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Submit the final verification outcome for this instrument.
            </DialogDescription>
          </DialogHeader>

          {decisionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              {decisionError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[13px] font-semibold text-slate-700">
                Decision <span className="text-red-500">*</span>
              </Label>
              <Select value={decisionType} onValueChange={(v) => setDecisionType(v as typeof decisionType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">
                    ✅ Verified — Instrument meets all standards
                  </SelectItem>
                  <SelectItem value="verified_with_conditions">
                    ⚠️ Verified with Conditions — Meets standards with conditions
                  </SelectItem>
                  <SelectItem value="failed">
                    ❌ Failed — Instrument does not meet standards
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {decisionType === "verified_with_conditions" && (
              <div>
                <Label className="text-[13px] font-semibold text-slate-700">
                  Conditions <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={decisionConditions}
                  onChange={(e) => setDecisionConditions(e.target.value)}
                  placeholder="Describe the conditions under which this verification is valid…"
                  className="mt-1 text-[14px]"
                  rows={3}
                />
              </div>
            )}

            {decisionType !== suggestedDecision && (
              <div>
                <Label className="text-[13px] font-semibold text-slate-700">
                  Override Reason
                </Label>
                <Textarea
                  value={decisionOverride}
                  onChange={(e) => setDecisionOverride(e.target.value)}
                  placeholder="Your decision differs from the calculated result. Provide justification…"
                  className="mt-1 text-[14px]"
                  rows={2}
                />
                <p className="text-[11px] text-amber-600 mt-1">
                  The measurements suggest "{suggestedDecision.replace(/_/g, " ")}" but you selected "{decisionType.replace(/_/g, " ")}".
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordDecisionMutation.mutate()}
              disabled={
                recordDecisionMutation.isPending ||
                (decisionType === "verified_with_conditions" && !decisionConditions.trim())
              }
              className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium"
            >
              {recordDecisionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Recording…
                </>
              ) : (
                "Confirm Decision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Certificate Dialog ── */}
      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="size-5 text-[#138808]" />
              Issue Certificate
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Generate and publish the verification certificate for this instrument.
            </DialogDescription>
          </DialogHeader>

          {certSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
              <h3 className="mt-2 text-base font-bold">Certificate Issued!</h3>
              <p className="mt-1 text-[13px]">
                The verification certificate has been generated and published.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {certError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  {certError}
                </div>
              )}
              <p className="text-[13px] text-slate-600">
                This will generate a formal verification certificate based on the decision "{existingDecision?.decision.replace(/_/g, " ")}".
                The certificate will be immediately available in the public registry.
              </p>
            </div>
          )}

          {!certSuccess && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowCertDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => issueCertificateMutation.mutate()}
                disabled={issueCertificateMutation.isPending}
                className="bg-[#138808] hover:bg-[#138808]/90 text-white font-medium"
              >
                {issueCertificateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Issuing…
                  </>
                ) : (
                  "Issue Certificate"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper Components ──

function MeasurementResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-slate-400 text-[11px]">—</span>;

  type ResultKey = "pass" | "review" | "fail";
  const config: Record<ResultKey, { icon: typeof CheckCircle2; className: string; label: string }> = {
    pass: { icon: CheckCircle2, className: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Pass" },
    review: { icon: AlertCircle, className: "text-amber-700 bg-amber-50 border-amber-200", label: "Review" },
    fail: { icon: XCircle, className: "text-red-700 bg-red-50 border-red-200", label: "Fail" },
  };

  const key: ResultKey = result === "pass" || result === "fail" ? result : "review";
  const c = config[key];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${c.className}`}>
      <Icon className="size-3" />
      {c.label}
    </span>
  );
}

function DecisionIcon({ decision }: { decision: string }) {
  if (decision === "verified") {
    return <CheckCircle2 className="size-5 text-emerald-600" />;
  }
  if (decision === "verified_with_conditions") {
    return <AlertCircle className="size-5 text-amber-600" />;
  }
  return <XCircle className="size-5 text-red-600" />;
}
