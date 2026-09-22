// Generated from packages/contracts/out/Setoff.sol/Setoff.json — run `npm run abi` after changing the contract.
export const setoffAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "codes",
        "type": "bytes3[]",
        "internalType": "bytes3[]"
      },
      {
        "name": "feeds",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "maxFixingAge_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "AMOUNT_DECIMALS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_AMOUNT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_CYCLE_DEBTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_CYCLE_PARTIES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FUNDING_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_FUNDING_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "USD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accept",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "currencies",
    "inputs": [],
    "outputs": [
      {
        "name": "list",
        "type": "bytes3[]",
        "internalType": "bytes3[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Setoff.Cycle",
        "components": [
          {
            "name": "opener",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "cutoff",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "fundingDeadline",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "fixedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "closedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Setoff.CycleState"
          },
          {
            "name": "debtors",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "funded",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "currencyMask",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "gross",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "netMoved",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "held",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cycleCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cycleDebts",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cycleFixing",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Setoff.Fixing",
        "components": [
          {
            "name": "currency",
            "type": "bytes3",
            "internalType": "bytes3"
          },
          {
            "name": "answer",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "decimals",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "roundId",
            "type": "uint80",
            "internalType": "uint80"
          },
          {
            "name": "updatedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cyclePositions",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "parties",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "positions",
        "type": "tuple[]",
        "internalType": "struct Setoff.Position[]",
        "components": [
          {
            "name": "net",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "index",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "funded",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "debt",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Setoff.Debt",
        "components": [
          {
            "name": "creditor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "proposedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "debtor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "acceptedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "currency",
            "type": "bytes3",
            "internalType": "bytes3"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Setoff.State"
          },
          {
            "name": "closedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "cycleId",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "ref",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "debtCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feedOf",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract AggregatorV3Interface"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fixCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fixingOf",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ],
    "outputs": [
      {
        "name": "f",
        "type": "tuple",
        "internalType": "struct Setoff.Fixing",
        "components": [
          {
            "name": "currency",
            "type": "bytes3",
            "internalType": "bytes3"
          },
          {
            "name": "answer",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "decimals",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "roundId",
            "type": "uint80",
            "internalType": "uint80"
          },
          {
            "name": "updatedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fund",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "isSupported",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxFixingAge",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openCycle",
    "inputs": [
      {
        "name": "cutoff",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "fundingDeadline",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pay",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "preview",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "parties",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "nets",
        "type": "int256[]",
        "internalType": "int256[]"
      },
      {
        "name": "gross",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "netMoved",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "propose",
    "inputs": [
      {
        "name": "debtor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "proposeInCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "debtor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "quote",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "due",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fixing",
        "type": "tuple",
        "internalType": "struct Setoff.Fixing",
        "components": [
          {
            "name": "currency",
            "type": "bytes3",
            "internalType": "bytes3"
          },
          {
            "name": "answer",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "decimals",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "roundId",
            "type": "uint80",
            "internalType": "uint80"
          },
          {
            "name": "updatedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "toUsdc",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "f",
        "type": "tuple",
        "internalType": "struct Setoff.Fixing",
        "components": [
          {
            "name": "currency",
            "type": "bytes3",
            "internalType": "bytes3"
          },
          {
            "name": "answer",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "decimals",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "roundId",
            "type": "uint80",
            "internalType": "uint80"
          },
          {
            "name": "updatedAt",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "totalHeld",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalWithdrawable",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "voidCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawable",
    "inputs": [
      {
        "name": "party",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Accepted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Cancelled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Credited",
    "inputs": [
      {
        "name": "party",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "reason",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum Setoff.Reason"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CurrencyFixed",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "indexed": false,
        "internalType": "bytes3"
      },
      {
        "name": "answer",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "feedDecimals",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "roundId",
        "type": "uint80",
        "indexed": false,
        "internalType": "uint80"
      },
      {
        "name": "updatedAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleFixed",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "gross",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "netMoved",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "debtors",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleOpened",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "opener",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "cutoff",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "fundingDeadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleSettled",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "netMoved",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleVoided",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "refunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Enrolled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Funded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "party",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "usdc",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Netted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "cycleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paid",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "payer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "usdc",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "indexed": false,
        "internalType": "bytes3"
      },
      {
        "name": "answer",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "feedDecimals",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "roundId",
        "type": "uint80",
        "indexed": false,
        "internalType": "uint80"
      },
      {
        "name": "updatedAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Proposed",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creditor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "debtor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "currency",
        "type": "bytes3",
        "indexed": false,
        "internalType": "bytes3"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "ref",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "party",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyFunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "party",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AmountTooLarge",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BeforeCutoff",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cutoff",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BeforeDeadline",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundingDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleFull",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "DuplicateCurrency",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptyCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "FullyFunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InCycle",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidAnswer",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      },
      {
        "name": "answer",
        "type": "int256",
        "internalType": "int256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidDebtor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSchedule",
    "inputs": [
      {
        "name": "cutoff",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundingDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidUpdatedAt",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      },
      {
        "name": "updatedAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "LengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotCreditor",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotDebtor",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotFullyFunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "funded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "debtors",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotNetDebtor",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "party",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PastCutoff",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cutoff",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PastDeadline",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundingDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StaleFixing",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      },
      {
        "name": "updatedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxFixingAge",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooManyCurrencies",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyParties",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Underfunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "due",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sent",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Underpaid",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "due",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sent",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownDebt",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnsupportedCurrency",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ]
  },
  {
    "type": "error",
    "name": "WrongCycleState",
    "inputs": [
      {
        "name": "cycleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum Setoff.CycleState"
      }
    ]
  },
  {
    "type": "error",
    "name": "WrongState",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum Setoff.State"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroFeed",
    "inputs": [
      {
        "name": "currency",
        "type": "bytes3",
        "internalType": "bytes3"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroMaxFixingAge",
    "inputs": []
  }
] as const;
