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

# wait_until TIMESTAMP — block until chain time has passed a timestamp. On a fork set FORK=1
# and it jumps instead of waiting; on mainnet it polls, because only real time will do.
wait_until() {
  local target=$1 now gap
  while :; do
    now=$("$CAST" block latest --field timestamp --rpc-url "$RPC")
    gap=$((target - now))
    (( gap <= 0 )) && break
    if [[ ${FORK:-0} == 1 ]]; then
      "$CAST" rpc evm_increaseTime $((gap + 2)) --rpc-url "$RPC" >/dev/null
      "$CAST" rpc evm_mine --rpc-url "$RPC" >/dev/null
    else
      printf '  %ds to go…\n' "$gap"
      sleep $(( gap > 30 ? 30 : gap ))
    fi
  done
}

# net_owed CYCLE PARTY — what the party must send to fund, in wei; 0 if it is not a net debtor.
net_owed() {
  local out; out=$(call "cyclePositions(uint256)(address[],(int256,uint8,bool)[])" "$1")
  OUT="$out" WHO="$2" python3 -c '
import os, re
out, who = os.environ["OUT"], os.environ["WHO"].lower()
parties = [p.lower() for p in re.findall(r"0x[0-9a-fA-F]{40}", out)]
nets = [int(n) for n in re.findall(r"\(\s*(-?\d+)", out)]
i = parties.index(who)
print(max(0, -nets[i]))
'
}
