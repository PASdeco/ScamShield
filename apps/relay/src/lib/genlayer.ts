import crypto from "node:crypto";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import {
  relayContentLimit,
  scanStatusResponseSchema,
  type PageContext,
  type ScanStatusResponse,
  submittedScanResponseSchema,
  verdictResultSchema,
} from "../shared.js";
import { getGenlayerClient, relayConfig, requireRelaySecrets } from "./config.js";

type TxHash = `0x${string}` & { length: 66 };

function bounded(value: string, limit: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeRiskFlags(raw: unknown): string[] {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => bounded(String(value), relayContentLimit.riskFlag))
      .filter(Boolean)
      .slice(0, relayContentLimit.riskFlagCount);
  } catch {
    return [];
  }
}

export function createScanKey() {
  return `scan_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

export async function submitScan(input: {
  sanitizedUrl: string;
  pageContext: PageContext;
  relayEvidence: { relayExcerpt: string; title: string; metaDescription: string } | null;
}) {
  requireRelaySecrets();
  const genlayerClient = getGenlayerClient();
  const scanKey = createScanKey();
  const hash = await genlayerClient.writeContract({
    address: relayConfig.genlayer.contractAddress as `0x${string}`,
    functionName: "analyze_site",
    args: [
      scanKey,
      input.sanitizedUrl,
      bounded(input.pageContext.title || input.relayEvidence?.title || "", relayContentLimit.title),
      bounded(
        input.pageContext.metaDescription || input.relayEvidence?.metaDescription || "",
        relayContentLimit.metaDescription,
      ),
      bounded(input.pageContext.visibleTextExcerpt, relayContentLimit.extensionExcerpt),
      bounded(input.relayEvidence?.relayExcerpt || "", relayContentLimit.relayExcerpt),
    ],
    value: 0n,
  });

  return submittedScanResponseSchema.parse({
    scanKey,
    txHash: hash,
    sanitizedUrl: input.sanitizedUrl,
    status: "submitted",
  });
}

async function tryReadStoredScan(scanKey: string, txHash: string, fallbackUrl: string) {
  const genlayerClient = getGenlayerClient();
  const verdictRaw = await genlayerClient.readContract({
    address: relayConfig.genlayer.contractAddress as `0x${string}`,
    functionName: "get_scan",
    args: [scanKey],
  });

  const parsed =
    typeof verdictRaw === "string"
      ? (JSON.parse(verdictRaw) as Record<string, unknown>)
      : (verdictRaw as Record<string, unknown>);

  const storedScanKey = String(parsed.scan_key ?? "").trim();
  const storedUrl = String(parsed.sanitized_url ?? "").trim();

  if (!storedScanKey || storedScanKey !== scanKey || !storedUrl) {
    return null;
  }

  return verdictResultSchema.parse({
    verdict: String(parsed.verdict ?? "SUSPICIOUS"),
    confidence: Number(parsed.confidence ?? 0),
    summary: bounded(String(parsed.summary ?? ""), relayContentLimit.summary),
    riskFlags: normalizeRiskFlags(parsed.risk_flags_json),
    sanitizedUrl: storedUrl || fallbackUrl,
    txHash,
    contractAddress: relayConfig.genlayer.contractAddress,
    explorerUrl: `${relayConfig.genlayer.explorerUrl}/tx/${txHash}`,
  });
}

export async function getScanStatus(scanKey: string, txHash: string, sanitizedUrl: string): Promise<ScanStatusResponse> {
  requireRelaySecrets();
  const directResult = await tryReadStoredScan(scanKey, txHash, sanitizedUrl).catch(() => null);
  if (directResult) {
    return scanStatusResponseSchema.parse({
      scanKey,
      txHash,
      sanitizedUrl: directResult.sanitizedUrl,
      status: "finalized",
      result: directResult,
    });
  }

  const genlayerClient = getGenlayerClient();
  const tx = await genlayerClient.getTransaction({ hash: txHash as TxHash });
  const statusName = String(tx.statusName ?? "").toUpperCase();
  const executionResult = String(tx.txExecutionResultName ?? "");

  if (statusName === TransactionStatus.FINALIZED || statusName === "FINALIZED") {
    if (executionResult === ExecutionResult.FINISHED_WITH_ERROR || executionResult === "FINISHED_WITH_ERROR") {
      return scanStatusResponseSchema.parse({
        scanKey,
        txHash,
        sanitizedUrl,
        status: "failed",
        error: "The GenLayer evaluation failed during finalization.",
      });
    }

    const result = await tryReadStoredScan(scanKey, txHash, sanitizedUrl);
    if (!result) {
      return scanStatusResponseSchema.parse({
        scanKey,
        txHash,
        sanitizedUrl,
        status: "accepted",
      });
    }

    return scanStatusResponseSchema.parse({
      scanKey,
      txHash,
      sanitizedUrl: result.sanitizedUrl,
      status: "finalized",
      result,
    });
  }

  if (statusName === TransactionStatus.ACCEPTED || statusName === "ACCEPTED") {
    if (executionResult === ExecutionResult.FINISHED_WITH_ERROR || executionResult === "FINISHED_WITH_ERROR") {
      return scanStatusResponseSchema.parse({
        scanKey,
        txHash,
        sanitizedUrl,
        status: "failed",
        error: "The GenLayer evaluation was accepted but execution returned an error.",
      });
    }

    return scanStatusResponseSchema.parse({
      scanKey,
      txHash,
      sanitizedUrl,
      status: "accepted",
    });
  }

  return scanStatusResponseSchema.parse({
    scanKey,
    txHash,
    sanitizedUrl,
    status: "pending",
  });
}
