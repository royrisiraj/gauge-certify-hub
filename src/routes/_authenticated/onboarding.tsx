import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Building2, Loader2, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { BrandMark } from "@/components/emaap/Brand";
import {
  BusinessLocationPicker,
  type BusinessLocationData,
} from "@/components/emaap/BusinessLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { accountQueryKey, homePathForRole, useAccount, type AppRole } from "@/lib/emaap/session";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Account Setup — e-Maap Legal Metrology Hub" },
      {
        name: "description",
        content:
          "Complete your authorized profile setup for the e-Maap Legal Metrology Inspection System.",
      },
      { property: "og:title", content: "Account Setup — e-Maap" },
      { property: "og:description", content: "Complete your e-Maap account setup." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();

  // Determine initial role from URL param, saved session state, or default to business
  const [clientRole] = useState<AppRole>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get("role");
      if (urlRole === "inspector") return "inspector";
      if (urlRole === "business") return "business";

      try {
        const storedRole = sessionStorage.getItem("emaap_intended_role");
        if (storedRole === "inspector") return "inspector";
        if (storedRole === "business") return "business";
      } catch {
        // storage fallback
      }
    }
    return "business";
  });

  // Source of truth: Backend authenticated role always takes precedence over client selection
  const effectiveRole: AppRole = account?.role ?? clientRole;

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [designation, setDesignation] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Business Location state (only required for Business Owner role)
  const [locationData, setLocationData] = useState<BusinessLocationData>({
    addressLine: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null,
    longitude: null,
    formattedAddress: "",
    source: "manual",
  });
  const [locationError, setLocationError] = useState<string | null>(null);

  // Verification authorities for LMO Officer onboarding
  const { data: authorities, isLoading: authoritiesLoading } = useQuery({
    queryKey: ["emaap", "authorities"],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("verification_authorities")
        .select("id, name, jurisdiction_label, is_demo")
        .order("name");
      if (queryError) throw queryError;
      return data;
    },
    enabled: effectiveRole === "inspector",
  });

  // If user already has a complete profile, navigate immediately to their role dashboard
  useEffect(() => {
    if (account?.role && account?.fullName) {
      navigate({ to: homePathForRole(account.role), replace: true });
    }
  }, [account?.role, account?.fullName, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLocationError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (effectiveRole === "business") {
      if (!businessName.trim()) {
        setError("Please enter the commercial business or establishment name.");
        return;
      }

      // Validate Business Location: manual address input or map location
      const hasAddress = Boolean(locationData.addressLine.trim());
      const hasRegion = Boolean(
        locationData.city.trim() || locationData.state.trim() || locationData.pincode.trim(),
      );
      const hasMapCoords = Boolean(
        locationData.latitude !== null && locationData.longitude !== null,
      );

      if (!hasAddress && !hasMapCoords) {
        const msg =
          "Please provide your business location by entering an address or selecting on the map.";
        setError(msg);
        setLocationError(msg);
        return;
      }

      if (hasAddress && !hasRegion && !hasMapCoords) {
        const msg = "Please provide at least a City, State, or PIN code for your business address.";
        setError(msg);
        setLocationError(msg);
        return;
      }
    }

    if (effectiveRole === "inspector" && !authorityId) {
      setError("Please select the legal metrology office / verification authority.");
      return;
    }

    setBusy(true);
    try {
      const { data: bootstrapData, error: rpcError } = await supabase.rpc("bootstrap_account", {
        p_role: effectiveRole,
        p_full_name: fullName.trim(),
        p_business_name: effectiveRole === "business" ? businessName.trim() : undefined,
        p_authority_id: effectiveRole === "inspector" ? authorityId : undefined,
        p_designation: effectiveRole === "inspector" ? designation.trim() || undefined : undefined,
        p_phone: phone.trim() || undefined,
        p_contact_email: account?.email ?? undefined,
      });

      if (rpcError) throw rpcError;

      // Persist structured business location to businesses record
      if (effectiveRole === "business") {
        const businessId = (bootstrapData as { business_id?: string })?.business_id;

        const fullStreet = [locationData.addressLine.trim(), locationData.locality.trim()]
          .filter(Boolean)
          .join(", ");

        const locationPayload = {
          address_line:
            fullStreet ||
            (locationData.latitude && locationData.longitude
              ? `Map Pin (${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)})`
              : null),
          city: locationData.city.trim() || null,
          state: locationData.state.trim() || null,
          pincode: locationData.pincode.trim() || null,
        };

        if (businessId) {
          const { error: updateError } = await supabase
            .from("businesses")
            .update(locationPayload)
            .eq("id", businessId);

          if (updateError) {
            console.warn(
              "Could not update business location in businesses table:",
              updateError.message,
            );
          }
        }
      }

      // Invalidate account cache so app knows user is fully registered
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });

      // Clean up temporary intended role from sessionStorage
      try {
        sessionStorage.removeItem("emaap_intended_role");
      } catch {
        // ignore
      }

      // Direct navigation to authorized portal
      navigate({ to: homePathForRole(effectiveRole), replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Account setup could not be completed. Please verify your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isBusiness = effectiveRole === "business";

  return (
    <PublicShell variant="onboarding">
      <div
        className={`mx-auto w-full px-4 py-8 sm:py-12 transition-all duration-200 ${
          isBusiness ? "max-w-[760px]" : "max-w-[640px]"
        }`}
      >
        {accountLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
            <p className="mt-4 text-[14px] font-medium text-slate-600">
              Verifying authenticated session…
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden rounded-2xl border border-border/90 bg-white shadow-[0_16px_48px_rgba(0,0,128,0.07)]">
            {/* Top Dual Accent Border (Saffron on left, India Green on right) */}
            <div className="grid h-1.5 w-full grid-cols-2" aria-hidden="true">
              <div className="bg-[#ff671f]" />
              <div className="bg-[#138808]" />
            </div>

            <div className="p-6 sm:p-8">
              {/* National Identity / Emblem Lockup */}
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white border border-border shadow-xs">
                  <BrandMark className="size-8" />
                </div>
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#ff671f]">
                    National Digital Portal
                  </span>
                  <div className="h-0.5 w-12 bg-gradient-to-r from-[#ff671f] via-[#000080] to-[#138808] rounded-full mt-0.5" />
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Legal Metrology Inspection Management System
                  </p>
                </div>
              </div>

              {/* Header Title */}
              <div className="mt-6 border-b border-border/70 pb-5">
                <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900">
                  {isBusiness ? "Business Owner Profile Setup" : "LMO Officer Profile Setup"}
                </h1>
                <p className="mt-1.5 text-[14px] text-slate-600 leading-relaxed">
                  {isBusiness
                    ? "Complete your commercial business profile to register weights and measures, track verification certificates, and request official inspections."
                    : "Complete your inspector profile with your assigned Legal Metrology Office to carry out field inspections, stamp instruments, and issue decisions."}
                </p>
              </div>

              {/* FIXED, NON-EDITABLE ACCOUNT TYPE CONTEXT */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Account Type
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Fixed by Login Selection
                  </span>
                </div>

                <div
                  className="flex items-center justify-between rounded-xl border border-blue-200/90 bg-[#f0f4fc]/70 p-4"
                  role="status"
                  aria-label={`Account type is confirmed as ${isBusiness ? "Business Owner" : "LMO Officer"}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#000080] text-white shadow-xs">
                      {isBusiness ? (
                        <Building2 className="size-5" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="size-5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-slate-900">
                          {isBusiness ? "Business Owner" : "LMO Officer"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#000080]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#000080]">
                          Confirmed Role
                        </span>
                      </div>
                      <p className="text-[12.5px] text-slate-600 mt-0.5">
                        {isBusiness
                          ? "You are continuing as a Business Owner."
                          : "You are continuing as an LMO Officer."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROLE-SPECIFIC ONBOARDING FORM */}
              <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                {/* Full Name */}
                <div>
                  <Label htmlFor="fullName" className="text-[13px] font-semibold text-slate-800">
                    Full Name <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isBusiness ? "e.g. Ramesh Sharma" : "e.g. Inspector Anil Kumar"}
                    className="mt-1.5 h-11 border-slate-300 focus-visible:ring-[#000080]"
                  />
                </div>

                {/* Phone (Optional) */}
                <div>
                  <Label htmlFor="phone" className="text-[13px] font-semibold text-slate-800">
                    Phone Number (optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1.5 h-11 border-slate-300 focus-visible:ring-[#000080]"
                  />
                </div>

                {/* Role-Specific Fields */}
                {isBusiness ? (
                  /* Business Owner Specific Field */
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="businessName"
                        className="text-[13px] font-semibold text-slate-800"
                      >
                        Business / Commercial Establishment Name{" "}
                        <span className="text-error">*</span>
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Apex Industrial Fuel & Retail Pvt Ltd"
                        className="mt-1.5 h-11 border-slate-300 focus-visible:ring-[#000080]"
                      />
                      <p className="mt-1.5 text-[12px] text-slate-500">
                        The commercial entity that owns and operates verified legal metrology
                        instruments.
                      </p>
                    </div>

                    {/* BUSINESS LOCATION (Address Input + Interactive Map) */}
                    <BusinessLocationPicker
                      value={locationData}
                      onChange={(newLoc) => {
                        setLocationData(newLoc);
                        if (locationError) setLocationError(null);
                      }}
                      error={locationError}
                    />
                  </div>
                ) : (
                  /* LMO Officer Specific Fields */
                  <>
                    <div>
                      <Label
                        htmlFor="authority"
                        className="text-[13px] font-semibold text-slate-800"
                      >
                        Verification Authority / Office <span className="text-error">*</span>
                      </Label>
                      <select
                        id="authority"
                        required
                        value={authorityId}
                        onChange={(e) => setAuthorityId(e.target.value)}
                        disabled={authoritiesLoading}
                        className="mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000080]"
                      >
                        <option value="">Select legal metrology office...</option>
                        {(authorities ?? []).map((authority) => (
                          <option key={authority.id} value={authority.id}>
                            {authority.name}
                            {authority.jurisdiction_label
                              ? ` — ${authority.jurisdiction_label}`
                              : ""}
                            {authority.is_demo ? " (demo)" : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-[12px] text-slate-500">
                        Official jurisdiction or office for which you conduct verification
                        inspections.
                      </p>
                    </div>

                    <div>
                      <Label
                        htmlFor="designation"
                        className="text-[13px] font-semibold text-slate-800"
                      >
                        Official Designation (optional)
                      </Label>
                      <Input
                        id="designation"
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Senior Legal Metrology Officer / Inspector"
                        className="mt-1.5 h-11 border-slate-300 focus-visible:ring-[#000080]"
                      />
                    </div>
                  </>
                )}

                {/* Error Banner */}
                {error ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-error/30 bg-error-subtle p-3 text-[13px] text-error flex items-start gap-2.5"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="font-semibold">{error}</p>
                  </div>
                ) : null}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={busy}
                  className="mt-6 h-12 w-full rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-semibold text-[15px] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#000080] focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <span>Completing Profile Setup…</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Complete Account Setup</span>
                      <ArrowRight className="size-4 ml-1" aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
