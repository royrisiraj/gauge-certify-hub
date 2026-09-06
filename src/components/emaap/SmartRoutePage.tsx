import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Navigation,
  MapPin,
  Clock,
  Award,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldCheck,
  Compass,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartMap } from "@/components/emaap/SmartMap";
import type { RouteSite } from "@/server/smartRoute";

// Default registered commercial cluster coordinates (Kolkata region where live verification requests are registered)
const REGIONAL_CLUSTER = {
  name: "Kolkata Commercial District",
  lat: 22.4749,
  lng: 88.3581,
};

export function SmartRoutePage() {
  const { data: account, isLoading: accountLoading } = useAccount();

  const [isLocating, setIsLocating] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [officerLocation, setOfficerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routes, setRoutes] = useState<RouteSite[] | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState<number>(0);

  /**
   * Request browser GPS position and generate route
   */
  const handleGenerateRoute = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your current browser.");
      return;
    }

    setErrorMessage(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setOfficerLocation({ latitude, longitude });
        fetchSmartRoute(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage(
              "Location permission denied. Please allow location access in your browser to generate the GIS route."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage(
              "Location information is currently unavailable. Check your device GPS or network connection."
            );
            break;
          case error.TIMEOUT:
            setErrorMessage(
              "Location request timed out. Please try again or test with the regional cluster coordinates."
            );
            break;
          default:
            setErrorMessage(
              "An unknown error occurred while retrieving your location. (" + error.message + ")"
            );
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Test / Simulate with the registered cluster coordinates
   */
  const handleTestClusterRoute = () => {
    setErrorMessage(null);
    setOfficerLocation({ latitude: REGIONAL_CLUSTER.lat, longitude: REGIONAL_CLUSTER.lng });
    fetchSmartRoute(REGIONAL_CLUSTER.lat, REGIONAL_CLUSTER.lng);
  };

  /**
   * Calls POST /api/gis/smart-route
   */
  const fetchSmartRoute = async (latitude: number, longitude: number) => {
    setIsComputing(true);
    setErrorMessage(null);

    try {
      // Get current authenticated user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/gis/smart-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          officer_id: account?.userId,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      setRoutes(data.routes || []);
      setTotalFound(data.total_found ?? (data.routes?.length || 0));
      if (data.routes && data.routes.length > 0) {
        setSelectedSiteId(data.routes[0].requestId);
      }
    } catch (err: unknown) {
      console.error("[SmartRoutePage] fetch error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to compute route: ${msg}`);
    } finally {
      setIsComputing(false);
    }
  };

  const totalDistanceKm = routes
    ? routes.reduce((sum, s) => sum + s.distanceKm, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="LEGAL METROLOGY ON-SITE INSPECTION DISPATCH"
        title="Smart GIS Route Schedule"
        description="Automated multi-factor inspection sequence generator. Dispatches pending verification requests within 5 km of your physical location, scored by priority, pendency, and proximity."
      />

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive-subtle p-4 text-destructive flex items-start gap-3 shadow-xs">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-[13.5px]">
            <strong className="font-semibold block">Notice</strong>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRoute}
                className="h-8 text-[12px] bg-white hover:bg-slate-50 text-slate-800 cursor-pointer"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Retry GPS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestClusterRoute}
                className="h-8 text-[12px] bg-white hover:bg-slate-50 text-[#000080] font-semibold cursor-pointer border-[#000080]/30"
              >
                <Compass className="size-3.5 mr-1.5 text-[#ff671f]" />
                Test With Regional Cluster
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INITIAL STATE: Centered Hero Card */}
      {!routes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-center max-w-[760px] mx-auto my-6">
          {/* Ashoka Saffron & Navy Emblem Accent */}
          <div className="mx-auto size-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-[#000080]/20 flex items-center justify-center shadow-xs mb-5">
            <Compass className="size-8 text-[#000080] animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Optimized Field Inspection Dispatch
          </h2>
          <p className="mt-2.5 text-[14px] text-slate-600 leading-relaxed max-w-[560px] mx-auto">
            Click below to capture your current location and dynamically construct an optimized
            inspection sequence of up to 6 priority commercial sites within a 5-kilometer radius.
          </p>

          {/* Scoring Rules Indicator Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-7 text-left max-w-[620px] mx-auto">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080] flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[#ff671f]" />
                Priority Score
              </div>
              <p className="mt-1 text-[12px] text-slate-600">
                High: 50 pts • Medium: 30 pts • Low: 10 pts
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080] flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-600" />
                Pendency Score
              </div>
              <p className="mt-1 text-[12px] text-slate-600">
                ≥10d: 30 pts • 5–9d: 20 pts • &lt;5d: 10 pts
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080] flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#138808]" />
                Proximity Score
              </div>
              <p className="mt-1 text-[12px] text-slate-600">
                &lt;2 km: 20 pts • 2–5 km: 10 pts
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
            <Button
              id="btn-generate-smart-route"
              size="lg"
              onClick={handleGenerateRoute}
              disabled={isLocating || isComputing || accountLoading}
              className="h-12 px-7 rounded-xl bg-[#000080] hover:bg-[#000080]/90 text-white font-bold text-[15px] shadow-md transition-all cursor-pointer hover:shadow-lg w-full sm:w-auto"
            >
              {isLocating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-[#ff671f]" />
                  <span>Acquiring GPS Position...</span>
                </span>
              ) : isComputing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-[#ff671f]" />
                  <span>Optimizing GIS Route...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>📍 Generate Smart GIS Schedule</span>
                </span>
              )}
            </Button>
          </div>

          <p className="mt-3 text-[11.5px] text-slate-400">
            Permission is requested strictly upon button click. Geolocation data is used exclusively to sequence verified inspection sites.
          </p>

          {/* Testing shortcut for desktop environments without physical GPS */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[12px] text-slate-500">
            <span>In office or testing on desktop?</span>
            <button
              type="button"
              onClick={handleTestClusterRoute}
              disabled={isLocating || isComputing}
              className="text-[#000080] font-semibold underline hover:text-[#000080]/80 cursor-pointer"
            >
              Test with Kolkata Commercial Hub coordinates
            </button>
          </div>
        </div>
      )}

      {/* RESULTS SPLIT VIEW */}
      {routes && officerLocation && (
        <div className="space-y-4">
          {/* Active Route Summary Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="size-10 rounded-lg bg-[#000080]/10 flex items-center justify-center text-[#000080] shrink-0">
                <Navigation className="size-5 text-[#000080]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-slate-900">
                    Optimized Schedule: {routes.length} Inspection {routes.length === 1 ? "Site" : "Sites"}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    Nearest-Neighbor Active
                  </span>
                </div>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  Origin: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 text-[11px]">{officerLocation.latitude.toFixed(4)}, {officerLocation.longitude.toFixed(4)}</code> • Radius: ≤ 5.0 km
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRoute}
                disabled={isLocating || isComputing}
                className="h-9 px-3 text-[13px] bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${isComputing ? "animate-spin" : ""}`} />
                Refresh GPS
              </Button>
            </div>
          </div>

          {/* SPLIT VIEW GRID: Table on LEFT, Map on RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Route Table (Maximum 6 sites) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-800">
                      Recommended Inspection Sequence
                    </span>
                    <Badge variant="outline" className="text-[11px] font-semibold bg-white">
                      Top {routes.length} of {totalFound} within 5km
                    </Badge>
                  </div>
                </div>

                {routes.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <MapPin className="size-6" />
                    </div>
                    <h4 className="text-[14px] font-bold text-slate-800">
                      No Pending Sites Within 5 km
                    </h4>
                    <p className="mt-1 text-[12.5px] text-slate-500 max-w-[340px] mx-auto">
                      There are no pending verification requests within 5 kilometers of your current GPS position.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestClusterRoute}
                      className="mt-4 text-[12px] border-[#000080]/30 text-[#000080] font-semibold"
                    >
                      <Compass className="size-3.5 mr-1.5 text-[#ff671f]" />
                      Simulate Kolkata Regional Cluster
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 px-3 w-12 text-center">SEQ</th>
                          <th className="py-2.5 px-3">Business Name</th>
                          <th className="py-2.5 px-3 text-right">DIST</th>
                          <th className="py-2.5 px-3 text-center">Days Pending</th>
                          <th className="py-2.5 px-3 text-center">Priority Score</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {routes.map((site) => {
                          const isSelected = selectedSiteId === site.requestId;
                          return (
                            <tr
                              key={site.requestId}
                              onClick={() => setSelectedSiteId(site.requestId)}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50/70 border-l-4 border-l-[#000080]"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              {/* SEQ */}
                              <td className="py-3 px-3 text-center font-bold">
                                <span className={`inline-flex items-center justify-center size-6 rounded-full text-[11.5px] font-extrabold ${
                                  isSelected
                                    ? "bg-[#ff671f] text-white shadow-xs"
                                    : "bg-[#000080] text-white"
                                }`}>
                                  {site.sequence}
                                </span>
                              </td>

                              {/* Business Name */}
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 line-clamp-1">
                                  {site.businessName}
                                </div>
                                <div className="text-[11.5px] text-slate-500 line-clamp-1 mt-0.5">
                                  {site.address}
                                </div>
                                <div className="text-[10.5px] text-[#000080] font-medium mt-0.5">
                                  {site.category}
                                </div>
                              </td>

                              {/* DIST */}
                              <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                                {site.distanceKm.toFixed(2)} km
                              </td>

                              {/* Days Pending */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    site.daysPending >= 10
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : site.daysPending >= 5
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {site.daysPending} {site.daysPending === 1 ? "day" : "days"}
                                </span>
                              </td>

                              {/* Priority Score */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="font-extrabold text-[13px] text-slate-900">
                                    {site.priorityScore}
                                  </span>
                                  <span className="text-[10px] text-slate-400">/ 100</span>
                                </div>
                                <div className="text-[10px] font-medium text-slate-500">
                                  {site.priority}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSiteId(site.requestId);
                                  }}
                                  className="h-7 px-2.5 text-[11px] text-[#000080] hover:bg-blue-100 font-semibold cursor-pointer"
                                >
                                  Focus
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Nearest-Neighbor Explanation Note */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[12px] text-slate-600 flex items-start gap-2.5">
                <Info className="size-4 text-[#000080] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>GIS Optimization Logic:</strong> Filtered to pending requests within 5 km of your starting location. Sites were scored by Priority (up to 50 pts), Pendency (up to 30 pts), and Proximity (up to 20 pts). The sequence is generated by greedy nearest-neighbor navigation starting from your position.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Leaflet Map */}
            <div className="lg:col-span-6 h-[540px] lg:sticky lg:top-24">
              <SmartMap
                officerLocation={officerLocation}
                sites={routes}
                selectedSiteId={selectedSiteId}
                onSelectSite={(site) => setSelectedSiteId(site.requestId)}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
