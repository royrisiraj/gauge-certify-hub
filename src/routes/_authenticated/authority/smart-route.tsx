import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/authority/smart-route")({
  beforeLoad: () => {
    throw redirect({ to: "/lmo/smart-route" });
  },
  component: () => null,
});
