import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/business/")({
  beforeLoad: () => {
    throw redirect({ to: "/business/dashboard" });
  },
  component: () => null,
});
