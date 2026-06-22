import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dirname, "..");
const extensionDir = resolve(rootDir, "apps", "extension");
const distDir = resolve(extensionDir, "dist");
const releaseDir = resolve(rootDir, "release", "tester-extension");
const relayUrl = (process.env.VITE_SCAMSHIELD_RELAY_URL || "").trim();

function clearDirectoryContents(directory) {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    const entryPath = resolve(directory, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      rmSync(entryPath, { recursive: true, force: true });
    } else {
      unlinkSync(entryPath);
    }
  }
}

if (!relayUrl) {
  console.error("VITE_SCAMSHIELD_RELAY_URL is required for tester release builds.");
  console.error("Example:");
  console.error('$env:VITE_SCAMSHIELD_RELAY_URL="https://your-relay-url"; npm run release:tester');
  process.exit(1);
}

const build = spawnSync("npm", ["--workspace", "@scamshield/extension", "run", "build"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    VITE_SCAMSHIELD_RELAY_URL: relayUrl,
  },
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(distDir)) {
  console.error("Extension dist folder was not created.");
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
clearDirectoryContents(releaseDir);
cpSync(distDir, releaseDir, { recursive: true });

writeFileSync(
  resolve(releaseDir, "INSTALL.txt"),
  [
    "ScamShield Testnet Tester Build",
    "",
    "1. Open chrome://extensions",
    "2. Turn on Developer mode",
    "3. Click Load unpacked",
    "4. Select this folder",
    "",
    `Relay URL: ${relayUrl}`,
    "",
    "This is a manual testnet build and is not published through the Chrome Web Store.",
  ].join("\n"),
  "utf8",
);

console.log("");
console.log(`Tester release ready at: ${releaseDir}`);
