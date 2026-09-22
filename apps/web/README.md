# Setoff web

The Setoff app: debts priced in five currencies, paid in native USDC on Arc at a Chainlink
fixing. Every figure is read live from the contract on Arc mainnet, with no backend and
no database (D009, D014).

```bash
npm install
npm run dev         # http://localhost:3000, reading Arc mainnet
npm run lint        # zero warnings
npm run typecheck
npm run build
npm run abi         # after changing the contract: regenerate lib/setoff-abi.ts
```

**Stack:** Next.js 16.3.5 (App Router), React 19.2.8, viem 2.56.8. There's no component
library and no Tailwind: tokens live in `app/globals.css`, and components use CSS Modules.

**End-to-end tests against a fork:** set `NEXT_PUBLIC_ARC_RPC_URL` to a local
`arc-anvil --network arc --fork-url https://rpc.mainnet.arc.io` and drive the app with an
injected EIP-6963 wallet on *fresh* addresses. The well-known test accounts carry an
EIP-7702 sweeper on Arc mainnet (see the root `AGENTS.md`).
