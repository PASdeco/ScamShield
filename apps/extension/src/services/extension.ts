import type { ActiveScan, PageContext } from "@scamshield/shared";
import { activeScanSchema, extensionPageContextLimit, pageContextSchema } from "@scamshield/shared";

const ACTIVE_SCAN_KEY = "scamshield.activeScan";

function ensureHttpUrl(url?: string | undefined) {
  if (!url) {
    throw new Error("Open a website tab before running ScamShield.");
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("This page cannot be analyzed from the popup.");
  }
}

export async function getActiveHttpTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  ensureHttpUrl(tab.url);
  return { id: tab.id, url: tab.url as string };
}

export function sanitizeActiveUrlLocally(input: string) {
  const url = new URL(input);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname || "/";
  return url.pathname === "/" ? `${url.origin}/` : `${url.origin}${url.pathname}`;
}

export async function collectActivePageContext(tabId: number): Promise<PageContext> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (limits: typeof extensionPageContextLimit) => {
      const text = (document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limits.visibleTextExcerpt);
      const description = (
        document.querySelector('meta[name="description"]')?.getAttribute("content") || ""
      )
        .trim()
        .slice(0, limits.metaDescription);
      return {
        title: (document.title || "").trim().slice(0, limits.title),
        metaDescription: description,
        visibleTextExcerpt: text,
      };
    },
    args: [extensionPageContextLimit],
  });

  return pageContextSchema.parse(result?.result || { title: "", metaDescription: "", visibleTextExcerpt: "" });
}

export async function saveActiveScan(scan: ActiveScan) {
  await chrome.storage.local.set({ [ACTIVE_SCAN_KEY]: scan });
}

export async function loadActiveScan(): Promise<ActiveScan | null> {
  const result = await chrome.storage.local.get(ACTIVE_SCAN_KEY);
  const stored = result[ACTIVE_SCAN_KEY];
  if (!stored) return null;
  return activeScanSchema.parse(stored);
}

export async function clearActiveScan() {
  await chrome.storage.local.remove(ACTIVE_SCAN_KEY);
}

export function getRelayBaseUrl() {
  return import.meta.env.VITE_SCAMSHIELD_RELAY_URL?.trim() || "http://localhost:8787";
}
