import { fetchRelayScanStatus, getRequestIp } from "../apps/relay/src/service.js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await fetchRelayScanStatus({
    ip: getRequestIp(request.headers.get("x-forwarded-for")),
    scanKey: url.searchParams.get("scanKey") || "",
    txHash: url.searchParams.get("txHash") || "",
    sanitizedUrl: url.searchParams.get("sanitizedUrl") || "",
  });

  return Response.json(result.body, { status: result.status });
}
