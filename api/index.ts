import { relayHealth } from "../apps/relay/src/service.js";

export function GET() {
  return Response.json(relayHealth);
}
