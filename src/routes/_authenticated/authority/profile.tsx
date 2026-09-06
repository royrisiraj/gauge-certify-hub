import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, accountQueryKey } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/authority/profile")({
  head: () => ({
    meta: [
      { title: "Officer Profile & Authority Details — e-Maap" },
      {
        name: "description",
        content:
          "Official LMO Inspector profile, jurisdiction authority affiliation, and verified credentials.",
      },
    ],
  }),
  component: AuthorityProfilePage,
});

function AuthorityProfilePage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const userId = account?.userId;
  const authorityId = account?.authorityId;

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Authority details
  const { data: authority, isLoading: authorityLoading } = useQuery({
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

  // Sync state
  useEffect(() => {
    if (account?.fullName) setFullName(account.fullName);
    if (account?.phone) setPhone(account.phone);
    if (account?.designation) setDesignation(account.designation);
  }, [account]);

  // Save Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      if (!fullName.trim()) throw new Error("Full name is required");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          designation: designation.trim() || null,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKey });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Failed to update profile");
      setSaveSuccess(false);
    },
  });

  const isLoading = accountLoading || authorityLoading;

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
        title="Officer Profile"
        description="Official Legal Metrology inspector profile and jurisdiction credentials."
      />

      {/* ── Authority Verification Badge ── */}
      <div className="surface-card relative overflow-hidden p-6 border-l-4 border-l-[#000080]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-[#000080]">
              <ShieldCheck className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h3 font-bold text-slate-900">
                  {authority?.name ?? "Legal Metrology Authority"}
                </h2>
                <Badge className="bg-emerald-600 text-white text-[11px]">Authorized</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {authority?.jurisdiction_label ?? "Jurisdiction Authority"}
              </p>
              {authority?.contact_email && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="size-3.5 text-slate-400" />
                  <span>{authority.contact_email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Personal Profile Form ── */}
      <div className="surface-card p-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <User className="size-5 text-slate-500" />
            <h3 className="text-h4 font-semibold text-slate-900">Inspector Details</h3>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>Profile information saved successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            <AlertTriangle className="size-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfileMutation.mutate();
          }}
          className="space-y-4 max-w-xl"
        >
          <div>
            <Label htmlFor="officer-name" className="text-xs font-semibold text-slate-700">
              Full Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="officer-name"
              className="mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Inspector Rajesh Kumar"
              required
            />
          </div>

          <div>
            <Label htmlFor="officer-designation" className="text-xs font-semibold text-slate-700">
              Official Designation
            </Label>
            <Input
              id="officer-designation"
              className="mt-1"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Legal Metrology Officer (LMO) Grade-I"
            />
          </div>

          <div>
            <Label htmlFor="officer-phone" className="text-xs font-semibold text-slate-700">
              Contact Phone Number
            </Label>
            <Input
              id="officer-phone"
              type="tel"
              className="mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <Label htmlFor="officer-email" className="text-xs font-semibold text-slate-700">
              Registered Email (Account)
            </Label>
            <Input
              id="officer-email"
              type="email"
              className="mt-1 bg-slate-50 text-slate-500"
              value={account?.email ?? ""}
              disabled
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Email is managed through authentication credentials.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saveProfileMutation.isPending || !fullName.trim()}
              className="bg-[#000080] hover:bg-[#000080]/90 text-white gap-1.5"
            >
              {saveProfileMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
