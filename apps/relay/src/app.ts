import { Hono } from "hono";
import { fetchRelayScanStatus, getRequestIp, relayHealth, submitRelayScan } from "./service.js";

export const app = new Hono();

app.get("/", (c) => c.json(relayHealth));
app.get("/api", (c) => c.json(relayHealth));

app.post("/api/scan", async (c) => {
  const result = await submitRelayScan({
    ip: getRequestIp(c.req.header("x-forwarded-for")),
    body: await c.req.json(),
  });

  return c.json(result.body, result.status);
});

app.get("/api/scan-status", async (c) => {
  const result = await fetchRelayScanStatus({
    ip: getRequestIp(c.req.header("x-forwarded-for")),
    scanKey: c.req.query("scanKey") || "",
    txHash: c.req.query("txHash") || "",
    sanitizedUrl: c.req.query("sanitizedUrl") || "",
  });

  return c.json(result.body, result.status);
});
