import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/emaap/PublicShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help with verification — e-Maap" },
      {
        name: "description",
        content:
          "How to find a verification identifier, what each verification status means, and what to do when a result is not what you expected.",
      },
      { property: "og:title", content: "Help with verification — e-Maap" },
      {
        property: "og:description",
        content:
          "What each verification status means and how to check an instrument or certificate.",
      },
    ],
  }),
  component: HelpPage,
});

const STATES = [
  [
    "Verified",
    "A certificate exists for this instrument and is currently within its recorded validity period.",
  ],
  [
    "Expiring soon",
    "Still valid, but the recorded validity period ends within the configured reminder window.",
  ],
  [
    "Expired",
    "The certificate is genuine, but its validity period has ended. Expired is not the same as invalid.",
  ],
  [
    "Pending / not yet verified",
    "A verification request exists, or none has been made yet. No decision has been recorded.",
  ],
  [
    "Suspended",
    "The certificate exists but has been suspended by the authority, with a recorded reason.",
  ],
  [
    "Failed / rejected",
    "An assessment or request was recorded as unsuccessful. No valid certificate results from it.",
  ],
  [
    "Not found",
    "No record matches the identifier you entered. Check the identifier before drawing any conclusion.",
  ],
  [
    "Service unavailable",
    "The verification service could not be reached. This says nothing about the certificate — no status was determined.",
  ],
];

function HelpPage() {
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-[760px] px-4 py-12 md:px-8">
        <h1 className="text-h1 font-bold">Help with verification</h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          Anyone can check an instrument or certificate without an account.
        </p>

        <section className="mt-8" aria-labelledby="find-identifier">
          <h2 id="find-identifier" className="text-h3 font-semibold">
            Finding the identifier
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-muted-foreground">
            <li>The certificate number, printed on the verification certificate.</li>
            <li>The verification code printed next to the QR code.</li>
            <li>The instrument identifier on the instrument label.</li>
            <li>The instrument serial number given by its manufacturer.</li>
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="states">
          <h2 id="states" className="text-h3 font-semibold">
            What each result means
          </h2>
          <dl className="mt-3 divide-y divide-border">
            {STATES.map(([label, text]) => (
              <div key={label} className="py-3">
                <dt className="text-[15px] font-semibold text-foreground">{label}</dt>
                <dd className="mt-0.5 text-[15px] text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="mt-8 rounded-xl border border-border bg-surface-muted p-5"
          aria-labelledby="trust"
        >
          <h2 id="trust" className="text-h3 font-semibold">
            What a verification page does and does not prove
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            A result reflects the record held by this system for the identifier you entered. Badges,
            colours, seals and QR graphics are presentation only — they are not proof of
            authenticity by themselves. If a result does not match the document in front of you,
            contact the verification authority named on the record.
          </p>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Validity periods, tolerance values and authority names in this deployment are
            illustrative demo configuration. They are not statements of any legal or regulatory
            requirement.
          </p>
        </section>

        <p className="mt-8 text-[15px]">
          <Link to="/verify" className="font-semibold text-primary underline">
            Check an identifier
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
