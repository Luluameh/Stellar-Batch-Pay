/**
 * Regression tests for POST /api/batch-submit idempotency handling.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

process.env.JOB_STORE_PATH = ":memory:";

const { mockProcessJobInBackground } = vi.hoisted(() => ({
  mockProcessJobInBackground: vi.fn(),
}));

vi.mock("@/lib/stellar/batch-worker", () => ({
  processJobInBackground: mockProcessJobInBackground,
}));

vi.mock("@/lib/api-rate-limit", () => ({
  applyRateLimit: vi.fn(() => ({ blocked: false, response: undefined })),
  setRateLimitHeaders: vi.fn((response: Response) => response),
}));

import { POST } from "@/app/api/batch-submit/route";

const OWNER_PUBLIC_KEY = "GDQERHRWJYV7JHRP5V7DWJVI6Y5ABZP3YRH7DKYJRBEGJQKE6IQEOSY2";

const baseBody = {
  network: "testnet" as const,
  publicKey: OWNER_PUBLIC_KEY,
  signedTransactions: ["AAAA"],
};

beforeEach(() => {
  mockProcessJobInBackground.mockClear();
});

function makeRequest(body: object, idempotencyKey: string) {
  return new Request("http://localhost/api/batch-submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/batch-submit idempotency", () => {
  test("returns the same jobId for a replayed request and only starts one worker", async () => {
    const idempotencyKey = "stable-idempotency-key";

    const firstResponse = await POST(makeRequest(baseBody, idempotencyKey) as never);
    const firstJson = await firstResponse.json();

    const secondResponse = await POST(makeRequest(baseBody, idempotencyKey) as never);
    const secondJson = await secondResponse.json();

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(202);
    expect(firstJson.jobId).toBe(secondJson.jobId);
    expect(mockProcessJobInBackground).toHaveBeenCalledTimes(1);
  });

  test("rejects a conflicting body that reuses the same key", async () => {
    const idempotencyKey = "conflicting-key";

    await POST(makeRequest(baseBody, idempotencyKey) as never);

    const conflictingBody = {
      ...baseBody,
      signedTransactions: ["BBBB"],
    };

    const response = await POST(makeRequest(conflictingBody, idempotencyKey) as never);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toMatch(/idempotency key/i);
    expect(mockProcessJobInBackground).toHaveBeenCalledTimes(1);
  });
});