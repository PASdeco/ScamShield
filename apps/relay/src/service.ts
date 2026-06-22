import { scanRequestSchema } from "./shared.js";
import { assertRateLimit, clearInflight, getInflight, setInflight } from "./lib/ratelimit.js";
import { fetchPageEvidence } from "./lib/pageFetch.js";
import { getScanStatus, submitScan } from "./lib/genlayer.js";
import { sanitizeUrl } from "./lib/url.js";

export const relayHealth = {
  service: "ScamShield relay",
  status: "ok",
} as const;

type RelayResponse = {
  status: 200 | 202 | 400 | 500;
  body: unknown;
};

export function getRequestIp(forwardedFor?: string | null) {
  return forwardedFor?.split(",")[0]?.trim() || "local";
}

export async function submitRelayScan(input: { ip: string; body: unknown }): Promise<RelayResponse> {
  try {
    const body = scanRequestSchema.parse(input.body);
    await assertRateLimit(input.ip);
    const sanitizedUrl = sanitizeUrl(body.url);

    const inflight = await getInflight(input.ip, sanitizedUrl);
    if (inflight) {
      return {
        status: 202,
        body: {
          scanKey: inflight.scanKey,
          txHash: inflight.txHash,
          sanitizedUrl,
          status: "submitted",
        },
      };
    }

    const relayEvidence = await fetchPageEvidence(sanitizedUrl);
    const submitted = await submitScan({
      sanitizedUrl,
      pageContext: body.pageContext,
      relayEvidence,
    });

    await setInflight(input.ip, sanitizedUrl, { scanKey: submitted.scanKey, txHash: submitted.txHash });

    return {
      status: 202,
      body: submitted,
    };
  } catch (error) {
    return {
      status: 400,
      body: {
        error: error instanceof Error ? error.message : "Unable to submit scan.",
      },
    };
  }
}

export async function fetchRelayScanStatus(input: {
  ip: string;
  scanKey: string;
  txHash: string;
  sanitizedUrl: string;
}): Promise<RelayResponse> {
  if (!input.scanKey || !input.txHash || !input.sanitizedUrl) {
    return {
      status: 400,
      body: { error: "scanKey, txHash, and sanitizedUrl are required." },
    };
  }

  try {
    const status = await getScanStatus(input.scanKey, input.txHash, input.sanitizedUrl);
    if (status.status === "finalized" || status.status === "failed") {
      await clearInflight(input.ip, input.sanitizedUrl);
    }

    return {
      status: 200,
      body: status,
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : "Unable to fetch scan status.",
      },
    };
  }
}
