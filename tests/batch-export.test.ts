/**
 * Per-batch export helper tests (#311).
 */

import { describe, expect, test } from "vitest";
import {
  buildBatchExportRows,
  toBatchExportCsv,
  toBatchExportHtml,
} from "../lib/dashboard/batch-export";

const sample = {
  jobId: "abc-123",
  completedAt: "2026-05-29T00:00:00Z",
  recipients: [
    {
      address: "GAAA",
      amount: "10.5",
      asset: "XLM",
      status: "success" as const,
      transactionHash: "tx1hash",
    },
    {
      address: "GBBB",
      amount: "25",
      asset: "XLM",
      status: "failed" as const,
      transactionHash: undefined,
      error: "tx_bad_seq",
    },
  ],
};

describe("buildBatchExportRows", () => {
  test("maps recipients into export rows with the job timestamp", () => {
    const rows = buildBatchExportRows(sample);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      address: "GAAA",
      amount: "10.5",
      asset: "XLM",
      status: "success",
      transactionHash: "tx1hash",
      timestamp: "2026-05-29T00:00:00Z",
    });
  });
  test("missing recipients produces an empty rows array", () => {
    expect(buildBatchExportRows({})).toEqual([]);
  });
});

describe("toBatchExportCsv (#311)", () => {
  test("emits an RFC-4180 header + one row per recipient", () => {
    const csv = toBatchExportCsv(buildBatchExportRows(sample));
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("Address,Amount,Asset,Status,Transaction hash,Timestamp");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("GAAA");
    expect(lines[2]).toContain("GBBB");
  });

  test("quotes fields containing commas / quotes / newlines", () => {
    const csv = toBatchExportCsv([
      {
        address: 'GBBB,injected',
        amount: 'has "quote"',
        asset: "XLM\r\nwith newline",
        status: "success",
        transactionHash: "h",
        timestamp: "t",
      },
    ]);
    expect(csv).toContain('"GBBB,injected"');
    expect(csv).toContain('"has ""quote"""');
    expect(csv).toContain('"XLM\r\nwith newline"');
  });

  test("defends against CSV-injection by prefix-escaping leading =, +, -, @", () => {
    const csv = toBatchExportCsv([
      {
        address: "=cmd|'/c calc'!A1",
        amount: "1",
        asset: "XLM",
        status: "success",
        transactionHash: "",
        timestamp: "",
      },
    ]);
    expect(csv).toContain("'=cmd");
  });
});

describe("toBatchExportHtml (#311)", () => {
  test("includes job id, network, and a Print button", () => {
    const html = toBatchExportHtml(buildBatchExportRows(sample), "abc-123", "testnet");
    expect(html).toContain("BatchPay export");
    expect(html).toContain("abc-123");
    expect(html).toContain("testnet");
    expect(html).toContain("window.print()");
  });

  test("transaction hash links to the right explorer per network", () => {
    const tn = toBatchExportHtml(
      [{ ...buildBatchExportRows(sample)[0] }],
      "j",
      "testnet",
    );
    expect(tn).toContain("stellar.expert/explorer/testnet/tx/");
    const mn = toBatchExportHtml(
      [{ ...buildBatchExportRows(sample)[0] }],
      "j",
      "mainnet",
    );
    expect(mn).toContain("stellar.expert/explorer/public/tx/");
  });

  test("HTML-escapes recipient addresses + statuses", () => {
    const html = toBatchExportHtml(
      [
        {
          address: "<script>",
          amount: "1",
          asset: "XLM",
          status: "&danger",
          transactionHash: "",
          timestamp: "",
        },
      ],
      "j",
      "testnet",
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;danger");
  });
});
