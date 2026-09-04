import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Search,
  Landmark,
  Users,
  ShieldAlert,
  Info,
} from "lucide-react";
import { BrandMark } from "@/components/emaap/Brand";
import {
  SaffronFlowGraphic,
  GreenFlowGraphic,
  AshokaChakraGraphic,
  HeritageSkylineGraphic,
} from "@/components/emaap/AuthDecorations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homePathForRole, type AppRole } from "@/lib/emaap/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — e-Maap Legal Metrology Hub" },
      {
        name: "description",
        content:
          "Sign in to manage instruments and verification requests, or to carry out inspections as an authorized verification inspector.",
      },
      { property: "og:title", content: "Sign in — e-Maap Legal Metrology Hub" },
      {
        property: "og:description",
        content: "Secure access to e-Maap legal metrology verification management system.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
type PortalRole = "admin" | "business" | "inspector" | "client";

interface RoleConfig {
  id: PortalRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
}

const PORTAL_ROLES: RoleConfig[] = [
  {
    id: "admin",
    label: "Admin",
    subtitle: "State Metrology",
    icon: Landmark,
    ariaLabel: "Sign in as Admin - State Legal Metrology Offices",
  },
  {
    id: "business",
    label: "Business Owner",
    subtitle: "Commercial",
    icon: Building2,
    ariaLabel: "Sign in as Business Owner - Commercial Business",
  },
  {
    id: "inspector",
    label: "LMO Officer",
    subtitle: "Inspector",
    icon: ShieldCheck,
    ariaLabel: "Sign in as LMO Officer - Legal Metrology Inspector",
  },
  {
    id: "client",
    label: "Client",
    subtitle: "General Public",
    icon: Users,
    ariaLabel: "Access as Client - General Public and Consumers",
  },
];

interface RoleSelectorCardProps {
  role: RoleConfig;
  isSelected: boolean;
  onSelect: (roleId: PortalRole) => void;
}

function RoleSelectorCard({ role, isSelected, onSelect }: RoleSelectorCardProps) {
  const Icon = role.icon;
  return (
    <button
      type="button"
      role="radio"
      id={`role-tab-${role.id}`}
      aria-checked={isSelected}
      aria-label={role.ariaLabel}
      onClick={() => onSelect(role.id)}
      className={cn(
        "group relative flex flex-col items-center justify-between text-center cursor-pointer transition-colors duration-150",
        "w-full min-w-0 box-border rounded-xl p-2 sm:p-2.5",
        "h-[114px]",
        "border-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000080] focus-visible:ring-offset-1",
        isSelected
          ? "border-[#000080] bg-[#f0f4fc] shadow-xs"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          isSelected
            ? "bg-[#000080]/15 text-[#000080]"
            : "bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200/60",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center justify-center w-full min-w-0 flex-1 mt-1">
        <span
          className={cn(
            "text-[12px] sm:text-[13px] font-bold leading-tight text-center w-full min-w-0 px-0.5 line-clamp-2",
            isSelected ? "text-[#000080]" : "text-slate-800",
          )}
        >
          {role.label}
        </span>
        <span
          className={cn(
            "text-[9.5px] sm:text-[10.5px] font-medium leading-tight text-center w-full min-w-0 px-0.5 mt-0.5 line-clamp-2",
            isSelected ? "text-slate-600" : "text-slate-500",
          )}
        >
          {role.subtitle}
        </span>
      </div>
    </button>
  );
}

function AdminRolePanel({ onSwitchToInspector }: { onSwitchToInspector: () => void }) {
  return (
    <div
      id="admin-role-panel"
      className="w-full min-w-0 rounded-xl border border-blue-200/90 bg-blue-50/60 p-4 sm:p-5 text-slate-800 box-border"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#000080]">
          <ShieldAlert className="size-5 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
            State Legal Metrology Administration
          </h3>
          <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed break-words">
            The central administrative governance portal requires backend schema expansion. In the
            current database security architecture, the{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-[#000080] font-mono">
              app_role
            </code>{" "}
            enum is strictly defined as{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-[#000080] font-mono">
              ['business', 'inspector']
            </code>{" "}
            protected by strict Row Level Security (RLS).
          </p>

          <div className="mt-3.5 rounded-lg border border-blue-200/80 bg-white/95 p-3 sm:p-3.5 text-[12px] text-slate-600 w-full min-w-0 box-border">
            <p className="font-semibold text-slate-900 mb-1.5">
              Backend Security Requirements for Admin Role:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>
                Database migration to add{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                  'admin'
                </code>{" "}
                to{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                  app_role
                </code>{" "}
                enum
              </li>
              <li>
                Supervisory Row Level Security audit policies for cross-jurisdictional oversight
              </li>
              <li>State metrology administrative credentials and jurisdictional mapping</li>
            </ul>
          </div>

          <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
            For operational tasks, please select{" "}
            <strong className="text-slate-900">Business Owner</strong> (Commercial Business) or{" "}
            <strong className="text-slate-900">LMO Officer</strong> (Legal Metrology Officer).
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-blue-200/70 flex flex-col gap-2.5 w-full min-w-0">
        <Button
          type="button"
          disabled
          className="h-11 w-full min-w-0 bg-slate-200/90 text-slate-500 font-semibold cursor-not-allowed text-[13px] rounded-lg px-3 text-center whitespace-normal leading-snug"
        >
          Admin Backend Provisioning Required
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSwitchToInspector}
          className="h-11 w-full min-w-0 border-blue-300 text-[#000080] hover:bg-blue-100/60 font-semibold text-[13px] rounded-lg px-3 text-center flex items-center justify-center gap-1.5 cursor-pointer"
        >
          Sign In as LMO Officer →
        </Button>
      </div>
    </div>
  );
}

function ClientRolePanel() {
  return (
    <div
      id="client-role-panel"
      className="w-full min-w-0 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-4 sm:p-5 text-slate-800 box-border"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#138808]">
          <Users className="size-5 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
            Public Consumer &amp; Client Access
          </h3>
          <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed break-words">
            No login credentials or user account are needed for consumers and commercial clients.
            You can immediately search verification certificates, inspect calibration records, and
            verify official QR codes.
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-emerald-200/70 flex flex-col gap-2.5 w-full min-w-0">
        <Button
          asChild
          className="h-11 w-full min-w-0 bg-[#138808] hover:bg-[#0f6b06] text-white font-semibold shadow-xs text-[14px] rounded-lg px-4 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Link to="/verify">
            <Search className="size-4 shrink-0" />
            <span>Open Public Verification Portal</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 w-full min-w-0 border-emerald-300 text-emerald-950 hover:bg-emerald-100/60 font-medium text-[13.5px] rounded-lg px-4 flex items-center justify-center cursor-pointer"
        >
          <Link to="/help">
            <span>Learn How It Works</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [selectedRole, setSelectedRole] = useState<PortalRole>("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Role mismatch state if an authenticated user belongs to another role
  const [mismatchRole, setMismatchRole] = useState<AppRole | null>(null);

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Biometric feedback state
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);

  // Load remembered email if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem("emaap_remembered_email");
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // Storage unavailable in sandbox
    }
  }, []);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setMismatchRole(null);
    setBiometricNotice(null);

    if (!email.trim() || password.length < 6) {
      setError("Please enter your email address and password.");
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
          setNotice(
            "Account registration initiated. Please check your email inbox to confirm your address, then sign in.",
          );
          setMode("signin");
          return;
        }

        // Newly signed up user with session proceeds to role-specific onboarding
        const targetRole = selectedRole === "inspector" ? "inspector" : "business";
        try {
          sessionStorage.setItem("emaap_intended_role", targetRole);
        } catch {
          // storage fallback
        }
        window.location.assign(`/onboarding?role=${targetRole}`);
        return;
      }

      // Standard Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email or password. Please verify your credentials and try again.",
          );
        }
        throw signInError;
      }

      // Store or remove remembered email
      try {
        if (rememberMe) {
          localStorage.setItem("emaap_remembered_email", email.trim());
        } else {
          localStorage.removeItem("emaap_remembered_email");
        }
      } catch {
        // Storage access handled gracefully
      }

      // Resolve recorded role for account
      const account = await loadAccount();

      if (account?.role) {
        // If an operator signed in while Admin or Client was selected, guide them to their recorded role
        if (selectedRole === "admin") {
          setError(
            `Admin role requires backend schema provisioning. Your account has operational access as ${
              account.role === "business" ? "Business Owner" : "LMO Officer"
            }.`,
          );
          setMismatchRole(account.role);
          return;
        }

        // Check if selected role matches recorded account role
        if (selectedRole !== "client" && account.role !== selectedRole) {
          setMismatchRole(account.role);
          setError(
            `Role mismatch: This account is registered as ${
              account.role === "business" ? "a Business Owner" : "an LMO Officer"
            }, but "${selectedRole === "business" ? "Business Owner" : "LMO Officer"}" was selected.`,
          );
          return;
        }

        // Match confirmed: check if user needs to complete onboarding
        if (!account.fullName) {
          try {
            sessionStorage.setItem("emaap_intended_role", account.role);
          } catch {
            // storage fallback
          }
          window.location.assign(`/onboarding?role=${account.role}`);
          return;
        }

        // Match confirmed and onboarding complete: redirect to appropriate authenticated workspace
        window.location.assign(homePathForRole(account.role));
      } else {
        // New account without assigned role yet: proceed to role-specific onboarding
        const targetRole = selectedRole === "inspector" ? "inspector" : "business";
        try {
          sessionStorage.setItem("emaap_intended_role", targetRole);
        } catch {
          // storage fallback
        }
        window.location.assign(`/onboarding?role=${targetRole}`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sign in could not be completed. Please check your network connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotNotice(null);
    setForgotError(null);

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotBusy(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (resetErr) throw resetErr;

      setForgotNotice("Password reset instructions have been sent to your email address.");
    } catch (caught) {
      setForgotError(
        caught instanceof Error
          ? caught.message
          : "Unable to process password reset. Please contact your verification authority.",
      );
    } finally {
      setForgotBusy(false);
    }
  }

  function handleBiometricLogin() {
    setBiometricNotice(
      "Biometric passkey authentication requires an active initial session. Please sign in with your email and password once to register this device.",
    );
  }

  function handleRoleMismatchSwitch() {
    if (mismatchRole) {
      setSelectedRole(mismatchRole);
      setError(null);
      window.location.assign(homePathForRole(mismatchRole));
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col justify-between overflow-x-hidden bg-[#fafbfc] text-foreground font-sans selection:bg-primary-subtle selection:text-primary">
      {/* Background Decorative Artworks (Saffron curve top-left, Green curve bottom-right) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Top-Left Saffron Flowing Ribbon */}
        <SaffronFlowGraphic className="absolute -left-12 -top-16 h-[340px] w-[460px] sm:h-[420px] sm:w-[560px] lg:h-[480px] lg:w-[640px] opacity-90 transition-opacity" />

        {/* Bottom-Right India Green Flowing Ribbon */}
        <GreenFlowGraphic className="absolute -bottom-16 -right-12 h-[340px] w-[460px] sm:h-[420px] sm:w-[560px] lg:h-[480px] lg:w-[640px] opacity-90 transition-opacity" />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg p-1 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Return to e-Maap Home"
          >
            <BrandMark className="size-8 sm:size-9" />
            <div className="leading-tight">
              <span className="block text-[18px] font-bold tracking-tight text-primary">
                e-Maap
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Verification Hub
              </span>
            </div>
          </Link>

          <nav
            aria-label="Auxiliary navigation"
            className="flex items-center gap-2 text-[13px] sm:text-[14px]"
          >
            <Link
              to="/help"
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            >
              Help &amp; FAQ
            </Link>
            <span
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-muted-foreground"
              title="Official portal language: English"
            >
              English
            </span>
          </nav>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 items-center px-4 py-6 sm:px-8 lg:py-10">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ========================================================
              LEFT COLUMN: Brand identity, Ashoka Chakra & Monuments
              ======================================================== */}
          <section className="relative flex flex-col justify-center lg:col-span-6 xl:col-span-7">
            {/* Ashoka Chakra watermark background (large, subtle, centered in left column) */}
            <div
              className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 size-[340px] sm:size-[420px] lg:size-[480px] opacity-[0.05]"
              aria-hidden="true"
            >
              <AshokaChakraGraphic className="size-full animate-[spin_180s_linear_infinite]" />
            </div>

            <div className="relative z-10 max-w-[540px]">
              {/* National Identity / e-Maap Emblem Lockup */}
              <div className="mb-6 inline-flex items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-xl bg-white border border-border shadow-sm">
                  <BrandMark className="size-9" />
                </div>
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#ff671f]">
                    National Digital Portal
                  </span>
                  <div className="h-0.5 w-12 bg-gradient-to-r from-[#ff671f] via-[#000080] to-[#138808] rounded-full mt-0.5" />
                </div>
              </div>

              {/* Title & Organization Identity */}
              <h1 className="text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold tracking-tight text-[#000080] leading-[1.15]">
                <span>LEGAL METROLOGY</span>
                <span className="block text-[24px] sm:text-[30px] lg:text-[32px] font-semibold text-foreground mt-1 tracking-normal">
                  INSPECTION MANAGEMENT SYSTEM
                </span>
              </h1>

              {/* Accent separator bar with Saffron and Green stops */}
              <div className="my-5 flex items-center gap-2" aria-hidden="true">
                <div className="h-1 w-16 rounded-full bg-[#ff671f]" />
                <div className="h-1 w-8 rounded-full bg-[#000080]" />
                <div className="h-1 w-16 rounded-full bg-[#138808]" />
              </div>

              {/* Motto / Tagline matching the official reference */}
              <p className="text-[17px] sm:text-[19px] font-medium text-foreground/80 tracking-wide">
                Accurate Measures, Fair Trade
              </p>

              <p className="mt-3 max-w-[460px] text-[14px] leading-relaxed text-muted-foreground">
                Authoritative verification register for weights, measuring instruments, and legal
                inspection certificates under standard metrology regulations.
              </p>

              {/* Quick direct link for consumers/public */}
              <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-border/80 bg-surface/90 backdrop-blur-sm p-3.5 shadow-sm">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <Search className="size-4" />
                </div>
                <div className="text-[13px]">
                  <p className="font-semibold text-foreground">Verifying a stamp or certificate?</p>
                  <p className="text-muted-foreground">
                    Consumers do not require an account.{" "}
                    <Link
                      to="/verify"
                      className="font-semibold text-primary underline hover:text-primary/80"
                    >
                      Verify an identifier →
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Indian Architectural Skyline Illustration (bottom of left column) */}
            <div className="relative mt-8 sm:mt-12 w-full max-w-[580px]" aria-hidden="true">
              <HeritageSkylineGraphic className="w-full h-auto max-h-[160px] object-bottom" />
            </div>
          </section>

          {/* ========================================================
              RIGHT COLUMN: Elevated Login Card
              ======================================================== */}
          <section className="relative z-20 flex justify-center lg:col-span-6 xl:col-span-5">
            <div className="relative w-full max-w-[470px] overflow-hidden rounded-2xl border border-border/90 bg-surface shadow-[0_16px_48px_rgba(0,0,128,0.07)]">
              {/* Top Dual Accent Border (Saffron on left, India Green on right) */}
              <div className="grid h-1.5 w-full grid-cols-2" aria-hidden="true">
                <div className="bg-[#ff671f]" />
                <div className="bg-[#138808]" />
              </div>

              <div className="p-6 sm:p-8">
                {/* Header inside Card */}
                <div className="text-center">
                  <span className="text-[13px] font-medium text-muted-foreground">
                    Welcome Back!
                  </span>
                  <h2 className="mt-1 text-[24px] sm:text-[26px] font-bold tracking-tight text-foreground">
                    {mode === "signin" ? "Login to Your Account" : "Create e-Maap Account"}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Secure access to e-Maap Legal Metrology System
                  </p>
                </div>

                {/* ROLE SELECTION ("LOGIN AS") */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      LOGIN AS
                    </span>
                    <span className="text-[11px] text-muted-foreground">Select portal role</span>
                  </div>

                  {/* 4 Roles Matching the Official Screenshot: Admin, Owner, LMO Officer, Client */}
                  <div
                    className="mt-2.5 grid grid-cols-4 gap-2 w-full"
                    role="radiogroup"
                    aria-label="Select portal role"
                  >
                    {PORTAL_ROLES.map((role) => (
                      <RoleSelectorCard
                        key={role.id}
                        role={role}
                        isSelected={selectedRole === role.id}
                        onSelect={(id) => {
                          setSelectedRole(id);
                          setError(null);
                          setMismatchRole(null);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* ROLE-SPECIFIC PANELS CONTAINER (FIXED GEOMETRY & ZERO LAYOUT SHIFT) */}
                <div className="mt-6 w-full min-w-0" id="role-content-container">
                  {selectedRole === "client" ? (
                    <ClientRolePanel />
                  ) : selectedRole === "admin" ? (
                    <AdminRolePanel
                      onSwitchToInspector={() => {
                        setSelectedRole("inspector");
                        setError(null);
                        setMismatchRole(null);
                      }}
                    />
                  ) : (
                    /* STANDARD AUTHENTICATION FORM FOR OWNER & LMO OFFICER */
                    <form onSubmit={handleSignIn} noValidate className="w-full min-w-0 space-y-4">
                      {/* Username / Email Field with leading Icon */}
                      <div>
                        <Label htmlFor="email" className="label-text sr-only">
                          Username / Email ID
                        </Label>
                        <div className="relative">
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"
                            aria-hidden="true"
                          >
                            <User className="size-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Username / Email ID"
                            className="h-11 pl-10 text-[14px] bg-white border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                            aria-invalid={error ? true : undefined}
                          />
                        </div>
                      </div>

                      {/* Password Field with leading Icon and Visibility Toggle */}
                      <div>
                        <Label htmlFor="password" className="label-text sr-only">
                          Password
                        </Label>
                        <div className="relative">
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"
                            aria-hidden="true"
                          >
                            <Lock className="size-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="h-11 pl-10 pr-10 text-[14px] bg-white border-border focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                            aria-invalid={error ? true : undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" aria-hidden="true" />
                            ) : (
                              <Eye className="size-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me & Forgot Password Links */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="remember-me"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                          />
                          <label
                            htmlFor="remember-me"
                            className="text-[13px] font-medium text-muted-foreground cursor-pointer select-none leading-none"
                          >
                            Remember me
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setForgotNotice(null);
                            setForgotError(null);
                            setForgotOpen(true);
                          }}
                          className="text-[13px] font-medium text-primary hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      {/* Accessible Error and Notices */}
                      {error ? (
                        <div
                          role="alert"
                          className="rounded-lg border border-error/30 bg-error-subtle p-3 text-[13px] text-error flex items-start gap-2.5"
                        >
                          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="flex-1">
                            <p className="font-semibold">{error}</p>
                            {mismatchRole ? (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleRoleMismatchSwitch}
                                  className="h-8 border-error/40 text-error hover:bg-error-subtle text-[12px] font-semibold"
                                >
                                  Switch to{" "}
                                  {mismatchRole === "business" ? "Business Owner" : "LMO Officer"}{" "}
                                  &amp; Continue →
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {notice ? (
                        <div
                          role="status"
                          className="rounded-lg border border-success/30 bg-success-subtle p-3 text-[13px] text-success flex items-start gap-2.5"
                        >
                          <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="font-medium">{notice}</p>
                        </div>
                      ) : null}

                      {biometricNotice ? (
                        <div
                          role="status"
                          className="rounded-lg border border-info/30 bg-info-subtle p-3 text-[13px] text-info flex items-start gap-2.5"
                        >
                          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-[12px] leading-relaxed">{biometricNotice}</p>
                        </div>
                      ) : null}

                      {/* Primary Sign In Button */}
                      <Button
                        type="submit"
                        disabled={busy}
                        className="relative mt-2 h-12 w-full rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-[15px] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
                      >
                        {busy ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            <span>Authenticating...</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                            <ArrowRight className="size-4 ml-1" aria-hidden="true" />
                          </span>
                        )}
                      </Button>

                      {/* Divider "OR" */}
                      <div className="relative my-4 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-border" />
                        </div>
                        <span className="relative bg-surface px-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                          OR
                        </span>
                      </div>

                      {/* Biometric / Secondary Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBiometricLogin}
                        className="h-11 w-full rounded-xl border-border bg-surface hover:bg-surface-muted text-foreground text-[14px] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Fingerprint className="size-4 text-primary" aria-hidden="true" />
                        <span>Sign in with Biometric</span>
                      </Button>

                      {/* Switch between Sign in and Create Account */}
                      <div className="pt-2 text-center text-[13px] text-muted-foreground">
                        {mode === "signin" ? (
                          <span>
                            Need a business account?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setMode("signup");
                                setError(null);
                                setNotice(null);
                              }}
                              className="font-semibold text-primary hover:underline cursor-pointer"
                            >
                              Create one now
                            </button>
                          </span>
                        ) : (
                          <span>
                            Already registered?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setMode("signin");
                                setError(null);
                                setNotice(null);
                              }}
                              className="font-semibold text-primary hover:underline cursor-pointer"
                            >
                              Sign in instead
                            </button>
                          </span>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* Card Footer Copyright */}
                <div className="mt-6 border-t border-border pt-4 text-center">
                  <p className="text-[12px] text-muted-foreground">
                    &copy; {new Date().getFullYear()} e-Maap Verification System. All Rights
                    Reserved.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Center Government-Style Initiative Tagline (matching reference) */}
      <footer className="relative z-20 w-full py-4 text-center px-4">
        <div className="flex items-center justify-center gap-3 text-[12px] sm:text-[13px] font-medium text-muted-foreground">
          <div className="h-0.5 w-8 sm:w-12 bg-[#ff671f]" aria-hidden="true" />
          <span>An Initiative Towards Fair Trade and Consumer Protection</span>
          <div className="h-0.5 w-8 sm:w-12 bg-[#138808]" aria-hidden="true" />
        </div>
      </footer>

      {/* Forgot Password Accessible Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-h4 font-bold text-foreground">
              Reset your password
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground">
              Enter your registered email address to receive password recovery instructions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="forgot-email" className="label-text">
                Registered Email
              </Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.gov.in"
                className="mt-2 h-11"
              />
            </div>

            {forgotError ? (
              <p
                role="alert"
                className="rounded-md border border-error/30 bg-error-subtle p-2.5 text-[13px] text-error"
              >
                {forgotError}
              </p>
            ) : null}

            {forgotNotice ? (
              <p
                role="status"
                className="rounded-md border border-success/30 bg-success-subtle p-2.5 text-[13px] text-success"
              >
                {forgotNotice}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                className="h-10"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={forgotBusy} className="h-10">
                {forgotBusy ? <Loader2 className="size-4 animate-spin" /> : "Send instructions"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
