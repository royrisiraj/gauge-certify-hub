import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  Eye,
  FileCheck2,
  QrCode,
  Tag,
  Building2,
  Calendar,
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

const STANDARD_CATEGORIES = [
  "Non-Automatic Weighing Instrument (NAWI)",
  "Automatic Weighing Instrument",
  "Electronic Retail Counter Scale",
  "Platform Scale / Heavy Industrial",
  "Liquid Fuel Dispenser (Petrol/Diesel)",
  "Storage Tank Capacity Measure",
  "Linear Measure / Meter",
  "Volumetric Measure",
  "Other Metrology Equipment",
];

const STANDARD_UNITS = ["kg", "g", "mg", "tonne", "L", "mL", "m", "cm"];

type InstrumentRow = {
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
  status: "active" | "inactive";
  created_at: string;
  certificates?: Array<{
    id: string;
    certificate_number: string;
    verification_code: string;
    status: string;
    valid_from: string;
    valid_until: string;
    issued_at: string;
  }>;
  verification_requests?: Array<{
    id: string;
    status: string;
    request_type: string;
    submitted_at: string;
  }>;
};

export const Route = createFileRoute("/_authenticated/business/instruments")({
  head: () => ({
    meta: [
      { title: "Commercial Instruments — e-Maap Business Registry" },
      {
        name: "description",
        content:
          "Registered commercial weighing and measuring instruments, serial numbers, and verification statuses.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    register: search.register === true || search.register === "true",
  }),
  component: BusinessInstrumentsPage,
});

function BusinessInstrumentsPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const { data: account, isLoading: accountLoading } = useAccount();
  const businessId = account?.businessId;

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Registration Dialog State
  const [isRegisterOpen, setIsRegisterOpen] = useState(searchParams.register || false);
  const [category, setCategory] = useState(STANDARD_CATEGORIES[0]);
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [capacityValue, setCapacityValue] = useState("");
  const [capacityUnit, setCapacityUnit] = useState("kg");
  const [resolutionValue, setResolutionValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [locationLabel, setLocationLabel] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Detail View State
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRow | null>(null);

  // Request Verification Dialog State
  const [verificationTarget, setVerificationTarget] = useState<InstrumentRow | null>(null);
  const [requestType, setRequestType] = useState("periodic");
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Accessibility IDs for forms
  const catId = useId();
  const mfgId = useId();
  const modelId = useId();
  const serialId = useId();
  const capValId = useId();
  const capUnitId = useId();
  const resValId = useId();
  const unitId = useId();
  const locId = useId();
  const reqTypeId = useId();
  const reqReasonId = useId();

  // Query Instruments
  const {
    data: instruments = [],
    isLoading: instrumentsLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["emaap", "business", "instruments", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("instruments")
        .select(
          `
          id,
          public_code,
          serial_number,
          category,
          manufacturer,
          model,
          capacity_value,
          capacity_unit,
          resolution_value,
          unit,
          location_label,
          status,
          created_at,
          certificates(
            id,
            certificate_number,
            verification_code,
            status,
            valid_from,
            valid_until,
            issued_at
          ),
          verification_requests(
            id,
            status,
            request_type,
            submitted_at
          )
        `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as InstrumentRow[]) ?? [];
    },
    enabled: !!businessId,
  });

  // Mutation to Register Instrument
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No authenticated business profile found");
      if (!manufacturer.trim()) throw new Error("Manufacturer is required");
      if (!model.trim()) throw new Error("Model is required");
      if (!serialNumber.trim()) throw new Error("Serial number is required");

      const parsedCapacity = capacityValue ? parseFloat(capacityValue) : null;
      const parsedResolution = resolutionValue ? parseFloat(resolutionValue) : null;

      const { data, error } = await supabase
        .from("instruments")
        .insert({
          business_id: businessId,
          category,
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          serial_number: serialNumber.trim(),
          capacity_value: parsedCapacity,
          capacity_unit: capacityUnit || unit,
          resolution_value: parsedResolution,
          unit: unit || "kg",
          location_label: locationLabel.trim() || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "business"] });
      setIsRegisterOpen(false);
      // Reset form
      setManufacturer("");
      setModel("");
      setSerialNumber("");
      setCapacityValue("");
      setResolutionValue("");
      setLocationLabel("");
      setRegisterError(null);
    },
    onError: (err: Error) => {
      setRegisterError(err.message || "Failed to register instrument");
    },
  });

  // Mutation to Request Verification
  const requestVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!businessId || !verificationTarget) throw new Error("Missing request context");

      const { error } = await supabase.from("verification_requests").insert({
        business_id: businessId,
        instrument_id: verificationTarget.id,
        request_type: requestType,
        reason: requestReason.trim() || null,
        status: "submitted",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "business"] });
      setRequestSuccess(true);
      setTimeout(() => {
        setVerificationTarget(null);
        setRequestSuccess(false);
        setRequestReason("");
        setRequestError(null);
      }, 1500);
    },
    onError: (err: Error) => {
      setRequestError(err.message || "Failed to submit verification request");
    },
  });

  const isLoading = accountLoading || instrumentsLoading;

  // Filtered instruments
  const filteredInstruments = instruments.filter((inst) => {
    const matchesSearch =
      searchQuery === "" ||
      inst.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.public_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.location_label &&
        inst.location_label.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || inst.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">
          Loading registered instruments…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertTriangle className="mx-auto size-8 text-red-600" aria-hidden="true" />
        <h2 className="mt-2 text-lg font-bold">Unable to load instruments</h2>
        <p className="mt-1 text-sm">
          {loadError instanceof Error ? loadError.message : "Database query failed"}
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["emaap", "business", "instruments"] })
          }
          className="mt-4 bg-[#000080] text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commercial Instruments Registry"
        description="Official inventory of weighing and measuring instruments registered under Legal Metrology rules."
        crumbs={[{ label: "Dashboard", to: "/business/dashboard" }, { label: "Instruments" }]}
        actions={
          <Button
            onClick={() => {
              setRegisterError(null);
              setIsRegisterOpen(true);
            }}
            className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm font-medium"
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            Register Instrument
          </Button>
        }
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
            placeholder="Search by serial number, code, model, manufacturer…"
            className="pl-9 text-[14px] border-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="category-select"
            className="text-[13px] font-medium text-slate-600 whitespace-nowrap"
          >
            Category:
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger id="category-select" className="w-[200px] text-[13px] border-slate-200">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {STANDARD_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Instruments List / Table / Empty State */}
      {instruments.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No instruments registered"
          description="Register your commercial weighing balances, scales or measuring systems to request legal metrology verification and maintain compliance."
          action={
            <Button
              onClick={() => setIsRegisterOpen(true)}
              className="bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm"
            >
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              Register Your First Instrument
            </Button>
          }
        />
      ) : filteredInstruments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="text-[15px] font-medium">No instruments match your search criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
            }}
            className="mt-3"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[12px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Public Code</th>
                  <th className="py-3 px-4">Category & Model</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Capacity / Range</th>
                  <th className="py-3 px-4">Premises Location</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstruments.map((inst) => {
                  const latestCert =
                    inst.certificates && inst.certificates.length > 0 ? inst.certificates[0] : null;
                  const latestReq =
                    inst.verification_requests && inst.verification_requests.length > 0
                      ? inst.verification_requests[0]
                      : null;

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-[#000080] text-[13px]">
                        {inst.public_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{inst.category}</div>
                        <div className="text-[13px] text-slate-500">
                          {inst.manufacturer} • {inst.model}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[13px] text-slate-700">
                        {inst.serial_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {inst.capacity_value
                          ? `${inst.capacity_value} ${inst.capacity_unit || inst.unit}`
                          : inst.unit}
                        {inst.resolution_value ? (
                          <span className="text-[12px] text-slate-400 block">
                            (d = {inst.resolution_value} {inst.unit})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[13px]">
                        {inst.location_label || (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {latestCert ? (
                          <div className="space-y-1">
                            <StatusBadge status={latestCert.status} size="sm" />
                            <div className="text-[11px] text-slate-500">
                              Exp: {new Date(latestCert.valid_until).toLocaleDateString()}
                            </div>
                          </div>
                        ) : latestReq ? (
                          <div className="space-y-1">
                            <StatusBadge status={latestReq.status} size="sm" />
                            <div className="text-[11px] text-slate-500">Request in progress</div>
                          </div>
                        ) : (
                          <StatusBadge status="NOT_VERIFIED" size="sm" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInstrument(inst)}
                            className="h-8 text-[12px]"
                            title="View Instrument Details"
                          >
                            <Eye className="size-3.5 mr-1" aria-hidden="true" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setVerificationTarget(inst);
                              setRequestError(null);
                              setRequestSuccess(false);
                            }}
                            className="h-8 text-[12px] bg-[#000080] text-white hover:bg-[#000080]/90"
                            title="Request Legal Metrology Verification"
                          >
                            <FileCheck2 className="size-3.5 mr-1" aria-hidden="true" />
                            Verify
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredInstruments.map((inst) => {
              const latestCert =
                inst.certificates && inst.certificates.length > 0 ? inst.certificates[0] : null;
              const latestReq =
                inst.verification_requests && inst.verification_requests.length > 0
                  ? inst.verification_requests[0]
                  : null;

              return (
                <div key={inst.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[12px] font-bold text-[#000080]">
                        {inst.public_code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-[15px]">{inst.category}</h3>
                      <p className="text-[13px] text-slate-600">
                        {inst.manufacturer} {inst.model}
                      </p>
                    </div>
                    {latestCert ? (
                      <StatusBadge status={latestCert.status} size="sm" />
                    ) : latestReq ? (
                      <StatusBadge status={latestReq.status} size="sm" />
                    ) : (
                      <StatusBadge status="NOT_VERIFIED" size="sm" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-slate-400 block">Serial No:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {inst.serial_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Capacity:</span>
                      <span className="font-medium text-slate-800">
                        {inst.capacity_value
                          ? `${inst.capacity_value} ${inst.capacity_unit || inst.unit}`
                          : inst.unit}
                      </span>
                    </div>
                    {inst.location_label ? (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Premises Location:</span>
                        <span className="text-slate-800">{inst.location_label}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInstrument(inst)}
                      className="flex-1 h-8 text-[12px]"
                    >
                      <Eye className="size-3.5 mr-1" aria-hidden="true" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setVerificationTarget(inst);
                        setRequestError(null);
                        setRequestSuccess(false);
                      }}
                      className="flex-1 h-8 text-[12px] bg-[#000080] text-white hover:bg-[#000080]/90"
                    >
                      <FileCheck2 className="size-3.5 mr-1" aria-hidden="true" />
                      Verify
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REGISTER INSTRUMENT DIALOG */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Register Commercial Instrument
            </DialogTitle>
            <DialogDescription className="text-[14px] text-slate-600">
              Add a commercial weighing or measuring instrument to your establishment's legal
              metrology inventory.
            </DialogDescription>
          </DialogHeader>

          {registerError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              {registerError}
            </div>
          ) : null}

          <div className="space-y-4 py-2 text-[14px]">
            {/* Category */}
            <div>
              <Label htmlFor={catId} className="text-[13px] font-semibold text-slate-700">
                Instrument Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={catId} className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manufacturer & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={mfgId} className="text-[13px] font-semibold text-slate-700">
                  Manufacturer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={mfgId}
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Mettler Toledo, Essae, Avery"
                  className="mt-1 text-[14px]"
                  required
                />
              </div>
              <div>
                <Label htmlFor={modelId} className="text-[13px] font-semibold text-slate-700">
                  Model / Designation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={modelId}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. DS-215, BBA231"
                  className="mt-1 text-[14px]"
                  required
                />
              </div>
            </div>

            {/* Serial Number & Primary Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={serialId} className="text-[13px] font-semibold text-slate-700">
                  Serial Number (Stamped on plate) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={serialId}
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. SN-2024-8849"
                  className="mt-1 font-mono text-[14px]"
                  required
                />
              </div>
              <div>
                <Label htmlFor={unitId} className="text-[13px] font-semibold text-slate-700">
                  Measurement Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={unit}
                  onValueChange={(val) => {
                    setUnit(val);
                    setCapacityUnit(val);
                  }}
                >
                  <SelectTrigger id={unitId} className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capacity Value & Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={capValId} className="text-[13px] font-semibold text-slate-700">
                  Max Capacity (Optional)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id={capValId}
                    type="number"
                    step="any"
                    value={capacityValue}
                    onChange={(e) => setCapacityValue(e.target.value)}
                    placeholder="e.g. 50"
                    className="text-[14px]"
                  />
                  <Select value={capacityUnit} onValueChange={setCapacityUnit}>
                    <SelectTrigger id={capUnitId} className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor={resValId} className="text-[13px] font-semibold text-slate-700">
                  Verification Scale Interval (e / d)
                </Label>
                <Input
                  id={resValId}
                  type="number"
                  step="any"
                  value={resolutionValue}
                  onChange={(e) => setResolutionValue(e.target.value)}
                  placeholder="e.g. 0.1 or 1"
                  className="mt-1 text-[14px]"
                />
              </div>
            </div>

            {/* Physical Location in Establishment */}
            <div>
              <Label htmlFor={locId} className="text-[13px] font-semibold text-slate-700">
                Installation Location in Premises (Optional)
              </Label>
              <Input
                id={locId}
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g. Billing Counter 1, Kitchen Dispense, Warehouse Loading Bay"
                className="mt-1 text-[14px]"
              />
              <p className="mt-1 text-[12px] text-slate-500">
                Helps the Legal Metrology officer locate the equipment during on-site inspection.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRegisterOpen(false)}
              disabled={registerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Registering…
                </>
              ) : (
                "Save Instrument"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW INSTRUMENT DETAILS DIALOG */}
      <Dialog
        open={!!selectedInstrument}
        onOpenChange={(open) => !open && setSelectedInstrument(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Scale className="size-5 text-[#000080]" aria-hidden="true" />
              Instrument Details & Identity
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Authoritative metrological identity registered under Legal Metrology.
            </DialogDescription>
          </DialogHeader>

          {selectedInstrument ? (
            <div className="space-y-4 py-2 text-[14px]">
              {/* Public Code Banner */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Public Verification Identifier
                  </span>
                  <span className="font-mono text-[16px] font-bold text-[#000080]">
                    {selectedInstrument.public_code}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="bg-white text-[12px]">
                  <Link to="/verify/$code" params={{ code: selectedInstrument.public_code }}>
                    <ExternalLink className="size-3.5 mr-1" aria-hidden="true" />
                    Public Page
                  </Link>
                </Button>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Category
                  </span>
                  <span className="font-medium text-slate-900">{selectedInstrument.category}</span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Serial Number
                  </span>
                  <span className="font-mono font-medium text-slate-900">
                    {selectedInstrument.serial_number}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Manufacturer
                  </span>
                  <span className="font-medium text-slate-900">
                    {selectedInstrument.manufacturer}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Model
                  </span>
                  <span className="font-medium text-slate-900">{selectedInstrument.model}</span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Capacity / Range
                  </span>
                  <span className="font-medium text-slate-900">
                    {selectedInstrument.capacity_value
                      ? `${selectedInstrument.capacity_value} ${selectedInstrument.capacity_unit || selectedInstrument.unit}`
                      : selectedInstrument.unit}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Location in Store
                  </span>
                  <span className="font-medium text-slate-900">
                    {selectedInstrument.location_label || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Latest Certificate Info */}
              {selectedInstrument.certificates && selectedInstrument.certificates.length > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                      Active Certificate
                    </span>
                    <StatusBadge status={selectedInstrument.certificates[0].status} size="sm" />
                  </div>
                  <p className="mt-1 font-mono text-[14px] font-bold text-slate-900">
                    {selectedInstrument.certificates[0].certificate_number}
                  </p>
                  <p className="text-[12px] text-slate-600">
                    Valid from{" "}
                    {new Date(selectedInstrument.certificates[0].valid_from).toLocaleDateString()}{" "}
                    until{" "}
                    {new Date(selectedInstrument.certificates[0].valid_until).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInstrument(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REQUEST VERIFICATION DIALOG */}
      <Dialog
        open={!!verificationTarget}
        onOpenChange={(open) => !open && setVerificationTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="size-5 text-[#000080]" aria-hidden="true" />
              Request Metrology Verification
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-600">
              Submit a formal request for inspection and certification by Legal Metrology
              authorities.
            </DialogDescription>
          </DialogHeader>

          {requestSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
              <h3 className="mt-2 text-base font-bold">Request Submitted!</h3>
              <p className="mt-1 text-[13px]">
                Your verification request has been logged. An inspector will be assigned.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-[14px]">
              {requestError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  {requestError}
                </div>
              ) : null}

              {verificationTarget ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase">
                    Selected Instrument
                  </span>
                  <div className="font-bold text-slate-900">{verificationTarget.category}</div>
                  <div className="text-slate-600 font-mono text-[12px]">
                    SN: {verificationTarget.serial_number} ({verificationTarget.public_code})
                  </div>
                </div>
              ) : null}

              <div>
                <Label htmlFor={reqTypeId} className="text-[13px] font-semibold text-slate-700">
                  Verification Type
                </Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger id={reqTypeId} className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial Verification (New Equipment)</SelectItem>
                    <SelectItem value="periodic">Periodic / Stamping Renewal</SelectItem>
                    <SelectItem value="post_repair">
                      Re-verification Post Repair / Adjustment
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={reqReasonId} className="text-[13px] font-semibold text-slate-700">
                  Notes or Operational Timing (Optional)
                </Label>
                <Textarea
                  id={reqReasonId}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Annual re-stamping due, store open 9 AM to 8 PM, preferred weekday inspection."
                  className="mt-1 text-[14px]"
                  rows={3}
                />
              </div>
            </div>
          )}

          {!requestSuccess ? (
            <DialogFooter className="mt-3 gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setVerificationTarget(null)}
                disabled={requestVerificationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => requestVerificationMutation.mutate()}
                disabled={requestVerificationMutation.isPending}
                className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium"
              >
                {requestVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
