# ScamShield

ScamShield is a browser extension that helps users assess whether a website looks safe, suspicious, or scam-like before they trust it. It collects a small context snapshot from the active page, sends it through a public relay, and records the final verdict through GenLayer consensus.

**GitHub repository description:** GenLayer-powered browser extension for scam detection, website risk checks, and consensus-backed safety verdicts.

## Live Testnet Deployment

- Public relay: `https://scamshield-relay.vercel.app`
- GenLayer contract: `0x0d0E704daB5Db76937631b4bA9ABCDddc02baDb7`
- Tester package: `release/tester-extension.zip`
- Unpacked tester folder: `release/tester-extension`

The current tester build is configured to use the public relay above, so testers do not need to run the backend locally.

## What ScamShield Does

- Analyzes the active website from the browser extension popup.
- Extracts limited page context such as title, meta description, and visible text excerpt.
- Submits the scan to a relay API that coordinates with GenLayer.
- Returns a verdict of `SAFE`, `SUSPICIOUS`, or `SCAM`.
- Shows confidence, a short summary, and key risk flags inside the extension popup.

## Tester Guide

### Option 1: Desktop Chrome, Brave, or Edge

Use this path if you are testing on a laptop or desktop Chromium browser.

1. Download `tester-extension.zip` from the project release or shared test package.
2. Unzip the file.
3. Open `chrome://extensions` in Chrome, Brave, or Edge.
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select the unzipped `tester-extension` folder.
7. Open any normal website tab, then click the ScamShield extension icon.
8. Click `Analyze current site` and wait for the GenLayer verdict.

### Option 2: Mises Browser on Mobile

Regular Chrome mobile does not support loading unpacked extensions. If testing on Android with Mises Browser, use its zip import flow.

1. Download `tester-extension.zip` onto the phone.
2. Open Mises Browser.
3. Go to `mises://extensions`.
4. Turn on `Developer mode` if it is not already enabled.
5. Tap `+ (from .zip/.crx/.user.js)`.
6. Select `tester-extension.zip`.
7. Open a website, then launch ScamShield from the extension menu.

Mobile extension support can vary by browser. If a scan fails on mobile, retest the same site on desktop Chrome to confirm whether the issue is browser compatibility or the scan itself.

## Expected Test Flow

1. Open a normal `http://` or `https://` website.
2. Open the ScamShield extension popup.
3. Confirm the current URL appears in the popup.
4. Click `Analyze current site`.
5. Wait while the scan is submitted and finalized through GenLayer consensus.
6. Review the verdict, confidence score, summary, and risk flags.
7. Click `Scan again` to clear the current result and test another page.

The extension does not analyze browser settings pages, local files, or internal pages such as `chrome://extensions`.

## Project Structure

```text
apps/extension        Browser extension popup and manifest
apps/relay            Relay API for scan submission and status polling
api                   Vercel serverless entrypoints
contracts/genlayer    GenLayer intelligent contract and deploy scripts
packages/shared       Shared schemas, types, and constants
release               Generated tester builds
scripts               Release automation
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Required relay values:

```bash
PORT=8787
SCAMSHIELD_PUBLIC_BASE_URL=http://localhost:8787
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
GENLAYER_PRIVATE_KEY=0xyour_private_key
GENLAYER_CONTRACT_ADDRESS=0xyour_contract_address
```

Optional rate limiting values:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Start the relay:

```bash
npm run dev:relay
```

Start the extension dev server:

```bash
npm run dev:extension
```

## Build and Release

Build all workspaces:

```bash
npm run build
```

Build a tester release against the public relay:

```powershell
$env:VITE_SCAMSHIELD_RELAY_URL="https://scamshield-relay.vercel.app"
npm run release:tester
```

This generates:

- `release/tester-extension`
- `release/tester-extension/INSTALL.txt`

To create a shareable zip:

```powershell
Compress-Archive -Path "release/tester-extension\*" -DestinationPath "release/tester-extension.zip" -Force
```

## Relay API

Health check:

```http
GET /api
```

Submit a scan:

```http
POST /api/scan
Content-Type: application/json
```

```json
{
  "url": "https://example.com",
  "pageContext": {
    "title": "Example Domain",
    "metaDescription": "",
    "visibleTextExcerpt": "Example Domain"
  }
}
```

Check scan status:

```http
GET /api/scan-status?scanKey=...&txHash=...&sanitizedUrl=...
```

## Deployment

The relay is deployed on Vercel through the root `api` entrypoints:

- `api/index.ts`
- `api/scan.ts`
- `api/scan-status.ts`

Production environment variables required on Vercel:

```bash
SCAMSHIELD_PUBLIC_BASE_URL=https://scamshield-relay.vercel.app
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
GENLAYER_PRIVATE_KEY=0xyour_private_key
GENLAYER_CONTRACT_ADDRESS=0xyour_contract_address
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Do not commit real private keys or production secrets.

## Contract Workflow

Lint the GenLayer contract:

```bash
npm run lint:contract
```

Deploy the GenLayer contract:

```bash
npm run deploy:contract
```

The current public tester release already points to the deployed contract listed in the Live Testnet Deployment section.

## Notes for Testers

- ScamShield is a testnet build and is not yet published on the Chrome Web Store.
- Results are generated through the configured relay and GenLayer contract.
- Scans may take a few seconds while consensus finalizes.
- Avoid submitting private pages, authenticated dashboards, or sensitive content during public testing.
- If the extension appears inactive, open a normal website tab and try again.
