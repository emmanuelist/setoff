#!/usr/bin/env bash
# Phase 4 — the reversal. A cycle where one net debtor funds and another never does, voided
# after its deadline, refunding the deposit in full. This is the "or none does" half of the
# claim, proved on-chain rather than in a test.
#
#   RPC=… SETOFF=0x… scripts/mainnet/void.sh [enrol_seconds] [funding_seconds]
#
# The debts are chosen so the net debtors are deterministic: the two USD legs anchor the
# structure, and the EUR leg is too small to flip anyone whatever the fixing says.
#
#   A bills C  USD 1.00   ─┐  C is a net debtor, and funds
#   C bills A  EUR 0.50   ─┘  (the two legs set off against each other)
#   B bills D  USD 0.60       D is a net debtor, and never funds
#
# On a fork, drive time with `arc-cast rpc evm_increaseTime` between the stages.
source "$(dirname "$0")/lib.sh"

ENROL=${1:-240}      # seconds from now until the cutoff: time to enrol six transactions
WINDOW=${2:-660}     # funding window; the contract's floor is 10 minutes

now=$("$CAST" block latest --field timestamp --rpc-url "$RPC")
cutoff=$((now + ENROL))
deadline=$((cutoff + WINDOW))

echo "Opening a cycle: cutoff $cutoff, funding deadline $deadline (window $((WINDOW / 60)) min)."
send "openCycle" "$DEPLOYER_PRIVATE_KEY" "openCycle(uint64,uint64)" "$cutoff" "$deadline"
cyc=$(call "cycleCount()(uint256)" | awk '{print $1}')
echo "Cycle #$cyc is open."

enrol() { # enrol CREDITOR_KEY DEBTOR_ADDR CURRENCY AMOUNT REF DEBTOR_KEY
  send "propose into #$cyc" "$1" "proposeInCycle(uint256,address,bytes3,uint128,bytes32)" "$cyc" "$2" "$3" "$4" "$(ref "$5")"
  local id; id=$(debt_count)
  send "accept #$id (the debtor endorses)" "$6" "accept(uint256)" "$id"
}

enrol "$PARTY_A_PRIVATE_KEY" "$PARTY_C_ADDRESS" $USD 1000000 VOID-A-C "$PARTY_C_PRIVATE_KEY"
enrol "$PARTY_C_PRIVATE_KEY" "$PARTY_A_ADDRESS" $EUR  500000 VOID-C-A "$PARTY_A_PRIVATE_KEY"
enrol "$PARTY_B_PRIVATE_KEY" "$PARTY_D_ADDRESS" $USD  600000 VOID-B-D "$PARTY_D_PRIVATE_KEY"

echo "Enrolled. Waiting for the cutoff, then fixing."
wait_until "$cutoff"
send "fixCycle #$cyc" "$DEPLOYER_PRIVATE_KEY" "fixCycle(uint256)" "$cyc"

echo "Positions at the fixing:"
"$CAST" call "$SETOFF" "cyclePositions(uint256)(address[],(int256,uint8,bool)[])" "$cyc" --rpc-url "$RPC"

# C funds its net exactly; D is left unfunded, which is what voids the cycle.
due=$(net_owed "$cyc" "$PARTY_C_ADDRESS")
echo "C's net is $due wei. C funds; D does not."
send "fund #$cyc (C)" "$PARTY_C_PRIVATE_KEY" "fund(uint256)" "$cyc" --value "$due"

echo "Waiting for the funding deadline with D still unfunded."
wait_until "$deadline"
send "voidCycle #$cyc" "$DEPLOYER_PRIVATE_KEY" "voidCycle(uint256)" "$cyc"

echo "C takes its refund back."
send "withdraw (C)" "$PARTY_C_PRIVATE_KEY" "withdraw()"

echo
echo "Cycle #$cyc voided. C deposited $due wei and got all of it back; D paid nothing;"
echo "every debt is off the cycle and back on the direct path, still endorsed."
