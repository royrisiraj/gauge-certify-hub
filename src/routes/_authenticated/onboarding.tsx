import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { PageHeader } from "@/components/emaap/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { accountQueryKey, homePathForRole, useAccount, type AppRole } from "@/lib/emaap/session";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your e-Maap account" },
      {
        name: "description",
        content: "Choose whether this account manages instruments for a business or carries out verification inspections.",
      },
      { property: "og:title", content: "Set up your e-Maap account" },
      { property: "og:description", content: "Complete your e-Maap account setup." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account, isLoading } = useAccount();
  const [role, setRole] = useState<AppRole>("business");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [designation, setDesignation] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: authorities } = useQuery({
    queryKey: ["emaap", "authorities"],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("verification_authorities")
        .select("id, name, jurisdiction_label, is_demo")
        .order("name");
      if (queryError) throw queryError;
      return data;
    },
  });

  useEffect(() => {
    if (account?.role) navigate({ to: homePathForRole(account.role), replace: true });
  }, [account?.role, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (role === "business" && !businessName.trim()) {
      setError("Enter the name of the business that owns the instruments.");
      return;
    }
    if (role === "inspector" && !authorityId) {
      setError("Select the verification authority you work for.");
      return;
    }

    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc("bootstrap_account", {
        p_role: role,
        p_full_name: fullName.trim(),
        p_business_name: role === "business" ? businessName.trim() : undefined,
        p_authority_id: role === "inspector" ? authorityId : undefined,
        p_designation: role === "inspector" ? designation.trim() || undefined : undefined,
        p_phone: phone.trim() || undefined,
        p_contact_email: account?.email ?? undefined,
      });
      if (rpcError) throw rpcError;
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
      navigate({ to: homePathForRole(role), replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account setup could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-[720px] px-4 py-10 md:px-8">
        <PageHeader
          title="Set up your account"
          description="This determines which part of e-Maap you use. Access is enforced by the backend, not by the screen you land on."
        />

        {isLoading ? (
          <p className="text-[15px] text-muted-foreground">Loading your account…</p>
        ) : (
          <form onSubmit={submit} noValidate className="surface-card p-5 sm:p-6">
            <fieldset>
              <legend className="label-text">Account type</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: "business", title: "Business / instrument owner", hint: "Register instruments and request verification." },
                    { value: "inspector", title: "Verification authority inspector", hint: "Carry out inspections and record decisions." },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                      role === option.value ? "border-primary bg-primary-subtle" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-[15px] font-semibold">{option.title}</span>
                      <span className="caption-text">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Label htmlFor="fullName" className="label-text mt-5 block">
              Full name
            </Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 h-11" />

            <Label htmlFor="phone" className="label-text mt-4 block">
              Phone (optional)
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 h-11" />

            {role === "business" ? (
              <>
                <Label htmlFor="businessName" className="label-text mt-4 block">
                  Business name
                </Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 h-11"
                />
              </>
            ) : (
              <>
                <Label htmlFor="authority" className="label-text mt-4 block">
                  Verification authority
                </Label>
                <select
                  id="authority"
                  value={authorityId}
                  onChange={(e) => setAuthorityId(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-[15px]"
                >
                  <option value="">Select an authority</option>
                  {(authorities ?? []).map((authority) => (
                    <option key={authority.id} value={authority.id}>
                      {authority.name}
                      {authority.jurisdiction_label ? ` — ${authority.jurisdiction_label}` : ""}
                      {authority.is_demo ? " (demo)" : ""}
                    </option>
                  ))}
                </select>
                <Label htmlFor="designation" className="label-text mt-4 block">
                  Designation (optional)
                </Label>
                <Input
                  id="designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-2 h-11"
                />
              </>
            )}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-error/40 bg-error-subtle px-3 py-2 text-[14px] font-medium text-error"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="mt-5 h-11 w-full">
              {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              Continue
            </Button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}
