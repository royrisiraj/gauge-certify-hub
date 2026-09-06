import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from "leaflet";
import type { RouteSite } from "@/server/smartRoute";
import { LocateFixed, MapPin, Navigation, Shield, ZoomIn, ZoomOut, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SmartMapProps {
  officerLocation: {
    latitude: number;
    longitude: number;
  };
  sites: RouteSite[];
  selectedSiteId?: string | null;
  onSelectSite?: (site: RouteSite) => void;
  className?: string;
}

export function SmartMap({
  officerLocation,
  sites,
  selectedSiteId,
  onSelectSite,
  className = "",
}: SmartMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const polylineRef = useRef<LeafletPolyline | null>(null);
  const glowPolylineRef = useRef<LeafletPolyline | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      try {
        const L = (await import("leaflet")).default;

        // Ensure Leaflet CSS is loaded in document head
        if (!document.getElementById("emaap-leaflet-css")) {
          const link = document.createElement("link");
          link.id = "emaap-leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up any existing map instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [officerLocation.latitude, officerLocation.longitude],
          zoom: 14,
          scrollWheelZoom: true,
          zoomControl: false, // We'll provide customized government-styled controls
        });

        // OpenStreetMap CartoDB Positron / OSM standard tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | e-Maap GIS',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsMapReady(true);
      } catch (err) {
        console.error("[SmartMap] Failed to initialize Leaflet:", err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers, polyline and bounds whenever sites or officerLocation change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    let isMounted = true;

    async function updateMapLayers() {
      const map = mapInstanceRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;
      if (!isMounted) return;

      // 1. Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // 2. Remove old polylines
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (glowPolylineRef.current) {
        glowPolylineRef.current.remove();
        glowPolylineRef.current = null;
      }

      const allCoordinates: [number, number][] = [
        [officerLocation.latitude, officerLocation.longitude],
      ];

      // 3. Create Distinct Officer Marker (Navy Blue & Gold Pulse)
      const officerIcon = L.divIcon({
        className: "officer-gis-marker",
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(0, 0, 128, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #000080; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,128,0.4); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff671f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style="position: absolute; bottom: -18px; background: #000080; color: #ffffff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.25); letter-spacing: 0.3px;">
              OFFICER
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const officerMarker = L.marker([officerLocation.latitude, officerLocation.longitude], {
        icon: officerIcon,
        zIndexOffset: 1000,
        title: "Officer Starting Location",
      }).addTo(map);

      officerMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px 2px; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #000080;"></span>
            <strong style="font-size: 13px; color: #000080;">Officer Starting Location</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.4;">
            GPS Origin: <code style="font-size: 11px; color: #0f172a; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">${officerLocation.latitude.toFixed(5)}, ${officerLocation.longitude.toFixed(5)}</code>
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #138808; font-weight: 600;">
            Route Start Point (SEQ 0)
          </div>
        </div>
      `);

      markersRef.current.push(officerMarker);

      // 4. Create Recommended Business Stop Markers (1 to 6)
      sites.forEach((site) => {
        const isSelected = selectedSiteId === site.requestId;
        const latLng: [number, number] = [site.latitude, site.longitude];
        allCoordinates.push(latLng);

        // Sequence pin colors: #1 is highlighted in primary emerald/navy, selected site is highlighted
        const badgeBg = isSelected ? "#ff671f" : "#000080";
        const pinScale = isSelected ? 1.15 : 1.0;

        const siteIcon = L.divIcon({
          className: `smart-route-pin-${site.sequence}`,
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%) scale(${pinScale}); transition: transform 0.2s ease; cursor: pointer;">
              <div style="background: ${badgeBg}; color: #ffffff; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2.5px solid #ffffff;">
                <span style="transform: rotate(45deg); font-size: 13px; font-weight: 800; color: #ffffff;">
                  ${site.sequence}
                </span>
              </div>
              <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.9); color: #ffffff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; white-space: nowrap; max-width: 130px; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                ${site.businessName}
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker(latLng, {
          icon: siteIcon,
          zIndexOffset: isSelected ? 900 : 500 + site.sequence,
          title: `Stop #${site.sequence}: ${site.businessName}`,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; padding: 4px 2px; min-width: 230px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
              <span style="background: #000080; color: #ffffff; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
                STOP #${site.sequence}
              </span>
              <span style="background: ${site.priority === 'High' ? '#fef2f2' : '#f0fdf4'}; color: ${site.priority === 'High' ? '#b91c1c' : '#15803d'}; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid ${site.priority === 'High' ? '#fecaca' : '#bbf7d0'};">
                ${site.priority} Priority (${site.priorityScore} pts)
              </span>
            </div>
            <strong style="font-size: 13px; color: #0f172a; display: block; line-height: 1.3;">${site.businessName}</strong>
            <p style="font-size: 11px; color: #64748b; margin: 3px 0 6px 0; line-height: 1.35;">${site.address}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #f1f5f9; font-size: 11px;">
              <div>
                <span style="color: #64748b; display: block; font-size: 10px;">Distance:</span>
                <strong style="color: #000080;">${site.distanceKm.toFixed(2)} km</strong>
              </div>
              <div>
                <span style="color: #64748b; display: block; font-size: 10px;">Pending:</span>
                <strong style="color: #ea580c;">${site.daysPending} days</strong>
              </div>
            </div>
            <div style="margin-top: 6px; font-size: 11px; color: #475569;">
              Instrument: <strong>${site.category}</strong>
            </div>
          </div>
        `);

        marker.on("click", () => {
          if (onSelectSite) onSelectSite(site);
        });

        markersRef.current.push(marker);

        if (isSelected) {
          marker.openPopup();
        }
      });

      // 5. Draw Polyline connecting Officer -> Stop #1 -> Stop #2 -> ... in exact sequence
      if (allCoordinates.length > 1) {
        // Outer glow polyline
        glowPolylineRef.current = L.polyline(allCoordinates, {
          color: "#000080",
          weight: 7,
          opacity: 0.22,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // Inner styled polyline (Navy with dashed effect)
        polylineRef.current = L.polyline(allCoordinates, {
          color: "#ff671f",
          weight: 3.5,
          opacity: 0.95,
          dashArray: "7, 8",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // Fit bounds with padding so everything is visible
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds, {
          padding: [45, 45],
          maxZoom: 16,
          animate: true,
        });
      } else {
        map.setView([officerLocation.latitude, officerLocation.longitude], 15, { animate: true });
      }
    }

    updateMapLayers();

    return () => {
      isMounted = false;
    };
  }, [isMapReady, officerLocation.latitude, officerLocation.longitude, sites, selectedSiteId, onSelectSite]);

  // Center on selected site if clicked from the left table
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedSiteId) return;
    const target = sites.find((s) => s.requestId === selectedSiteId);
    if (target) {
      mapInstanceRef.current.setView([target.latitude, target.longitude], 16, { animate: true });
    }
  }, [selectedSiteId, sites]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (sites.length > 0) {
      const allCoords: [number, number][] = [
        [officerLocation.latitude, officerLocation.longitude],
        ...sites.map((s): [number, number] => [s.latitude, s.longitude]),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (L && L.latLngBounds) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [45, 45] });
      } else {
        mapInstanceRef.current.setView([officerLocation.latitude, officerLocation.longitude], 14);
      }
    } else {
      mapInstanceRef.current.setView([officerLocation.latitude, officerLocation.longitude], 15);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`relative flex flex-col h-full w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Top Map Header & Legend Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[12px] z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold text-slate-800">
            <span className="size-2.5 rounded-full bg-[#000080]" aria-hidden="true" />
            <span>Officer Origin</span>
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="size-2.5 rounded-full bg-[#ff671f]" aria-hidden="true" />
            <span>Sequence 1–{sites.length}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-[#ff671f]" />
            <span>Smart Route Polyline</span>
          </span>
        </div>

        {/* Map Control Buttons */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            className="h-7 px-2 text-[11px] text-slate-700 bg-white hover:bg-slate-100 shadow-2xs cursor-pointer"
            title="Fit Route in View"
          >
            <LocateFixed className="size-3.5 mr-1 text-[#000080]" />
            Fit Route
          </Button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="size-7 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[14px] font-bold cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="size-7 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[14px] font-bold cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div
        ref={mapContainerRef}
        className="flex-1 w-full min-h-[420px] bg-slate-100 relative"
        tabIndex={0}
        aria-label="Smart Route GIS Map"
      />

      {/* Footer Info Overlay */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Leaflet GIS Engine • OpenStreetMap Layer</span>
        <span className="font-mono text-[10.5px]">
          Origin: {officerLocation.latitude.toFixed(4)}, {officerLocation.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
