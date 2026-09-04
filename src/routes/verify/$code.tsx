import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import {
  VerificationResult,
  type VerificationPayload,
} from "@/components/emaap/VerificationResult";
import { Button } from "@/components/ui/button";
import { statusMeta } from "@/lib/emaap/status";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify/$code")({
  head: () => ({
    meta: [
      { title: "Verification result — e-Maap" },
      {
        name: "description",
        content:
          "Current verification status recorded for this instrument or certificate identifier.",
      },
      { property: "og:title", content: "Verification result — e-Maap" },
      {
        property: "og:description",
        content:
          "Current verification status recorded for this instrument or certificate identifier.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyResultPage,
});

function VerifyResultPage() {
  const { code } = Route.useParams();

  const query = useQuery({
    queryKey: ["public-verify", code],
    retry: false,
    queryFn: async (): Promise<VerificationPayload> => {
      const { data, error } = await supabase.rpc("public_verify", { p_code: code });
      // A transport or service failure is NOT an invalid certificate.
      if (error) throw new Error(error.message);
      return data as unknown as VerificationPayload;
    },
  });

  const shareUrl = typeof window === "undefined" ? undefined : window.location.href;

  return (
    <PublicShell>
      <div className="px-4 py-10 md:px-8">
        {query.isPending ? (
          <div
            role="status"
            aria-live="polite"
            className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-14"
          >
            <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
            <p className="text-[15px] font-medium">Checking the verification record…</p>
            <p className="numeric caption-text">{code}</p>
          </div>
        ) : query.isError ? (
          <ServiceError code={code} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : (
          <VerificationResult data={query.data} shareUrl={shareUrl} />
        )}
      </div>
    </PublicShell>
  );
}

function ServiceError({
  code,
  onRetry,
  retrying,
}: {
  code: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  const meta = statusMeta("SERVICE_ERROR");
  const Icon = meta.icon;
  return (
    <div className="mx-auto w-full max-w-[680px]">
      <section
        aria-live="assertive"
        className="rounded-xl border-2 border-info/40 bg-info-subtle px-5 py-6 text-info sm:px-7"
      >
        <div className="flex items-start gap-3">
          <Icon aria-hidden="true" className="mt-0.5 size-8 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
              Verification result
            </p>
            <h1 className="text-h2 font-bold">{meta.label}</h1>
            <p className="mt-1 text-[15px] font-medium text-foreground">{meta.explanation}</p>
          </div>
        </div>
      </section>
      <div className="surface-card mt-4 p-5">
        <p className="text-[15px] text-foreground">
          We could not reach the verification service just now.{" "}
          <strong>This does not mean the certificate is invalid.</strong> No verification status has
          been determined for this identifier.
        </p>
        <p className="numeric caption-text mt-2">Identifier: {code}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRetry} disabled={retrying}>
            <RefreshCw aria-hidden="true" className={retrying ? "size-4 animate-spin" : "size-4"} />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link to="/verify">Check another identifier</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
