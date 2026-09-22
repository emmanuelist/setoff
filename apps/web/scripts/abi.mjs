// Regenerates lib/setoff-abi.ts from the compiled contract, so the app's types are the contract's.
import { readFileSync, writeFileSync } from "node:fs";

const { abi } = JSON.parse(readFileSync(new URL("../../../packages/contracts/out/Setoff.sol/Setoff.json", import.meta.url)));
const header = "// Generated from packages/contracts/out/Setoff.sol/Setoff.json — run `npm run abi` after changing the contract.\n";
writeFileSync(new URL("../lib/setoff-abi.ts", import.meta.url), `${header}export const setoffAbi = ${JSON.stringify(abi, null, 2)} as const;\n`);
console.log(`setoff-abi.ts: ${abi.length} items`);
