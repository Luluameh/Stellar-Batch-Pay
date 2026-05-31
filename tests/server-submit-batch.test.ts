/**
 * Integration test for StellarService.submitBatch — verifies that both XLM
 * and issued assets (e.g. USDC) are correctly parsed and submitted (#319).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Asset as StellarAsset, Keypair } from 'stellar-sdk';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSubmitTransaction = vi.fn();
const mockLoadAccount = vi.fn();
const mockFetchBaseFee = vi.fn().mockResolvedValue(100);

vi.mock('stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('stellar-sdk')>();

  class MockServer {
    loadAccount = mockLoadAccount;
    submitTransaction = mockSubmitTransaction;
    fetchBaseFee = mockFetchBaseFee;
    feeStats = vi.fn().mockResolvedValue({
      fee_charged: { p90: '100' },
    });
  }

  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: MockServer,
    },
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SOURCE_KEYPAIR = Keypair.random();
const RECIPIENT_1 = Keypair.random().publicKey();
const RECIPIENT_2 = Keypair.random().publicKey();
const RECIPIENT_3 = Keypair.random().publicKey();
const USDC_ISSUER = Keypair.random().publicKey();

const payments = [
  { address: RECIPIENT_1, amount: '10.0000000', asset: 'XLM' },
  { address: RECIPIENT_2, amount: '20.0000000', asset: 'XLM' },
  { address: RECIPIENT_3, amount: '50.0000000', asset: `USDC:${USDC_ISSUER}` },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StellarService.submitBatch — asset parsing (#319)', () => {
  beforeEach(() => {
    mockLoadAccount.mockResolvedValue({
      id: SOURCE_KEYPAIR.publicKey(),
      sequenceNumber: () => '1',
      incrementSequenceNumber: vi.fn(),
      accountId: () => SOURCE_KEYPAIR.publicKey(),
      sequence: '1',
      balances: [],
      signers: [],
      flags: {},
      thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
      data_attr: {},
    });

    mockSubmitTransaction.mockResolvedValue({ hash: 'mock-tx-hash-abc123' });
  });

  test('submits XLM and USDC payments without throwing', async () => {
    const { StellarService } = await import('../lib/stellar/server');

    const service = new StellarService({
      secretKey: SOURCE_KEYPAIR.secret(),
      network: 'testnet',
      maxOperationsPerTransaction: 100,
    });

    const result = await service.submitBatch(payments);

    expect(result.totalRecipients).toBe(3);
    expect(mockSubmitTransaction).toHaveBeenCalledTimes(1);
  });

  test('builds correct Asset instances for XLM and USDC operations', async () => {
    const { StellarService } = await import('../lib/stellar/server');

    const service = new StellarService({
      secretKey: SOURCE_KEYPAIR.secret(),
      network: 'testnet',
      maxOperationsPerTransaction: 100,
    });

    await service.submitBatch(payments);

    const submittedTx = mockSubmitTransaction.mock.calls[0][0];
    const ops = submittedTx.operations;

    expect(ops).toHaveLength(3);

    // First two ops: XLM (native)
    expect(ops[0].asset.isNative()).toBe(true);
    expect(ops[1].asset.isNative()).toBe(true);

    // Third op: USDC issued asset
    expect(ops[2].asset.isNative()).toBe(false);
    expect(ops[2].asset.getCode()).toBe('USDC');
    expect(ops[2].asset.getIssuer()).toBe(USDC_ISSUER);
  });

  test('all results are successful', async () => {
    const { StellarService } = await import('../lib/stellar/server');

    const service = new StellarService({
      secretKey: SOURCE_KEYPAIR.secret(),
      network: 'testnet',
      maxOperationsPerTransaction: 100,
    });

    const result = await service.submitBatch(payments);

    expect(result.summary.successful).toBe(3);
    expect(result.summary.failed).toBe(0);
    for (const r of result.results) {
      expect(r.status).toBe('success');
      expect(r.transactionHash).toBe('mock-tx-hash-abc123');
    }
  });
});
