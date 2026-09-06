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
import {
  accountQueryKey,
  homePathForRole,
  isAccountOnboarded,
  loadAccount,
  useAccount,
  type AppRole,
} from "@/lib/emaap/session";

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

type BootstrapPayload = {
  role?: string;
  business_id?: string;
  already?: boolean;
} | null;

function extractTechnicalError(caught: unknown): string {
  if (!caught) return "An unexpected error occurred.";
  if (typeof caught === "string") return caught;
  if (caught instanceof Error && caught.message) return caught.message;

  if (typeof caught === "object") {
    const err = caught as Record<string, unknown>;
    const message = typeof err["message"] === "string" ? err["message"] : null;
    const details = typeof err["details"] === "string" ? err["details"] : null;
    const hint = typeof err["hint"] === "string" ? err["hint"] : null;
    const code = typeof err["code"] === "string" ? err["code"] : null;

    if (message && details) {
      return `${message} (${details})`;
    }
    if (message) {
      return hint ? `${message} (Hint: ${hint})` : message;
    }
    if (details) return details;
    if (code) return `Database error [${code}]`;
  }

  return "Account setup could not be completed. Please verify your details and try again.";
}

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

  // Office Location state (for LMO Officer role)
  const [officeLocation, setOfficeLocation] = useState<BusinessLocationData>({
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
  const [officeLocationError, setOfficeLocationError] = useState<string | null>(null);

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

  // Sync pre-existing profile data if available
  useEffect(() => {
    if (account?.fullName) setFullName((prev) => prev || account.fullName || "");
    if (account?.phone) setPhone((prev) => prev || account.phone || "");
    if (account?.designation) setDesignation((prev) => prev || account.designation || "");
    if (account?.authorityId) {
      const match = authorities?.find((a) => a.id === account.authorityId);
      setAuthorityId((prev) => prev || match?.name || account.authorityId || "");
      if (match?.jurisdiction_label || match?.name) {
        const addr = match.jurisdiction_label || match.name || "";
        setOfficeLocation((prev) => ({
          ...prev,
          addressLine: prev.addressLine || addr,
          formattedAddress: prev.formattedAddress || addr,
        }));
      }
    }
  }, [account?.fullName, account?.phone, account?.designation, account?.authorityId, authorities]);

  // If user already has a complete profile, navigate immediately to their role dashboard
  useEffect(() => {
    if (account && isAccountOnboarded(account)) {
      navigate({ to: homePathForRole(account.role), replace: true });
    }
  }, [account, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLocationError(null);
    setOfficeLocationError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number.");
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

    if (effectiveRole === "inspector") {
      const hasOfficeAddress = Boolean(
        officeLocation.addressLine.trim() ||
        officeLocation.formattedAddress.trim() ||
        (officeLocation.city.trim() || officeLocation.state.trim() || officeLocation.pincode.trim()) ||
        (officeLocation.latitude !== null && officeLocation.longitude !== null)
      );

      if (!hasOfficeAddress) {
        const msg = "Please enter your office address or select a location on the map.";
        setError(msg);
        setOfficeLocationError(msg);
        return;
      }

      if (!designation.trim()) {
        setError("Please enter your official designation.");
        return;
      }
    }

    setBusy(true);
    try {
      const fullStreet = [locationData.addressLine.trim(), locationData.locality.trim()]
        .filter(Boolean)
        .join(", ");

      let businessId: string | null = null;

      // Resolve authority UUID for backend RPC
      let resolvedAuthorityId: string | undefined = undefined;
      if (effectiveRole === "inspector") {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const addressText = (
          officeLocation.formattedAddress ||
          officeLocation.addressLine ||
          officeLocation.city ||
          authorityId
        ).trim();

        if (authorityId && UUID_REGEX.test(authorityId.trim())) {
          resolvedAuthorityId = authorityId.trim();
        } else if (authorities && authorities.length > 0) {
          const match = authorities.find(
            (a) =>
              (addressText && (
                a.name.toLowerCase().includes(addressText.toLowerCase()) ||
                (a.jurisdiction_label && a.jurisdiction_label.toLowerCase().includes(addressText.toLowerCase()))
              )) ||
              (a.jurisdiction_label && addressText.toLowerCase().includes(a.jurisdiction_label.toLowerCase()))
          );
          resolvedAuthorityId = match?.id ?? authorities[0]?.id ?? "11111111-1111-1111-1111-111111111111";
        } else {
          resolvedAuthorityId = "11111111-1111-1111-1111-111111111111";
        }
      }

      // 1. Authoritative Backend RPC Call
      const rpcArgs: Record<string, unknown> = {
        p_role: effectiveRole,
        p_full_name: fullName.trim(),
        p_business_name: effectiveRole === "business" ? businessName.trim() : undefined,
        p_authority_id: effectiveRole === "inspector" ? resolvedAuthorityId : undefined,
        p_designation: effectiveRole === "inspector" ? designation.trim() || undefined : undefined,
        p_phone: phone.trim() || undefined,
        p_contact_email: account?.email ?? undefined,
      };

      if (effectiveRole === "business") {
        rpcArgs["p_address_line"] = locationData.addressLine.trim() || undefined;
        rpcArgs["p_locality"] = locationData.locality.trim() || undefined;
        rpcArgs["p_city"] = locationData.city.trim() || undefined;
        rpcArgs["p_state"] = locationData.state.trim() || undefined;
        rpcArgs["p_pincode"] = locationData.pincode.trim() || undefined;
        rpcArgs["p_latitude"] = locationData.latitude !== null ? locationData.latitude : undefined;
        rpcArgs["p_longitude"] = locationData.longitude !== null ? locationData.longitude : undefined;
      }

      const { data: bootstrapData, error: rpcError } = await supabase.rpc(
        "bootstrap_account",
        rpcArgs as never,
      );

      if (rpcError) {
        const errCode = (rpcError as { code?: string })?.code;
        // If the live database is pending the 13-parameter migration (PGRST202 schema cache error),
        // call the legacy 7-parameter signature
        if (errCode === "PGRST202") {
          console.warn("bootstrap_account extended RPC pending migration, trying legacy signature");
          const { data: legacyData, error: legacyErr } = await supabase.rpc("bootstrap_account", {
            p_role: effectiveRole,
            p_full_name: fullName.trim(),
            p_business_name: effectiveRole === "business" ? businessName.trim() : undefined,
            p_authority_id: effectiveRole === "inspector" ? resolvedAuthorityId : undefined,
            p_designation:
              effectiveRole === "inspector" ? designation.trim() || undefined : undefined,
            p_phone: phone.trim() || undefined,
            p_contact_email: account?.email ?? undefined,
          } as never);

          if (legacyErr) throw legacyErr;
          const legacyPayload = legacyData as BootstrapPayload;
          businessId = legacyPayload?.business_id ?? null;
        } else {
          throw rpcError;
        }
      } else {
        const payload = bootstrapData as BootstrapPayload;
        businessId = payload?.business_id ?? null;
      }

      // Safe recovery if legacy backend returned without business_id:
      if (effectiveRole === "business" && !businessId) {
        if (!account?.userId) throw new Error("No authenticated session found");

        // Use client-generated UUID so we do not trigger SELECT under RLS before profile link
        const newBizId = crypto.randomUUID();

        // Build the full insert payload including location columns
        const fullBizPayload: Record<string, unknown> = {
          id: newBizId,
          name: businessName.trim(),
          owner_id: account.userId,
          contact_email: account.email ?? null,
          contact_phone: phone.trim() || null,
          address_line: fullStreet || null,
          city: locationData.city.trim() || null,
          state: locationData.state.trim() || null,
          pincode: locationData.pincode.trim() || null,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        };

        let { error: newBizErr } = await supabase.from("businesses").insert(fullBizPayload as never);

        // If the live DB schema has not been migrated and latitude/longitude columns are missing,
        // PostgREST returns a schema cache error. Retry without location coordinate columns.
        if (
          newBizErr &&
          (newBizErr.message?.includes("schema cache") ||
            newBizErr.message?.includes("column") ||
            newBizErr.code === "PGRST204")
        ) {
          console.warn("Business insert: location columns not in live schema, retrying without coordinates");
          const { latitude: _lat, longitude: _lng, ...reducedPayload } = fullBizPayload;
          const retryResult = await supabase.from("businesses").insert(reducedPayload as never);
          newBizErr = retryResult.error;
        }

        if (newBizErr) {
          console.error("Business record creation failed:", newBizErr);
          throw newBizErr;
        }
        businessId = newBizId;

        // Atomically link profiles.business_id = newBizId
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            business_id: businessId,
          })
          .eq("id", account.userId);

        if (profileErr) {
          console.error("Profile business linkage failed:", profileErr);
          throw profileErr;
        }
      }

      // Persist / update location data on businesses record
      if (effectiveRole === "business" && businessId) {
        const locationPayload: Record<string, unknown> = {
          address_line: locationData.addressLine.trim() || null,
          locality: locationData.locality.trim() || null,
          city: locationData.city.trim() || null,
          state: locationData.state.trim() || null,
          pincode: locationData.pincode.trim() || null,
          ...(locationData.latitude !== null ? { latitude: locationData.latitude } : {}),
          ...(locationData.longitude !== null ? { longitude: locationData.longitude } : {}),
        };

        let { error: updateError } = await supabase
          .from("businesses")
          .update(locationPayload as never)
          .eq("id", businessId);

        // If schema cache error due to missing location columns, retry without them
        if (
          updateError &&
          (updateError.message?.includes("schema cache") ||
            updateError.message?.includes("column") ||
            updateError.code === "PGRST204")
        ) {
          console.warn("Business update: location columns not in live schema, retrying without coordinates");
          const { latitude: _lat, longitude: _lng, locality: _loc, ...reducedPayload } = locationPayload;
          const retryResult = await supabase
            .from("businesses")
            .update(reducedPayload as never)
            .eq("id", businessId);
          updateError = retryResult.error;
        }

        if (updateError) {
          console.warn("Could not update business location in businesses table:", updateError);
        }
      }

      // Update authority jurisdiction_label with office address if available
      if (effectiveRole === "inspector" && resolvedAuthorityId) {
        const addressStr =
          officeLocation.formattedAddress.trim() ||
          officeLocation.addressLine.trim() ||
          [
            officeLocation.addressLine,
            officeLocation.locality,
            officeLocation.city,
            officeLocation.state,
            officeLocation.pincode ? `PIN: ${officeLocation.pincode}` : "",
          ]
            .filter(Boolean)
            .join(", ");

        if (addressStr) {
          try {
            await supabase
              .from("verification_authorities")
              .update({
                jurisdiction_label: addressStr,
              } as never)
              .eq("id", resolvedAuthorityId);
          } catch (err) {
            console.warn("Authority jurisdiction update error (non-fatal):", err);
          }
        }
      }

      // Invalidate account cache and fetch fresh account state to guarantee business_id is set
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
      const freshAccount = await queryClient.fetchQuery({
        queryKey: accountQueryKey,
        queryFn: loadAccount,
      });

      if (effectiveRole === "business" && !freshAccount?.businessId) {
        throw new Error(
          "Account setup verification failed: Business profile is not linked to your session. Please verify your details and try again.",
        );
      }

      // Clean up temporary intended role from sessionStorage
      try {
        sessionStorage.removeItem("emaap_intended_role");
      } catch {
        // ignore
      }

      // Direct navigation to authorized portal
      navigate({ to: homePathForRole(effectiveRole), replace: true });
    } catch (caught) {
      console.error("Onboarding submission failed:", caught);
      setError(extractTechnicalError(caught));
    } finally {
      setBusy(false);
    }
  }

  const isBusiness = effectiveRole === "business";

  return (
    <PublicShell variant="onboarding">
      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:py-12 transition-all duration-200">
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

                {/* Phone Number (Mandatory) */}
                <div>
                  <Label htmlFor="phone" className="text-[13px] font-semibold text-slate-800">
                    Phone Number <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
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
                    {/* Office Address (Mandatory with BusinessLocationPicker) */}
                    <BusinessLocationPicker
                      label="Office Address"
                      description="Provide the official address of your Legal Metrology office or verification authority. Enter the address manually, select a point on the map, or use your current location."
                      value={officeLocation}
                      onChange={(newLoc) => {
                        setOfficeLocation(newLoc);
                        if (officeLocationError) setOfficeLocationError(null);
                      }}
                      error={officeLocationError}
                    />

                    <div>
                      <Label
                        htmlFor="designation"
                        className="text-[13px] font-semibold text-slate-800"
                      >
                        Official Designation <span className="text-error">*</span>
                      </Label>
                      <Input
                        id="designation"
                        type="text"
                        required
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
