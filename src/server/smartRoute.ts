import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface RouteSite {
  sequence: number;
  requestId: string;
  businessId: string;
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  daysPending: number;
  priority: "High" | "Medium" | "Low";
  priorityScore: number;
  scoreBreakdown: {
    priorityPoints: number;
    pendencyPoints: number;
    proximityPoints: number;
  };
}

export interface SmartRouteResponse {
  routes: RouteSite[];
  officerLocation?: {
    latitude: number;
    longitude: number;
  };
  totalFound?: number;
  selectedCount?: number;
}

/**
 * Calculates great-circle distance between two points in kilometers using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes the priority score based on prompt specifications:
 * - Priority: High 50, Medium 30, Low 10
 * - Pendency: >=10 days 30, 5-9 days 20, <5 days 10
 * - Proximity: <2 km 20, 2-5 km 10
 */
export function calculateScores(
  priority: "High" | "Medium" | "Low",
  daysPending: number,
  distanceKm: number
): {
  priorityPoints: number;
  pendencyPoints: number;
  proximityPoints: number;
  totalScore: number;
} {
  // 1. Priority Score
  let priorityPoints = 30;
  if (priority === "High") priorityPoints = 50;
  else if (priority === "Low") priorityPoints = 10;

  // 2. Pendency Score
  let pendencyPoints = 10;
  if (daysPending >= 10) {
    pendencyPoints = 30;
  } else if (daysPending >= 5) {
    pendencyPoints = 20;
  }

  // 3. Proximity Score (Sites are pre-filtered <= 5km)
  let proximityPoints = 10;
  if (distanceKm < 2.0) {
    proximityPoints = 20;
  }

  return {
    priorityPoints,
    pendencyPoints,
    proximityPoints,
    totalScore: priorityPoints + pendencyPoints + proximityPoints,
  };
}

/**
 * Applies nearest-neighbor routing:
 * - Starts at the officer location
 * - Selects the nearest unvisited selected site
 * - Continues until all selected sites are ordered sequentially
 */
export function applyNearestNeighborRouting(
  officerLat: number,
  officerLng: number,
  selectedSites: Array<Omit<RouteSite, "sequence">>
): RouteSite[] {
  if (selectedSites.length === 0) return [];

  const unvisited = [...selectedSites];
  const ordered: RouteSite[] = [];
  let currentLat = officerLat;
  let currentLng = officerLng;
  let seq = 1;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const site = unvisited[i];
      if (!site) continue;
      const d = haversineDistance(currentLat, currentLng, site.latitude, site.longitude);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = i;
      }
    }

    const nextSite = unvisited.splice(nearestIndex, 1)[0];
    if (nextSite) {
      ordered.push({
        ...nextSite,
        sequence: seq++,
      });
      currentLat = nextSite.latitude;
      currentLng = nextSite.longitude;
    }
  }

  return ordered;
}

/**
 * Generates an optimized Smart GIS route for an authenticated LMO officer.
 */
