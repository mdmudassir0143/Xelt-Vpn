# Spike: Magic + Particle UA (EIP-7702) settlement

**Purpose (Task 0 of the migration plan):** de-risk before P0 by proving two things and
recording the decisions that P0 depends on.

## Questions this spike answers

1. **Does Magic inject/work inside the Tauri WebView?**
   - _Finding:_ ✅ works in a **plain browser** (login + UA init, with vite-plugin-node-polyfills
     for process/Buffer/global). Tauri-WebView test deferred to P0; browser-callback rail
     (`client/src-tauri/src/callback.rs`) remains the fallback if the WebView misbehaves.

2. **Can the Magic EOA sign what Particle UA needs to settle a cross-chain USDC payment?**
   (the `rootHash` message signature, and — first tx per chain — the EIP-7702 authorization)
   - _Finding:_ ✅ **YES — Magic-direct signing works.** rootHash via Magic `personal_sign`;
     the EIP-7702 authorization via **`magic.wallet.sign7702Authorization({ contractAddress,
     chainId, nonce })`** (viem's `signAuthorization` refuses JSON-RPC accounts, so use
     Magic's native method). Serialize `{ r, s, v }` with viem `serializeSignature` and pass
     as `sendTransaction(tx, rootHashSig, [{ userOpHash, signature }])`.
   - **Proven plumbing:** UA accepted the tx (`transactionId 0x06560bee3069c8`) and the Magic
     EOA `0x476eda95e97E347c939041f3bB680BcD84cf9DDE` was **7702-delegated on Arbitrum**
     (`0xef0100…` code). No Particle-Auth fallback needed.
   - ⚠️ **Delivery caveat:** the 0.01 USDC transfer **did NOT deliver** — `getTransaction`
     status `11 = REFUND_FINISHED`. 0.01 is below the cross-chain routing minimum (fee floor
     ~$0.10), so the principal was refunded and ~0.10 USDC fee was consumed. **A real
     delivered settlement needs a viable amount (≳ $0.30–0.50).** Verify a delivered tx with
     `getTransaction(id).status === 7 (FINISHED)`, not just a returned transactionId.

4. **Fee economics (product insight):** per-payment cross-chain settlement of micro-amounts
   is uneconomical (~$0.10 routing floor). Design should prefer "fund once via UA → cheap
   payments" over "UA-settle every per-minute payment," or price minutes well above the floor.

5. **✅ RESOLVED — the bug was `createTransferTransaction`; use `createUniversalTransaction`.**
   `createTransferTransaction({token, amount, receiver})` in SDK 2.0.3 deposits **only the flat
   ~$0.10 fee** (never the principal) → `settlementUserOperations` empty → **status 11 REFUND**.
   Confirmed by decoding deposits: a $1 send and a $0.1 send BOTH deposited ~$0.10 (fee only).
   The official demo (`Particle-Network/universal-accounts-7702`, `components/TransferCard.tsx`)
   **never uses `createTransferTransaction`** — it uses **`createUniversalTransaction`** with
   `expectTokens` + a raw `USDC.transfer(receiver, amount)` call.
   **Switching to `createUniversalTransaction` → status 7 FINISHED, payee received the full
   1 USDC on Arbitrum.** Verified on-chain: deposit [`0xad303c67…`](https://basescan.org/tx/0xad303c67fb31a6f6e25f763f05d9bfde50901768ec387825ce3e7be1ea12dc67)
   (Base, moved 1 + ~0.17 fee), delivery [`0x124ad3e3…`](https://arbiscan.io/tx/0x124ad3e31b8c9d4d2234cec958e2f2c10946060a31a61679d78bbab367dd4e0e)
   (Arbitrum LP fill → payee). transactionId `0x065619b4748a13`. Fee ~$0.17 on $1 (~17%).
   Failed earlier (all `createTransferTransaction`): `0x06560c926f20b5` (BSC),
   `0x06560c75aead07` + `0x06560bee3069c8` (Arb). No Particle-side issue; no support ticket needed.

3. **Does Particle UA support testnets, or is it mainnet-only?**
   - _Finding:_ **MAINNET-ONLY (confirmed).** UA SDK v2.0.3 `CHAIN_ID` enum contains only
     mainnet chains (Arbitrum One 42161, Base 8453, Ethereum, BNB, …); zero "sepolia"/
     "testnet" strings in the package. The Arbitrum Sepolia "co-testnet" was a separate
     promo, not SDK-routable. → Demo settles tiny **real** USDC on Arbitrum One (~$0.02/pay).

## Run

```bash
cd spikes/ua-magic-7702
cp .env.example .env   # already created with the Particle/Magic client keys
# fill in: VITE_PARTICLE_APP_ID, VITE_TEST_PAYTO
npm install
npm run dev            # http://localhost:5175
```

Then: **1. Login + init UA** → copy the printed EOA → fund it with a little USDC on a
**non-settlement** EVM chain (so the cross-chain hop is real) → **2. Read unified balance**
→ **3. Pay**. Capture the result (or the error) into the findings above.

## Decision (RESOLVED 2026-07-08)

- Signing path: **works in plain browser**; Tauri-WebView test deferred to P0 (Magic is
  iframe-based, likely fine; browser-callback rail remains the fallback).
- Owner EOA source: **Magic direct** (`magic.wallet.sign7702Authorization`).
- Network: **mainnet, small real USDC** (UA SDK v2.0.3 is mainnet-only).

## Proven integration recipe (copy into the client `wallet/` module in P0) — VERIFIED status 7

```ts
import { UniversalAccount, SUPPORTED_TOKEN_TYPE } from "@particle-network/universal-account-sdk";
import { encodeFunctionData, parseUnits, serializeSignature } from "viem";

// init
const ua = new UniversalAccount({ projectId, projectClientKey, projectAppUuid,
  smartAccountOptions: { useEIP7702: true, ownerAddress: magicEoa } });

// build — USE createUniversalTransaction (NOT createTransferTransaction, which refunds).
// Deliver USDC to an external receiver = a raw USDC.transfer() call on the dest chain.
const decimals = destChainId === 56 ? 18 : 6; // BSC USDC is 18-dp, others 6
const tx = await ua.createUniversalTransaction({
  chainId: destChainId,
  expectTokens: [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount }], // human-readable, e.g. "1"
  transactions: [{
    to: usdcAddressOnDestChain,
    data: encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer",
      args: [receiver, parseUnits(amount, decimals)] }),
  }],
});

// sign rootHash (Magic personal_sign) + first-per-chain EIP-7702 auth (Magic native)
const rootHashSig = await walletClient.signMessage({ account: magicEoa, message: { raw: tx.rootHash } });
const authorizations = [];
for (const op of tx.userOps) {
  if (op.eip7702Auth && !op.eip7702Delegated) {
    const a = await magic.wallet.sign7702Authorization({
      contractAddress: op.eip7702Auth.address, chainId: op.eip7702Auth.chainId, nonce: op.eip7702Auth.nonce });
    authorizations.push({ userOpHash: op.userOpHash, signature: serializeSignature({ r: a.r, s: a.s, v: BigInt(a.v) }) });
  }
}
const result = await ua.sendTransaction(tx, rootHashSig, authorizations); // { transactionId }
// then poll ua.getTransaction(result.transactionId).status === 7 (FINISHED) to confirm delivery.
```
