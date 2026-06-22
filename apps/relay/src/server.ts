import { serve } from "@hono/node-server";
import { app } from "./app";
import { relayConfig } from "./lib/config";

serve(
  {
    fetch: app.fetch,
    port: relayConfig.port,
  },
  (info) => {
    console.log(`ScamShield relay listening on http://localhost:${info.port}`);
  },
);
