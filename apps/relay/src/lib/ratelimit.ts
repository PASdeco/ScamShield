import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimitMaxScans, rateLimitWindowMs } from "../shared.js";
import { relayConfig } from "./config.js";

type InflightRecord = {
  scanKey: string;
  txHash: string;
};

const memoryCounters = new Map<string, { count: number; resetAt: number }>();
const inflightMemory = new Map<string, InflightRecord>();

const redis =
  relayConfig.upstash.redisUrl && relayConfig.upstash.redisToken
    ? new Redis({
        url: relayConfig.upstash.redisUrl,
        token: relayConfig.upstash.redisToken,
      })
    : null;

const ratelimit =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(rateLimitMaxScans, `${Math.floor(rateLimitWindowMs / 1000)} s`),
    analytics: false,
  });

export async function assertRateLimit(ip: string) {
  if (ratelimit) {
    const result = await ratelimit.limit(`scan:${ip}`);
    if (!result.success) {
      throw new Error("Too many scans right now. Please wait a little and try again.");
    }
    return;
  }

  const now = Date.now();
  const current = memoryCounters.get(ip);
  if (!current || current.resetAt <= now) {
    memoryCounters.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return;
  }
  if (current.count >= rateLimitMaxScans) {
    throw new Error("Too many scans right now. Please wait a little and try again.");
  }
  current.count += 1;
}

function inflightKey(ip: string, sanitizedUrl: string) {
  return `${ip}:${sanitizedUrl}`;
}

export async function getInflight(ip: string, sanitizedUrl: string): Promise<InflightRecord | null> {
  const key = inflightKey(ip, sanitizedUrl);
  if (redis) {
    const value = await redis.get<InflightRecord>(`inflight:${key}`);
    return value || null;
  }
  return inflightMemory.get(key) || null;
}

export async function setInflight(ip: string, sanitizedUrl: string, record: InflightRecord) {
  const key = inflightKey(ip, sanitizedUrl);
  if (redis) {
    await redis.set(`inflight:${key}`, record, { ex: 600 });
    return;
  }
  inflightMemory.set(key, record);
}

export async function clearInflight(ip: string, sanitizedUrl: string) {
  const key = inflightKey(ip, sanitizedUrl);
  if (redis) {
    await redis.del(`inflight:${key}`);
    return;
  }
  inflightMemory.delete(key);
}
