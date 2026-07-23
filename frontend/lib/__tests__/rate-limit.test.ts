// ─── lib/rateLimit unit tests ────────────────────────────────────────────────
// Run: npx tsx --test lib/__tests__/rate-limit.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import { clientIp, rateLimit } from "../rateLimit";

test("allows up to limit hits, then blocks", () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit("k1", 5, 60_000), true, `hit ${i + 1} allowed`);
  }
  assert.equal(rateLimit("k1", 5, 60_000), false);
  assert.equal(rateLimit("k1", 5, 60_000), false);
});

test("keys are independent", () => {
  for (let i = 0; i < 5; i++) rateLimit("k2", 5, 60_000);
  assert.equal(rateLimit("k2", 5, 60_000), false);
  assert.equal(rateLimit("k3", 5, 60_000), true);
});

test("window expiry frees the key", () => {
  const realNow = Date.now;
  try {
    let now = 1_000_000;
    Date.now = () => now;
    for (let i = 0; i < 3; i++) rateLimit("k4", 3, 10_000);
    assert.equal(rateLimit("k4", 3, 10_000), false);
    now += 10_001; // whole window elapses
    assert.equal(rateLimit("k4", 3, 10_000), true);
  } finally {
    Date.now = realNow;
  }
});

test("sliding window: oldest hit expiring admits exactly one more", () => {
  const realNow = Date.now;
  try {
    let now = 2_000_000;
    Date.now = () => now;
    rateLimit("k5", 2, 10_000); // t=0
    now += 6_000;
    rateLimit("k5", 2, 10_000); // t=6s
    assert.equal(rateLimit("k5", 2, 10_000), false);
    now += 4_001; // t=10.001s — first hit out of window, second still in
    assert.equal(rateLimit("k5", 2, 10_000), true);
    assert.equal(rateLimit("k5", 2, 10_000), false);
  } finally {
    Date.now = realNow;
  }
});

test("clientIp prefers first x-forwarded-for hop", () => {
  const req = new Request("http://x", {
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
  });
  assert.equal(clientIp(req), "203.0.113.7");
  assert.equal(clientIp(new Request("http://x")), "unknown");
});
