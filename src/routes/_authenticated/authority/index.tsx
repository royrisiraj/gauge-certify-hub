import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/authority/")(
  {
    beforeLoad: () => {
      throw redirect({ to: "/authority/dashboard" });
    },
    component: () => null,
  },
);
