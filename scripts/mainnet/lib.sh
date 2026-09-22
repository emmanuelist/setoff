# Shared helpers for the mainnet drills. Source it; never run it.
# Keys come from the environment (load ./.env with `set -a; . ./.env; set +a`) and are never
# printed: every call passes them through as arguments and prints only receipts.
set -euo pipefail

CAST="${CAST:-$HOME/.local/bin/arc-cast}"
: "${RPC:?set RPC (a fork URL to rehearse, the mainnet RPC to run)}"
: "${SETOFF:?set SETOFF to the Setoff address}"

# send KEY SIG ARGS... [--value WEI] — prints "label tx block gas", fails on a revert.
send() {
  local label=$1 key=$2; shift 2
  local out
  out=$("$CAST" send "$SETOFF" "$@" --private-key "$key" --rpc-url "$RPC" --json)
  python3 - "$label" <<PY
import json, sys
r = json.loads('''$out''')
if r["status"] != "0x1": sys.exit(f"{sys.argv[1]}: reverted in {r['transactionHash']}")
print(f"{sys.argv[1]:<34} {r['transactionHash']}  block {int(r['blockNumber'], 16):,}  gas {int(r['gasUsed'], 16):,}")
PY
}

call() { "$CAST" call "$SETOFF" "$@" --rpc-url "$RPC"; }
debt_count() { call "debtCount()(uint256)" | awk '{print $1}'; }
ref() { "$CAST" --format-bytes32-string "$1"; }

MXN=0x4d584e; BRL=0x42524c; EUR=0x455552; JPY=0x4a5059; USD=0x555344