export async function generateSmartRoute({
  officerId,
  officerLat,
  officerLng,
  authorityId,
  accessToken,
}: {
  officerId: string;
  officerLat: number;
  officerLng: number;
  authorityId?: string | null;
  accessToken: string;
}): Promise<SmartRouteResponse> {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://rvwuwklxdidhpstscehv.supabase.co";
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_HNXRu98-fDPjeS4WaCehbA_TLEoZAqG";

  const client = createClient<Database>(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Query pending verification requests belonging to this authority
  let query = client
    .from("verification_requests")
    .select(
      `
      id,
      status,
      request_type,
      submitted_at,
      priority,
      authority_id,
      assigned_to,
      business_id,
      businesses (
        id,
        name,
        address_line,
        locality,
        city,
        pincode,
        latitude,
        longitude
      ),
      instruments (
        id,
        category,
        location_label,
        latitude,
        longitude
      )
    `
    )
    .in("status", ["submitted", "assigned", "under_review"]);

  // Scope to authority/jurisdiction
  if (authorityId) {
    query = query.or(`authority_id.is.null,authority_id.eq.${authorityId}`);
  }

  const { data: requests, error } = await query;
  if (error) {
    console.error("[smartRoute] Error querying requests:", error);
    throw new Error(`Failed to query verification requests: ${error.message}`);
  }

  const now = Date.now();
  type RawRequest = {
    id: string;
    status: string;
    request_type: string;
    submitted_at: string;
    priority?: string | null;
    business_id: string;
    businesses: {
      id: string;
      name: string;
      address_line: string | null;
      locality: string | null;
      city: string | null;
      pincode: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
    instruments: {
      id: string;
      category: string;
      location_label: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
  };

  const rawList = (requests ?? []) as unknown as RawRequest[];

  // Candidate evaluation within 5km
  const candidates: Array<Omit<RouteSite, "sequence">> = [];

  for (const req of rawList) {
    const bus = req.businesses;
    const inst = req.instruments;
    if (!bus) continue;

    // Use instrument location coordinates if available, otherwise business location coordinates
    const siteLat = inst?.latitude ?? bus.latitude;
    const siteLng = inst?.longitude ?? bus.longitude;

    if (siteLat == null || siteLng == null) continue;

    // Calculate distance
    const distKm = haversineDistance(officerLat, officerLng, siteLat, siteLng);

    // Filter to sites within 5 km of officer coordinates
    if (distKm > 5.0) continue;

    // Days pending
    const submittedTime = req.submitted_at ? new Date(req.submitted_at).getTime() : now;
    const daysPending = Math.max(
      0,
      Math.floor((now - submittedTime) / (1000 * 60 * 60 * 24))
    );

    // Priority
    const priorityVal = (
      req.priority === "High" || req.priority === "Low" ? req.priority : "Medium"
    ) as "High" | "Medium" | "Low";

    // Scoring
    const score = calculateScores(priorityVal, daysPending, distKm);

    const formattedAddress = [
      bus.address_line,
      bus.locality,
      bus.city,
      bus.pincode ? `PIN: ${bus.pincode}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    candidates.push({
      requestId: req.id,
      businessId: bus.id,
      businessName: bus.name || "Commercial Establishment",
      category: inst?.category || "Commercial Instrument",
      address: formattedAddress || bus.city || "Premises Address",
      latitude: Number(siteLat),
      longitude: Number(siteLng),
      distanceKm: Math.round(distKm * 100) / 100,
      daysPending,
      priority: priorityVal,
      priorityScore: score.totalScore,
      scoreBreakdown: {
        priorityPoints: score.priorityPoints,
        pendencyPoints: score.pendencyPoints,
        proximityPoints: score.proximityPoints,
      },
    });
  }

  // Deduplicate or group by business site to avoid duplicate stops at identical premises
  // Keep the highest scoring request for each unique business
  const businessSiteMap = new Map<string, Omit<RouteSite, "sequence">>();
  for (const candidate of candidates) {
    const existing = businessSiteMap.get(candidate.businessId);
    if (!existing || candidate.priorityScore > existing.priorityScore) {
      businessSiteMap.set(candidate.businessId, candidate);
    }
  }

  const distinctCandidates = Array.from(businessSiteMap.values());

  // Sort by highest combined score, tie-break by shortest distance
  distinctCandidates.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.distanceKm - b.distanceKm;
  });

  // Select maximum 6 sites
  const topSites = distinctCandidates.slice(0, 6);

  // Apply nearest-neighbor routing
  const orderedRoutes = applyNearestNeighborRouting(officerLat, officerLng, topSites);

  return {
    routes: orderedRoutes,
    officerLocation: {
      latitude: officerLat,
      longitude: officerLng,
    },
    totalFound: distinctCandidates.length,
    selectedCount: orderedRoutes.length,
  };
}
