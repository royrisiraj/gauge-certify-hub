// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "smart-route-dev-api",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url ? req.url.split("?")[0] : "";
            if (url === "/api/gis/smart-route" && req.method === "POST") {
              try {
                const { handleSmartRouteRequest } = await import("./src/server/handleSmartRouteApi");

                const protocol = req.headers["x-forwarded-proto"] || "http";
                const host = req.headers.host || "localhost:8080";
                const fullUrl = `${protocol}://${host}${req.url}`;

                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                const bodyBuffer = Buffer.concat(chunks);

                const headers = new Headers();
                for (const [k, v] of Object.entries(req.headers)) {
                  if (Array.isArray(v)) {
                    v.forEach((val) => headers.append(k, val));
                  } else if (v != null) {
                    headers.set(k, v);
                  }
                }

                const webRequest = new Request(fullUrl, {
                  method: req.method,
                  headers,
                  body: bodyBuffer.length > 0 ? bodyBuffer : undefined,
                });

                const webResponse = await handleSmartRouteRequest(webRequest);

                res.statusCode = webResponse.status;
                webResponse.headers.forEach((val, key) => {
                  res.setHeader(key, val);
                });

                const responseBody = await webResponse.text();
                res.end(responseBody);
              } catch (err) {
                console.error("[smart-route-dev-api] Error:", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Internal Server Error in Smart Route dev API" }));
              }
            } else {
              next();
            }
          });
        },
      },
    ],
  },
});
