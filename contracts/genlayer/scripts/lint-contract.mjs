import { readFile } from "node:fs/promises";
import path from "node:path";

import { genlayer_lint_contract } from "../../../scripts/genskill-lint-bridge.mjs";

async function main() {
  const contractPath = path.resolve(process.cwd(), "contracts", "scam_shield.py");
  const code = await readFile(contractPath, "utf8");
  const result = await genlayer_lint_contract(code);
  console.log(JSON.stringify(result, null, 2));
  if (!result?.data?.result?.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
