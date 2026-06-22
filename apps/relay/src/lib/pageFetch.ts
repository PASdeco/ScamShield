import * as cheerio from "cheerio";
import { relayContentLimit } from "../shared.js";

function truncate(text: string, limit: number): string {
  return text.trim().replace(/\s+/g, " ").slice(0, limit);
}

export type RelayFetchResult = {
  relayExcerpt: string;
  title: string;
  metaDescription: string;
};

export async function fetchPageEvidence(url: string): Promise<RelayFetchResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ScamShieldRelay/0.1",
        accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    const html = truncate(await response.text(), relayContentLimit.htmlBytes);
    const $ = cheerio.load(html);
    const title = truncate($("title").text(), relayContentLimit.title);
    const metaDescription = truncate(
      $('meta[name="description"]').attr("content") || "",
      relayContentLimit.metaDescription,
    );
    const bodyText = truncate($("body").text() || $.text(), relayContentLimit.relayExcerpt);

    return {
      relayExcerpt: bodyText,
      title,
      metaDescription,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
