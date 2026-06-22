import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

dotenvConfig({ path: resolve(process.cwd(), "../../.env") });
dotenvConfig();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function optionalEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

function numberEnv(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const relayConfig = {
  port: numberEnv("PORT", 8787),
  genlayer: {
    rpcUrl: optionalEnv("GENLAYER_RPC_URL") || "https://studio.genlayer.com/api",
    explorerUrl: optionalEnv("GENLAYER_EXPLORER_URL") || "https://explorer-studio.genlayer.com",
    privateKey: optionalEnv("GENLAYER_PRIVATE_KEY"),
    contractAddress: optionalEnv("GENLAYER_CONTRACT_ADDRESS"),
  },
  relay: {
    publicBaseUrl: optionalEnv("SCAMSHIELD_PUBLIC_BASE_URL") || "http://localhost:8787",
  },
  upstash: {
    redisUrl: optionalEnv("UPSTASH_REDIS_REST_URL"),
    redisToken: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),
  },
};

export function requireRelaySecrets() {
  if (!relayConfig.genlayer.privateKey) {
    throw new Error("GENLAYER_PRIVATE_KEY is required.");
  }
  if (!relayConfig.genlayer.contractAddress) {
    throw new Error("GENLAYER_CONTRACT_ADDRESS is required.");
  }
}

export function getGenlayerClient() {
  requireRelaySecrets();
  return createClient({
    chain: studionet,
    endpoint: relayConfig.genlayer.rpcUrl,
    account: createAccount(relayConfig.genlayer.privateKey as `0x${string}`),
  });
}
