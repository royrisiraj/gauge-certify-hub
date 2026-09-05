import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  FileBadge,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/business/profile")({
  head: () => ({
    meta: [
      { title: "Business Profile & Establishment Details — e-Maap" },
      {
        name: "description",
        content:
          "Commercial establishment details, verified inspection address, and representative contact information.",
      },
    ],
  }),
  component: BusinessProfilePage,
});

function BusinessProfilePage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const businessId = account?.businessId;
  const userId = account?.userId;

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [registrationRef, setRegistrationRef] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [designation, setDesignation] = useState("");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Accessibility IDs
  const bizNameId = useId();
  const regRefId = useId();
  const contactEmailId = useId();
  const contactPhoneId = useId();
  const addressId = useId();
  const cityId = useId();
  const stateId = useId();
  const pinId = useId();
  const nameId = useId();
  const repPhoneId = useId();
  const desigId = useId();

  // Query Business Data
  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["emaap", "business", "profile", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, name, registration_ref, contact_email, contact_phone, address_line, city, state, pincode, created_at",
        )
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Query Profile Data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["emaap", "profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, designation")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Sync state when data loads
  useEffect(() => {
    if (business) {
      setBusinessName(business.name || "");
      setRegistrationRef(business.registration_ref || "");
      setContactEmail(business.contact_email || "");
      setContactPhone(business.contact_phone || "");
      setAddressLine(business.address_line || "");
      setCity(business.city || "");
      setState(business.state || "");
      setPincode(business.pincode || "");
    }
  }, [business]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUserPhone(profile.phone || "");
      setDesignation(profile.designation || "");
    }
  }, [profile]);

  // Mutation to update business and profile
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!businessId || !userId) throw new Error("Missing session details");
      if (!businessName.trim()) throw new Error("Business name is required");

      setSaveError(null);

      // 1. Update businesses table (safe fields only)
      const { error: bizError } = await supabase
        .from("businesses")
        .update({
          name: businessName.trim(),
          registration_ref: registrationRef.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          address_line: addressLine.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
        })
        .eq("id", businessId);

      if (bizError) throw bizError;

      // 2. Update user profile (safe fields only)
      const { error: profError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: userPhone.trim() || null,
          designation: designation.trim() || null,
        })
        .eq("id", userId);

      if (profError) throw profError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Failed to update profile");
    },
  });

  const isLoading = accountLoading || businessLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">Loading business profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Business Profile & Premises Details"
        description="Establishment identification, verification site address, and authorized representative contact."
        crumbs={[{ label: "Dashboard", to: "/business/dashboard" }, { label: "Profile" }]}
      />

      {saveSuccess ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[14px] text-emerald-800">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Profile and premises details updated successfully!</span>
        </div>
      ) : null}

      {saveError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
          <AlertTriangle className="size-5 text-red-600 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {/* Card 1: Commercial Establishment Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="size-5 text-[#000080]" aria-hidden="true" />
              <h2 className="text-[17px] font-bold text-slate-900">
                Commercial Establishment Details
              </h2>
            </div>
            <Badge variant="outline" className="text-slate-600 border-slate-300">
              Registered Establishment
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <div>
              <Label htmlFor={bizNameId} className="text-[13px] font-semibold text-slate-700">
                Legal Trade / Establishment Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id={bizNameId}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Ramesh Hardware & Metrology Supplies"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor={regRefId} className="text-[13px] font-semibold text-slate-700">
                Registration / GST / Trade Ref
              </Label>
              <Input
                id={regRefId}
                value={registrationRef}
                onChange={(e) => setRegistrationRef(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5 / TR-2024"
                className="mt-1 font-mono uppercase"
              />
            </div>

            <div>
              <Label htmlFor={contactEmailId} className="text-[13px] font-semibold text-slate-700">
                Establishment Email
              </Label>
              <Input
                id={contactEmailId}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@business.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={contactPhoneId} className="text-[13px] font-semibold text-slate-700">
                Establishment Telephone
              </Label>
              <Input
                id={contactPhoneId}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Premises Location (For Field Inspection) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <MapPin className="size-5 text-[#ff671f]" aria-hidden="true" />
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">Verified Premises Address</h2>
              <p className="text-[13px] text-slate-500">
                Where weighing and measuring equipment is physically installed for inspection and
                stamping.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[14px]">
            <div>
              <Label htmlFor={addressId} className="text-[13px] font-semibold text-slate-700">
                Street Address / Shop No. / Building
              </Label>
              <Input
                id={addressId}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Shop No. 42, Market Road, Sector 3"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={cityId} className="text-[13px] font-semibold text-slate-700">
                  City / Town
                </Label>
                <Input
                  id={cityId}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune, Jaipur"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={stateId} className="text-[13px] font-semibold text-slate-700">
                  State / UT
                </Label>
                <Input
                  id={stateId}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={pinId} className="text-[13px] font-semibold text-slate-700">
                  PIN Code
                </Label>
                <Input
                  id={pinId}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 411001"
                  className="mt-1 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Authorized Representative Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <User className="size-5 text-[#138808]" aria-hidden="true" />
              <h2 className="text-[17px] font-bold text-slate-900">
                Authorized Signatory / Representative
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#000080] bg-blue-50 px-2.5 py-1 rounded-full">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Verified Account
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[14px]">
            <div>
              <Label htmlFor={nameId} className="text-[13px] font-semibold text-slate-700">
                Representative Full Name
              </Label>
              <Input
                id={nameId}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Authorized contact person"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={desigId} className="text-[13px] font-semibold text-slate-700">
                Designation
              </Label>
              <Input
                id={desigId}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Proprietor, Director, Manager"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={repPhoneId} className="text-[13px] font-semibold text-slate-700">
                Mobile Number
              </Label>
              <Input
                id={repPhoneId}
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="mt-1"
              />
            </div>
          </div>

          {/* Read-only Security Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-900 block">Authenticated Account:</span>
              <span>{account?.email}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 block">Platform Role:</span>
              <span className="capitalize">{account?.role || "business"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 block">Member Since:</span>
              <span>
                {business?.created_at ? new Date(business.created_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-[#000080] hover:bg-[#000080]/90 text-white font-medium shadow-sm px-6"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Saving Changes…
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" aria-hidden="true" />
                Save Profile Details
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
