#!/usr/bin/env bash
# Every figure the narration is allowed to say, read from the contract.
#
# The script cannot claim a number the chain does not hold: narration.ts
# interpolates this file, so a wrong figure is a build error rather than a
# sentence nobody checked.
#
#   npm run film:facts
set -euo pipefail
cd "$(dirname "$0")/.."

CAST="${CAST:-$HOME/.local/bin/arc-cast}"
RPC="${RPC:-https://rpc.mainnet.arc.io}"
SETOFF="${SETOFF:-0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6}"
SETTLED="${SETTLED:-1}"   # the cycle that cleared
VOIDED="${VOIDED:-3}"     # the cycle that was returned

CYCLE_SIG="cycle(uint256)((address,uint64,uint64,uint64,uint64,uint8,uint8,uint8,uint8,uint256,uint256,uint256))"
mkdir -p film

settled=$("$CAST" call "$SETOFF" "$CYCLE_SIG" "$SETTLED" --rpc-url "$RPC")
voided=$("$CAST" call "$SETOFF" "$CYCLE_SIG" "$VOIDED" --rpc-url "$RPC")
debts=$("$CAST" call "$SETOFF" "debtCount()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
n_settled=$("$CAST" call "$SETOFF" "cycleDebts(uint256)(uint256[])" "$SETTLED" --rpc-url "$RPC" | tr -cd ',' | wc -c | tr -d ' ')

SETTLED_RAW="$settled" VOIDED_RAW="$voided" DEBTS="$debts" NSET="$((n_settled + 1))" \
ADDR="$SETOFF" SID="$SETTLED" VID="$VOIDED" python3 - <<'PY'
import json, os, re

def fields(raw):
    return [x.strip() for x in re.sub(r"\[[^]]*\]", "", raw).strip().strip("()").split(",")]

STATES = {0: "none", 1: "open", 2: "fixed", 3: "settled", 4: "void"}

def cycle(raw):
    f = fields(raw)
    return {
        "state": STATES[int(f[5])],
        "debtors": int(f[6]),
        "funded": int(f[7]),
        "gross": int(f[9]),
        "netMoved": int(f[10]),
    }

def usdc(wei, places=4):
    s = f"{wei / 10**18:.{places}f}"
    return s.rstrip("0").rstrip(".") if "." in s else s

def spoken_usdc(wei):
    """How a person reads a small dollar figure aloud."""
    v = wei / 10**18
    if v < 1:
        return f"{round(v * 100)} cents"
    whole = int(v)
    cents = round((v - whole) * 100)
    return f"{whole} dollars {cents}" if cents else f"{whole} dollars"

# The refusal room's own source is the only authority on how many attempts there
# are. Counting these by eye got it wrong twice: once 17, once 18.
import re as _re
_att = open("apps/web/lib/attempts.ts").read()
_body = _att[_att.index("export const ATTEMPTS"):]
_keys = _re.findall(r'\bkey:\s*"([a-z0-9-]+)"', _body)
_exp = _re.findall(r'\bexpect:\s*"(refused|clears)"', _body)
attempts = {
    "total": len(set(_keys)),
    "refused": _exp.count("refused"),
    "clears": _exp.count("clears"),
}
assert attempts["refused"] + attempts["clears"] == attempts["total"], attempts

s, v = cycle(os.environ["SETTLED_RAW"]), cycle(os.environ["VOIDED_RAW"])
assert s["state"] == "settled", f"cycle {os.environ['SID']} is {s['state']}, expected settled"
assert v["state"] == "void", f"cycle {os.environ['VID']} is {v['state']}, expected void"
assert v["funded"] < v["debtors"], "the voided cycle must have an unfunded net debtor"

def pct(c):
    return round((c["gross"] - c["netMoved"]) * 1000 / c["gross"]) / 10

out = {
    "contract": os.environ["ADDR"],
    "attempts": attempts,
    "debts": int(os.environ["DEBTS"]),
    "settled": {
        "id": int(os.environ["SID"]), "debts": int(os.environ["NSET"]),
        "gross": usdc(s["gross"]), "grossSpoken": spoken_usdc(s["gross"]),
        "net": usdc(s["netMoved"]), "netSpoken": spoken_usdc(s["netMoved"]),
        "setOff": f"{pct(s):.1f}",
    },
    "voided": {
        "id": int(os.environ["VID"]), "debtors": v["debtors"], "funded": v["funded"],
        "gross": usdc(v["gross"]), "net": usdc(v["netMoved"]),
        "setOff": f"{pct(v):.1f}",
    },
}
json.dump(out, open("film/facts.json", "w"), indent=2)
print(json.dumps(out, indent=2))
PY
