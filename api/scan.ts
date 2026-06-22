import { getRequestIp, submitRelayScan } from "../apps/relay/src/service.js";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await submitRelayScan({
    ip: getRequestIp(request.headers.get("x-forwarded-for")),
    body,
  });

  return Response.json(result.body, { status: result.status });
}
