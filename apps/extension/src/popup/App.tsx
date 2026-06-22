import { useEffect, useState } from "react";
import type { ActiveScan, PageContext, ScanStatusResponse, VerdictResult } from "@scamshield/shared";
import {
  activeScanSchema,
  submittedScanResponseSchema,
} from "@scamshield/shared";
import {
  clearActiveScan,
  collectActivePageContext,
  getActiveHttpTab,
  getRelayBaseUrl,
  loadActiveScan,
  saveActiveScan,
} from "../services/extension";

type ViewState =
  | { kind: "idle" }
  | { kind: "analyzing"; message: string }
  | { kind: "result"; result: VerdictResult }
  | { kind: "error"; message: string };

async function pollStatus(activeScan: ActiveScan): Promise<ScanStatusResponse> {
  const url = new URL("/api/scan-status", getRelayBaseUrl());
  url.searchParams.set("scanKey", activeScan.scanKey);
  url.searchParams.set("txHash", activeScan.txHash);
  url.searchParams.set("sanitizedUrl", activeScan.sanitizedUrl);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Unable to retrieve the latest verdict.");
  }
  return (await response.json()) as ScanStatusResponse;
}

async function submitScan(url: string, pageContext: PageContext) {
  const response = await fetch(new URL("/api/scan", getRelayBaseUrl()).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url,
      pageContext,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Unable to start analysis.");
  }
  return submittedScanResponseSchema.parse(json);
}

function verdictTone(verdict: VerdictResult["verdict"]) {
  if (verdict === "SAFE") return "safe";
  if (verdict === "SCAM") return "danger";
  return "warn";
}

export function App() {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [currentUrl, setCurrentUrl] = useState("");
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      const stored = await loadActiveScan();

      try {
        if (stored) {
          if (!cancelled) {
            setCurrentUrl(stored.originalUrl);
            setActiveScan(stored);
          }

          setState({ kind: "analyzing", message: "Resuming the current scan..." });
          const status = await pollStatus(stored);
          if (status.status === "finalized" && status.result) {
            if (!cancelled) setState({ kind: "result", result: status.result });
            return;
          }
          if (status.status === "failed") {
            await clearActiveScan();
            if (!cancelled) setState({ kind: "error", message: status.error || "The scan failed." });
            return;
          }
          if (!cancelled) {
            setState({ kind: "analyzing", message: "The verdict is still moving through consensus..." });
          }
          return;
        }

        const activeTab = await getActiveHttpTab();
        if (!cancelled) {
          setCurrentUrl(activeTab.url);
        }
      } catch {
        if (!cancelled) {
          setState({ kind: "idle" });
        }
      }
    }

    void resume();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.kind !== "analyzing" || !activeScan) return;
    const scan = activeScan;

    let active = true;
    let timer: number | undefined;

    async function tick() {
      if (!active) return;

      try {
        const status = await pollStatus(scan);
        if (!active) return;
        if (status.status === "finalized" && status.result) {
          setState({ kind: "result", result: status.result });
          return;
        }
        if (status.status === "failed") {
          await clearActiveScan();
          setActiveScan(null);
          if (active) setState({ kind: "error", message: status.error || "The scan failed." });
          return;
        }
        timer = window.setTimeout(() => void tick(), 3000);
      } catch (error) {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Unable to continue the scan.",
        });
      }
    }

    timer = window.setTimeout(() => void tick(), 2000);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [state.kind, activeScan]);

  async function onAnalyze() {
    try {
      const tab = await getActiveHttpTab();
      setCurrentUrl(tab.url);
      const pageContext = await collectActivePageContext(tab.id);
      setState({ kind: "analyzing", message: "Submitting the page for GenLayer consensus..." });
      const submitted = await submitScan(tab.url, pageContext);

      const nextScan = activeScanSchema.parse({
        scanKey: submitted.scanKey,
        txHash: submitted.txHash,
        originalUrl: tab.url,
        sanitizedUrl: submitted.sanitizedUrl,
        submittedAt: new Date().toISOString(),
      });

      await saveActiveScan(nextScan);
      setActiveScan(nextScan);
      setState({ kind: "analyzing", message: "Waiting for GenLayer consensus..." });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to analyze this page.",
      });
    }
  }

  async function onReset() {
    await clearActiveScan();
    setActiveScan(null);
    setState({ kind: "idle" });
  }

  return (
    <main className="shell">
      <section className="card">
        <div className="eyebrow">ScamShield</div>
        <h1>Be connected. Be safe</h1>
        <p className="tagline">Consensus website check</p>
        <p className="lede">{currentUrl || "Open a website tab to begin."}</p>

        {state.kind === "idle" && (
          <button className="primary" onClick={() => void onAnalyze()}>
            Analyze current site
          </button>
        )}

        {state.kind === "analyzing" && (
          <div className="status">
            <div className="pulse" />
            <p>{state.message}</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="panel error">
            <p>{state.message}</p>
            <button className="ghost" onClick={() => void onReset()}>
              Start over
            </button>
          </div>
        )}

        {state.kind === "result" && (
          <div className={`panel ${verdictTone(state.result.verdict)}`}>
            <div className="verdictRow">
              <span className="badge">{state.result.verdict}</span>
              <span className="confidence">{state.result.confidence}% confidence</span>
            </div>
            <p className="summary">{state.result.summary}</p>
            <div className="flags">
              {state.result.riskFlags.slice(0, 3).map((flag) => (
                <span key={flag} className="flag">
                  {flag}
                </span>
              ))}
            </div>
            <button className="ghost" onClick={() => void onReset()}>
              Scan again
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
