import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homePathForRole } from "@/lib/emaap/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — e-Maap" },
      {
        name: "description",
        content:
          "Sign in to manage instruments and verification requests, or to carry out inspections as a verification authority.",
      },
      { property: "og:title", content: "Sign in — e-Maap" },
      { property: "og:description", content: "Access your e-Maap business or verification authority workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || password.length < 8) {
      setError("Enter your email address and a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm the address, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      const account = await loadAccount();
      // Full navigation: the destination depends on the role recorded for this account.
      window.location.assign(homePathForRole(account?.role ?? null));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-[460px] px-4 py-12 md:px-8">
        <h1 className="text-h1 font-bold">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Accounts are for businesses managing instruments and for verification authority inspectors. Public verification
          never requires an account.
        </p>

        <form onSubmit={submit} noValidate className="surface-card mt-6 p-5 sm:p-6">
          <Label htmlFor="email" className="label-text">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11"
            aria-invalid={error ? true : undefined}
          />

          <Label htmlFor="password" className="label-text mt-4 block">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11"
            aria-describedby="password-hint"
            aria-invalid={error ? true : undefined}
          />
          <p id="password-hint" className="caption-text mt-1">
            At least 8 characters.
          </p>

          {error ? (
            <p role="alert" className="mt-3 rounded-md border border-error/40 bg-error-subtle px-3 py-2 text-[14px] font-medium text-error">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 rounded-md border border-info/40 bg-info-subtle px-3 py-2 text-[14px] font-medium text-info">
              {notice}
            </p>
          ) : null}

          <Button type="submit" disabled={busy} className="mt-4 h-11 w-full">
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <p className="mt-4 text-center text-[14px] text-muted-foreground">
            {mode === "signin" ? "No account yet?" : "Already registered?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
              className="font-semibold text-primary underline"
            >
              {mode === "signin" ? "Create one" : "Sign in instead"}
            </button>
          </p>
        </form>
      </div>
    </PublicShell>
  );
}
