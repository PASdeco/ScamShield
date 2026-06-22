import { z } from "zod";

export const verdictValues = ["SAFE", "SUSPICIOUS", "SCAM"] as const;
export const verdictSchema = z.enum(verdictValues);
export type Verdict = z.infer<typeof verdictSchema>;

export const txStatusValues = ["submitted", "pending", "accepted", "finalized", "failed"] as const;
export const scanTxStatusSchema = z.enum(txStatusValues);
export type ScanTxStatus = z.infer<typeof scanTxStatusSchema>;

export const pageContextSchema = z.object({
  title: z.string().trim().max(160).default(""),
  metaDescription: z.string().trim().max(320).default(""),
  visibleTextExcerpt: z.string().trim().max(3000).default(""),
});
export type PageContext = z.infer<typeof pageContextSchema>;

export const scanRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  pageContext: pageContextSchema,
});
export type ScanRequest = z.infer<typeof scanRequestSchema>;

export const riskFlagsSchema = z.array(z.string().trim().min(1).max(120)).max(8);

export const verdictResultSchema = z.object({
  verdict: verdictSchema,
  confidence: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(280),
  riskFlags: riskFlagsSchema,
  sanitizedUrl: z.string().trim().min(1).max(1024),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]+$/),
  contractAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
  explorerUrl: z.string().trim().url(),
});
export type VerdictResult = z.infer<typeof verdictResultSchema>;

export const submittedScanResponseSchema = z.object({
  scanKey: z.string().trim().min(1).max(96),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]+$/),
  sanitizedUrl: z.string().trim().min(1).max(1024),
  status: z.literal("submitted"),
});
export type SubmittedScanResponse = z.infer<typeof submittedScanResponseSchema>;

export const scanStatusResponseSchema = z.object({
  scanKey: z.string().trim().min(1).max(96),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]+$/),
  status: scanTxStatusSchema,
  sanitizedUrl: z.string().trim().min(1).max(1024),
  result: verdictResultSchema.optional(),
  error: z.string().trim().max(240).optional(),
});
export type ScanStatusResponse = z.infer<typeof scanStatusResponseSchema>;

export const activeScanSchema = z.object({
  scanKey: z.string().trim().min(1).max(96),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]+$/),
  originalUrl: z.string().trim().min(1).max(2048),
  sanitizedUrl: z.string().trim().min(1).max(1024),
  submittedAt: z.string().datetime(),
});
export type ActiveScan = z.infer<typeof activeScanSchema>;

export const extensionPageContextLimit = {
  title: 160,
  metaDescription: 320,
  visibleTextExcerpt: 3000,
} as const;

export const relayContentLimit = {
  htmlBytes: 1_000_000,
  relayExcerpt: 4000,
  extensionExcerpt: 3000,
  title: 160,
  metaDescription: 320,
  summary: 280,
  rationale: 700,
  riskFlag: 120,
  riskFlagCount: 8,
} as const;

export const rateLimitWindowMs = 10 * 60 * 1000;
export const rateLimitMaxScans = 10;

export function confidenceBand(confidence: number): "low" | "medium" | "high" {
  if (confidence <= 39) return "low";
  if (confidence <= 69) return "medium";
  return "high";
}
