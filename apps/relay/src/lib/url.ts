import { URL } from "node:url";
import { isIP } from "node:net";

const privateIpv4Ranges: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  if (lower === "::1") return true;

  const ipVersion = isIP(lower);
  if (ipVersion === 4) {
    return privateIpv4Ranges.some((pattern) => pattern.test(lower));
  }
  if (ipVersion === 6) {
    return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower === "::1";
  }
  return false;
}

export function sanitizeUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Provide a valid website URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Authenticated URLs are not supported.");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Private or local network targets are not allowed.");
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname || "/";
  return parsed.toString();
}
