import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

function getPrivateKey() {
  const value = process.env.GENLAYER_PRIVATE_KEY?.trim();
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("GENLAYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.");
  }
  return value;
}

function getRpcUrl() {
  return process.env.GENLAYER_RPC_URL?.trim() || "https://studio.genlayer.com/api";
}

async function main() {
  const client = createClient({
    chain: studionet,
    endpoint: getRpcUrl(),
    account: createAccount(getPrivateKey()),
  });

  const contractPath = path.resolve(process.cwd(), "contracts", "scam_shield.py");
  const code = new Uint8Array(await readFile(contractPath));

  const hash = await client.deployContract({ code, args: [] });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 200,
    interval: 3000,
  });

  const contractAddress = receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress;

  console.log(
    JSON.stringify(
      {
        network: "studionet",
        rpcUrl: getRpcUrl(),
        deployHash: hash,
        contractAddress,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
