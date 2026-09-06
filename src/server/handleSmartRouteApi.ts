import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateSmartRoute } from "./smartRoute";

export interface SmartRouteApiBody {
  officer_id?: string;
  latitude: number;
  longitude: number;
}

/**
 * Handles POST /api/gis/smart-route
 * Securely validates the authenticated session, checks officer role,
 * derives authority, and computes the smart route.
 */
export async function handleSmartRouteRequest(request: Request): Promise<Response> {
  try {
    // 1. Check method
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Extract Authorization header
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Bearer token in Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Empty bearer token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Verify authenticated user with Supabase
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
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Verify inspector role from user_roles
    const { data: roles, error: rolesError } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: `Authorization check failed: ${rolesError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userRoles = (roles ?? []).map((r) => r.role);
    const isOfficer = userRoles.includes("inspector") || userRoles.includes("admin");

    if (!isOfficer) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only verified LMO Officers may access Smart Route" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Derive authority from profiles (Do not trust client-sent authority or officer_id)
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("authority_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: `Profile lookup failed: ${profileError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Parse and validate request body
    let body: SmartRouteApiBody;
    try {
      body = (await request.json()) as SmartRouteApiBody;
    } catch {
      return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { latitude, longitude } = body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return new Response(
        JSON.stringify({
          error: "Bad Request: Valid numeric latitude (-90 to 90) and longitude (-180 to 180) are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Compute Smart Route
    const result = await generateSmartRoute({
      officerId: user.id, // Authenticated identity
      officerLat: latitude,
      officerLng: longitude,
      authorityId: profile?.authority_id ?? null,
      accessToken: token,
    });

    // 8. Return response matching contract
    return new Response(
      JSON.stringify({
        routes: result.routes,
        officer_location: result.officerLocation,
        total_found: result.totalFound,
        selected_count: result.selectedCount,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[handleSmartRouteRequest] Internal Error:", err);
    return new Response(
      JSON.stringify({
        error: `Internal Server Error: ${message}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
