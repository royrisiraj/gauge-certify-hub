import { createFileRoute } from "@tanstack/react-router";
import { SmartRoutePage } from "@/components/emaap/SmartRoutePage";

export const Route = createFileRoute("/_authenticated/lmo/smart-route")({
  head: () => ({
    meta: [
      { title: "Smart Route — e-Maap LMO Officer GIS" },
      {
        name: "description",
        content:
          "Intelligent multi-factor field inspection routing and GIS dispatch for Legal Metrology Officers.",
      },
    ],
  }),
  component: SmartRoutePage,
});
