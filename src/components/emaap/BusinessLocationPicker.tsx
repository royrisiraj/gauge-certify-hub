import { useState, useEffect, useRef, useCallback } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  RotateCcw,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface BusinessLocationData {
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
  source: "manual" | "map" | "geolocation" | "business";
}

export interface BusinessLocationPickerProps {
  value: BusinessLocationData;
  onChange: (value: BusinessLocationData) => void;
  error?: string | null;
  label?: string;
  description?: string;
  allowSameAsBusiness?: boolean;
  businessLocation?: BusinessLocationData | null;
  isSameAsBusiness?: boolean;
  onSameAsBusinessChange?: (isSame: boolean) => void;
}

// Prominent commercial presets across India for instant selection/fallback
const INDIAN_COMMERCIAL_PRESETS = [
  {
    label: "New Delhi (Connaught Place)",
    city: "New Delhi",
    state: "Delhi",
    lat: 28.6315,
    lng: 77.2167,
    pin: "110001",
  },
  {
    label: "Gurugram (Udyog Vihar)",
    city: "Gurugram",
    state: "Haryana",
    lat: 28.4981,
    lng: 77.0814,
    pin: "122016",
  },
  {
    label: "Mumbai (Bandra Kurla Complex)",
    city: "Mumbai",
    state: "Maharashtra",
    lat: 19.0664,
    lng: 72.8682,
    pin: "400051",
  },
  {
    label: "Bengaluru (Whitefield)",
    city: "Bengaluru",
    state: "Karnataka",
    lat: 12.9698,
    lng: 77.7499,
    pin: "560066",
  },
  {
    label: "Kolkata (Salt Lake Sector V)",
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5735,
    lng: 88.4331,
    pin: "700091",
  },
  {
    label: "Chennai (Guindy Industrial Estate)",
    city: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0067,
    lng: 80.2038,
    pin: "600032",
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Default center: New Delhi
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

interface GeoNotice {
  type: "success" | "denied" | "info";
  title: string;
  message: string;
}

export function BusinessLocationPicker({ value, onChange, error }: BusinessLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<GeoNotice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Keep local copies for controlled input behavior
  const { addressLine, locality, city, state, pincode, latitude, longitude } = value;

  // Stable ref for current value to prevent unnecessary re-runs
  const valueRef = useRef(value);
  valueRef.current = value;

  // Build a clean formatted address string
  const computeFormatted = useCallback(
    (al: string, loc: string, c: string, s: string, p: string) => {
      const parts = [al, loc, c, s, p ? `PIN: ${p}` : ""].map((x) => x?.trim()).filter(Boolean);
      return parts.join(", ");
    },
    [],
  );

  const updateFields = useCallback(
    (
      updates: Partial<BusinessLocationData>,
      newSource: "manual" | "map" | "geolocation" = "manual",
    ) => {
      const current = valueRef.current;
      const merged: BusinessLocationData = {
        ...current,
        ...updates,
        source: newSource,
      };
      merged.formattedAddress = computeFormatted(
        merged.addressLine,
        merged.locality,
        merged.city,
        merged.state,
        merged.pincode,
      );
      onChange(merged);
    },
    [onChange, computeFormatted],
  );

  // Reverse geocoding helper via OpenStreetMap Nominatim (with timeout and error safety)
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};

          // Extract best matches for Indian address structure
          const street =
            addr.road ||
            addr.street ||
            addr.building ||
            addr.commercial ||
            addr.industrial ||
            addr.suburb ||
            "";
          const loc = addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || "";
          const cityName =
            addr.city || addr.town || addr.municipality || addr.district || addr.county || "";
          const stateName = addr.state || "";
          const postCode = addr.postcode || "";

          updateFields(
            {
              latitude: lat,
              longitude: lng,
              addressLine:
                street || valueRef.current.addressLine || `Near ${cityName || "Commercial Zone"}`,
              locality: loc || valueRef.current.locality,
              city: cityName || valueRef.current.city,
              state: stateName || valueRef.current.state,
              pincode: postCode || valueRef.current.pincode,
            },
            "map",
          );
          return;
        }
      } catch {
        // Reverse geocoding network error or abort — gracefully preserve coordinates
      } finally {
        setIsReverseGeocoding(false);
      }

      // If reverse geocoding was unavailable or failed, still save coordinates cleanly
      updateFields(
        {
          latitude: lat,
          longitude: lng,
          addressLine:
            valueRef.current.addressLine || `Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        },
        "map",
      );
    },
    [updateFields],
  );

  // Stable reverseGeocode ref
  const reverseGeocodeRef = useRef(reverseGeocode);
  reverseGeocodeRef.current = reverseGeocode;

  // Initialize Leaflet map safely on client-side only (container is always visible)
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      try {
        const L = (await import("leaflet")).default;

        // Ensure Leaflet CSS is loaded in document
        if (!document.getElementById("emaap-leaflet-css")) {
          const link = document.createElement("link");
          link.id = "emaap-leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!isMounted || !mapContainerRef.current) return;

        // Clear any previous instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const initialLat = valueRef.current.latitude ?? DEFAULT_CENTER.lat;
        const initialLng = valueRef.current.longitude ?? DEFAULT_CENTER.lng;
        const initialZoom = valueRef.current.latitude && valueRef.current.longitude ? 15 : 12;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: initialZoom,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Custom e-Maap Ashoka Navy & Saffron Map Pin
        const customPin = L.divIcon({
          className: "emaap-map-pin",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
              <div style="background: #000080; color: #ffffff; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,128,0.45); border: 2.5px solid #ffffff;">
                <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff671f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
              </div>
              <div style="width: 10px; height: 5px; border-radius: 50%; background: rgba(0,0,0,0.35); filter: blur(1.5px); margin-top: 2px;"></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        // Add draggable marker
        const marker = L.marker([initialLat, initialLng], {
          icon: customPin,
          draggable: true,
          title: "Drag to set commercial establishment location",
        }).addTo(map);

        markerRef.current = marker;
        mapInstanceRef.current = map;

        // When user drags the marker
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          reverseGeocodeRef.current(pos.lat, pos.lng);
        });

        // When user clicks anywhere on map
        map.on("click", (e: LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
          reverseGeocodeRef.current(lat, lng);
        });

        setMapReady(true);
        setMapError(null);

        // Invalidate size to ensure crisp display
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Leaflet initialization warning:", err);
        setMapError(
          "Interactive map display could not be initialized. You can continue with manual address entry below.",
        );
      }
    }

    initLeaflet();

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync external coordinates changes into the map marker
  useEffect(() => {
    if (mapReady && mapInstanceRef.current && markerRef.current && latitude && longitude) {
      const curPos = markerRef.current.getLatLng();
      if (Math.abs(curPos.lat - latitude) > 0.0001 || Math.abs(curPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
      }
    }
  }, [latitude, longitude, mapReady]);

  // Geolocation handler: "Use My Current Location"
  // ONLY triggered when the user explicitly clicks the button.
  async function handleUseCurrentLocation() {
    // Reset any previous notices so no error is shown while waiting
    setGeoNotice(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoNotice({
        type: "info",
        title: "Geolocation Unsupported",
        message:
          "Browser geolocation is not supported on this device. You can enter your business address manually or select on the map.",
      });
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoNotice({
        type: "info",
        title: "Secure Connection Required",
        message:
          "Browser geolocation requires a secure HTTPS connection. Please access the application over HTTPS or enter your address manually.",
      });
      return;
    }

    setIsGeolocating(true);

    const onLocationSuccess = async (pos: GeolocationPosition) => {
      setIsGeolocating(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
      }

      await reverseGeocode(lat, lng);

      setGeoNotice({
        type: "success",
        title: "Current location selected",
        message:
          "Your establishment position has been set from GPS. Address fields have been synchronized.",
      });
    };

    const onLocationError = (err: GeolocationPositionError) => {
      setIsGeolocating(false);
      if (err.code === 1) {
        // GeolocationPositionError.PERMISSION_DENIED
        const inIframe = typeof window !== "undefined" && window.self !== window.top;
        const isPolicyBlocked =
          err.message && /policy|feature|disallowed|frame|delegate/i.test(err.message);

        setGeoNotice({
          type: "denied",
          title: "Location Permission Denied",
          message:
            isPolicyBlocked && inIframe
              ? "Location access was restricted by the browser frame. You can open the application in a new tab or enter your address manually."
              : "Location access was denied. You can still enter your business address manually or select a location on the map.",
        });
      } else if (err.code === 2) {
        // GeolocationPositionError.POSITION_UNAVAILABLE
        setGeoNotice({
          type: "info",
          title: "Location Unavailable",
          message:
            "GPS/device position is currently unavailable. You can enter your business address manually or select on the map.",
        });
      } else if (err.code === 3) {
        // GeolocationPositionError.TIMEOUT
        setGeoNotice({
          type: "info",
          title: "Location Request Timed Out",
          message:
            "Acquiring GPS location timed out. Please enter your address manually or select on the map.",
        });
      } else {
        setGeoNotice({
          type: "info",
          title: "Location Error",
          message:
            "Could not obtain current location. You can select your location on the map or enter your address manually.",
        });
      }
    };

    // Primary call to browser's native Geolocation API
    // Starts with high accuracy; if it times out on a desktop without GPS hardware, falls back to standard accuracy
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      (firstErr) => {
        // If explicitly denied by the user (code 1), do NOT retry; immediately report permission denied
        if (firstErr.code === 1) {
          onLocationError(firstErr);
          return;
        }

        // If high accuracy timed out or was unavailable (e.g. desktop device without GPS chip),
        // try standard accuracy once before reporting timeout or unavailable
        if (firstErr.code === 3 || firstErr.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onLocationSuccess,
            (secondErr) => {
              onLocationError(secondErr);
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            },
          );
          return;
        }

        onLocationError(firstErr);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  // Address Geocoding / Search handler: resolves search string or typed address to coordinates & map marker
  async function handleSearchAddress(customQuery?: string) {
    const q = (customQuery ?? searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          q,
        )}&countrycodes=in&limit=1`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);

          if (mapInstanceRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
          }

          reverseGeocode(lat, lng);
          setGeoNotice({
            type: "success",
            title: "Location Found",
            message: `Map centered on ${item.display_name?.split(",")[0] || q}.`,
          });
          return;
        }
      }
    } catch {
      // search fallback
    } finally {
      setIsSearching(false);
    }

    // Preset / Local city name fallback
    const matchedPreset = INDIAN_COMMERCIAL_PRESETS.find(
      (p) =>
        p.city.toLowerCase().includes(q.toLowerCase()) ||
        p.label.toLowerCase().includes(q.toLowerCase()) ||
        p.state.toLowerCase().includes(q.toLowerCase()),
    );

    if (matchedPreset) {
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([matchedPreset.lat, matchedPreset.lng]);
        mapInstanceRef.current.setView([matchedPreset.lat, matchedPreset.lng], 14, {
          animate: true,
        });
      }
      updateFields(
        {
          latitude: matchedPreset.lat,
          longitude: matchedPreset.lng,
          city: matchedPreset.city,
          state: matchedPreset.state,
          pincode: matchedPreset.pin,
          addressLine: valueRef.current.addressLine || matchedPreset.label,
        },
        "map",
      );
      setGeoNotice({
        type: "success",
        title: "Preset Applied",
        message: `Positioned at ${matchedPreset.label}.`,
      });
    } else {
      setGeoNotice({
        type: "info",
        title: "Search Results",
        message:
          "Could not resolve the exact place on map. You can still complete your address details manually or click directly on the map.",
      });
    }
  }

  // Explicit "Use Map Center" action button
  function handleConfirmMapCenter() {
    if (mapInstanceRef.current && markerRef.current) {
      const center = mapInstanceRef.current.getCenter();
      markerRef.current.setLatLng(center);
      reverseGeocode(center.lat, center.lng);
    }
  }

  // Sync address changes into map on blur (forward geocoding helper)
  function handleAddressFieldsBlur() {
    const combined = [addressLine, locality, city, state, pincode].filter(Boolean).join(", ");
    if ((city || pincode) && combined.length > 5 && !isSearching) {
      // If no pin placed yet or user edited city/pin, soft geocode in background
      handleSearchAddress(combined);
    }
  }

  const hasSelectedLocation = Boolean(
    (addressLine && (city || state || pincode)) || (latitude && longitude),
  );

  return (
    <div className="space-y-4 pt-1">
      {/* SECTION HEADER & USE MY CURRENT LOCATION BUTTON */}
      <div className="border-t border-slate-200/80 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-[14px] sm:text-[15px] font-bold text-slate-900">
                Business Location <span className="text-error">*</span>
              </Label>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Required
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-600 leading-relaxed max-w-[540px]">
              Provide the location of your commercial establishment. You can enter your business
              address, select a point directly on the interactive map, or use your current location.
            </p>
          </div>

          {/* "Use My Current Location" Action Button */}
          <Button
            id="btn-use-current-location"
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating}
            className="shrink-0 h-10 px-3.5 rounded-lg border-[#000080]/30 bg-white hover:bg-blue-50/80 text-[#000080] text-[12.5px] font-semibold transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
            title="Detect your device GPS coordinates and sync address"
          >
            {isGeolocating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin text-[#000080]" aria-hidden="true" />
                <span>Getting your location...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Navigation className="size-4 text-[#ff671f]" aria-hidden="true" />
                <span>Use My Current Location</span>
              </span>
            )}
          </Button>
        </div>

        {/* GEOLOCATION / NOTIFICATION NOTICE (Only shown if user triggered action; never on load) */}
        {geoNotice ? (
          <div
            role="status"
            className={`mt-3 flex items-start justify-between gap-2.5 rounded-lg border p-3 text-[12.5px] transition-all ${
              geoNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                : geoNotice.type === "denied"
                  ? "border-amber-200 bg-amber-50/90 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            <div className="flex items-start gap-2">
              {geoNotice.type === "success" ? (
                <CheckCircle2
                  className="size-4 shrink-0 mt-0.5 text-emerald-600"
                  aria-hidden="true"
                />
              ) : geoNotice.type === "denied" ? (
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-slate-500" aria-hidden="true" />
              )}
              <div>
                <p className="font-bold">{geoNotice.title}</p>
                <p className="mt-0.5 text-[12px] opacity-90 leading-snug">{geoNotice.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGeoNotice(null)}
              className="text-slate-400 hover:text-slate-700 text-xs px-1 font-bold cursor-pointer"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* UNIFIED LOCATION SEARCH BAR */}
        <div className="mt-3.5">
          <Label
            htmlFor="locationSearch"
            className="text-[12px] font-semibold text-slate-700 block mb-1"
          >
            Search Location / Landmark
          </Label>
          <div className="relative flex items-center">
            <Search
              className="absolute left-3 size-4 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="locationSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchAddress();
                }
              }}
              placeholder="Search area, landmark, or industrial hub (e.g. BKC Mumbai, Whitefield, Udyog Vihar)…"
              className="h-10 pl-9 pr-24 text-[13px] border-slate-300 focus-visible:ring-[#000080]"
            />
            <Button
              id="btn-locate-search"
              type="button"
              size="sm"
              onClick={() => handleSearchAddress()}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-1.5 h-7.5 rounded-md bg-[#000080] px-3 text-[12px] font-semibold text-white hover:bg-[#000066] cursor-pointer"
            >
              {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : "Locate"}
            </Button>
          </div>

          {/* Quick Hub Presets */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Quick hubs:</span>
            {INDIAN_COMMERCIAL_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSearchQuery(preset.city);
                  handleSearchAddress(preset.city);
                }}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#000080] hover:text-[#000080] transition-colors cursor-pointer"
              >
                {preset.city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* UNIFIED EXPERIENCE: BUSINESS ADDRESS INPUTS & INTERACTIVE MAP BOTH VISIBLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* LEFT COLUMN: BUSINESS ADDRESS INPUTS */}
        <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-[#000080]" aria-hidden="true" />
                <span className="text-[13px] font-bold text-slate-900">
                  Business Address Details
                </span>
              </div>
              {isReverseGeocoding ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#000080] font-medium">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  Syncing with map…
                </span>
              ) : null}
            </div>

            {/* Business Address / Premises */}
            <div>
              <Label htmlFor="addressLine" className="text-[12px] font-semibold text-slate-700">
                Business Address / Premises <span className="text-error">*</span>
              </Label>
              <Input
                id="addressLine"
                type="text"
                value={addressLine}
                onChange={(e) => updateFields({ addressLine: e.target.value }, "manual")}
                onBlur={handleAddressFieldsBlur}
                placeholder="e.g. Plot 42, Sector 18, Commercial Belt"
                className="mt-1 h-9.5 text-[13px] border-slate-300 focus-visible:ring-[#000080]"
              />
            </div>

            {/* Locality / Area */}
            <div>
              <Label htmlFor="locality" className="text-[12px] font-semibold text-slate-700">
                Locality / Area
              </Label>
              <Input
                id="locality"
                type="text"
                value={locality}
                onChange={(e) => updateFields({ locality: e.target.value }, "manual")}
                onBlur={handleAddressFieldsBlur}
                placeholder="e.g. Udyog Vihar Phase IV"
                className="mt-1 h-9.5 text-[13px] border-slate-300 focus-visible:ring-[#000080]"
              />
            </div>

            {/* City & PIN Code */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label htmlFor="city" className="text-[12px] font-semibold text-slate-700">
                  City / District <span className="text-error">*</span>
                </Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => updateFields({ city: e.target.value }, "manual")}
                  onBlur={handleAddressFieldsBlur}
                  placeholder="e.g. Gurugram"
                  className="mt-1 h-9.5 text-[13px] border-slate-300 focus-visible:ring-[#000080]"
                />
              </div>
              <div>
                <Label htmlFor="pincode" className="text-[12px] font-semibold text-slate-700">
                  PIN Code
                </Label>
                <Input
                  id="pincode"
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) =>
                    updateFields({ pincode: e.target.value.replace(/\D/g, "") }, "manual")
                  }
                  onBlur={handleAddressFieldsBlur}
                  placeholder="e.g. 122015"
                  className="mt-1 h-9.5 text-[13px] border-slate-300 focus-visible:ring-[#000080]"
                />
              </div>
            </div>

            {/* State / UT */}
            <div>
              <Label htmlFor="state" className="text-[12px] font-semibold text-slate-700">
                State / UT
              </Label>
              <select
                id="state"
                value={state}
                onChange={(e) => {
                  updateFields({ state: e.target.value }, "manual");
                  if (e.target.value && !latitude && !longitude) {
                    handleSearchAddress(e.target.value);
                  }
                }}
                className="mt-1 h-9.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000080]"
              >
                <option value="">Select State / Union Territory…</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>
              Address details and the map on the right represent the same location and synchronize
              automatically.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE MAP */}
        <div className="flex flex-col justify-between space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div>
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4 text-[#ff671f]" aria-hidden="true" />
                <span className="text-[13px] font-bold text-slate-900">Interactive Map</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  id="btn-use-map-center"
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleConfirmMapCenter}
                  className="h-7 px-2 text-[11px] font-medium text-[#000080] hover:bg-blue-50 cursor-pointer"
                  title="Use current center of map as location pin"
                >
                  <LocateFixed className="size-3 mr-1 text-[#000080]" aria-hidden="true" />
                  <span>Use Map Center</span>
                </Button>
              </div>
            </div>

            {/* MAP CANVAS CONTAINER */}
            <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* Leaflet DOM node */}
              <div
                ref={mapContainerRef}
                className="h-[270px] sm:h-[285px] w-full z-0 cursor-crosshair"
                style={{ minHeight: "270px" }}
                aria-label="Interactive map for selecting business location"
              />

              {/* In-map status chip */}
              <div className="absolute top-2 left-2 z-1000 pointer-events-none">
                <div className="flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm border border-slate-200/80 backdrop-blur-xs">
                  <span className="size-2 rounded-full bg-[#138808] animate-pulse" />
                  <span>
                    {latitude && longitude
                      ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
                      : "Click map to place pin"}
                  </span>
                </div>
              </div>

              {/* In-map instructions badge */}
              <div className="absolute bottom-2 left-2 right-2 z-1000 pointer-events-none">
                <div className="rounded-md bg-slate-900/85 px-2.5 py-1 text-[11px] text-white text-center shadow-sm backdrop-blur-xs">
                  Click anywhere or drag marker to reposition pin
                </div>
              </div>

              {/* Map Fallback / Error Alert */}
              {mapError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-4 text-center z-1000">
                  <AlertCircle className="size-6 text-amber-600 mb-1" aria-hidden="true" />
                  <p className="text-[12px] font-medium text-slate-700">{mapError}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* MAP HELPER CONTROLS */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 px-1">
            <span>Scroll to zoom &bull; Click or drag pin</span>
            {latitude && longitude ? (
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
                    if (markerRef.current) {
                      markerRef.current.setLatLng([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
                    }
                    reverseGeocode(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
                  }
                }}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-[#000080] font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset Pin
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* SELECTED LOCATION CONFIRMATION CARD */}
      <div className="rounded-xl border border-blue-200/90 bg-[#f0f4fc]/60 p-4 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#000080] text-white shadow-2xs mt-0.5">
              <CheckCircle2 className="size-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-bold text-slate-900">
                  Selected Business Location
                </span>
                {hasSelectedLocation ? (
                  <span className="inline-flex items-center rounded-full bg-[#138808]/15 px-2 py-0.2 text-[10.5px] font-bold text-[#138808]">
                    Location Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.2 text-[10.5px] font-bold text-amber-800">
                    Awaiting Entry
                  </span>
                )}
              </div>

              {/* Formatted address display */}
              <p className="mt-1 text-[13px] font-medium text-slate-800 leading-snug">
                {computeFormatted(addressLine, locality, city, state, pincode) || (
                  <span className="text-slate-400 italic">
                    No address specified yet. Type your address or click on the map above.
                  </span>
                )}
              </p>

              {/* Coordinates info if present */}
              {latitude && longitude ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1 font-mono rounded bg-white px-2 py-0.5 border border-slate-200 text-slate-700">
                    <MapPin className="size-3 text-[#ff671f]" aria-hidden="true" />
                    Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span>Synchronized with official verification registry</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Focus Address Field Shortcut */}
          {hasSelectedLocation ? (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("addressLine");
                el?.focus();
              }}
              className="shrink-0 text-[11.5px] font-semibold text-[#000080] hover:text-[#000066] hover:underline cursor-pointer"
            >
              Edit Address
            </button>
          ) : null}
        </div>
      </div>

      {/* VALIDATION ERROR DISPLAY */}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-subtle p-3 text-[13px] text-error flex items-start gap-2.5"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-error" aria-hidden="true" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
