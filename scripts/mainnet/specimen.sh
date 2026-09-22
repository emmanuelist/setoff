#!/usr/bin/env bash
# Recreates the two specimen debts on the milestone 2 contract (D019): one paid at the fixing,
# and one endorsed and left unpaid, which the refusal room tests against.
#   RPC=… SETOFF=0x… scripts/mainnet/specimen.sh
source "$(dirname "$0")/lib.sh"

echo "Paid specimen: A bills B MXN 10.00; B pays at the fixing; A withdraws."
send "propose (A, creditor)" "$PARTY_A_PRIVATE_KEY" "propose(address,bytes3,uint128,bytes32)" "$PARTY_B_ADDRESS" $MXN 10000000 "$(ref INV-0001)"
paid=$(debt_count)
send "accept #$paid (B endorses)" "$PARTY_B_PRIVATE_KEY" "accept(uint256)" "$paid"
due=$(call "quote(uint256)(uint256,(bytes3,int256,uint8,uint80,uint64))" "$paid" | head -1 | awk '{print $1}')
send "pay #$paid (B, at the fixing)" "$PARTY_B_PRIVATE_KEY" "pay(uint256)" "$paid" --value "$due"
send "withdraw (A takes the payout)" "$PARTY_A_PRIVATE_KEY" "withdraw()"

echo "Open specimen: C bills D BRL 5.00; D endorses; it stays unpaid."
send "propose (C, creditor)" "$PARTY_C_PRIVATE_KEY" "propose(address,bytes3,uint128,bytes32)" "$PARTY_D_ADDRESS" $BRL 5000000 "$(ref INV-0002)"
open=$(debt_count)
send "accept #$open (D endorses)" "$PARTY_D_PRIVATE_KEY" "accept(uint256)" "$open"

echo "Done: debt #$paid paid (due $due wei), debt #$open endorsed and unpaid."
