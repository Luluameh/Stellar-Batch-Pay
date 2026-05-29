#!/bin/bash
# Example CLI usage script for Stellar BatchPay (#362).
#
# Restored to use the new `cli/index.ts` entry point and the project's
# package manager scripts so it runs out of the box. The previous
# script invoked `node cli/index.ts` directly, which (a) failed
# because `cli/` didn't exist and (b) wouldn't have parsed TypeScript
# even when it did.

set -euo pipefail

if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
  echo "Error: STELLAR_SECRET_KEY environment variable is not set"
  exit 1
fi

echo "=== Stellar Bulk Payment CLI Example ==="
echo

# Pick a package manager — Bun is what this repo ships with; npm
# falls through.
PKG_RUN="bun run"
if ! command -v bun >/dev/null 2>&1; then
  PKG_RUN="npm run"
fi

if [ ! -d "node_modules" ]; then
  echo "[*] Installing dependencies..."
  if [ "$PKG_RUN" = "bun run" ]; then
    bun install
  else
    npm install
  fi
fi

echo "[*] Validating example payments..."
$PKG_RUN cli -- validate --input examples/payments.json

echo
echo "[*] Building batches..."
$PKG_RUN cli -- build --input examples/payments.json --network testnet --output /tmp/stellar-batches.json

if [ -f /tmp/stellar-batches.json ]; then
  echo
  echo "[*] Built batches:"
  cat /tmp/stellar-batches.json
fi

echo
echo "[*] Submit step (CLI builds + reports; on-chain submission is currently dapp-side)..."
$PKG_RUN cli -- submit --input examples/payments.json --network testnet --output /tmp/stellar-submit.json
echo "Wrote /tmp/stellar-submit.json"
