// Run: npx tsx --test lib/__tests__/google-tfs.test.ts
//
// Golden vectors for the Google Flights `tfs` protobuf encoder. The multi-city
// vector below is byte-identical to a real Google Flights multi-city URL
// (captured from the live site), minus one cosmetic difference: the live URL
// identified Eindhoven by city entity ("/m/02kx3") where we always use the
// IATA airport code. All three trip types were confirmed to load the correct
// prefilled search form.
//
// NOTE: only TFS_ROUND_TRIP has a caller today — the app is round-trip-only
// since the multi-city rollback (docs/MULTICITY_PLAN.md). TFS_ONE_WAY and
// TFS_MULTI_CITY stay encodable, and stay tested, because this captured live
// vector is the encoder's only byte-level regression guard and re-capturing it
// would mean going back to Google. Legs are plain TfsLeg literals here, so
// none of this depends on the deleted combo types.

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGoogleFlightsTfsUrl,
  TFS_MULTI_CITY,
  TFS_ONE_WAY,
  TFS_ROUND_TRIP,
} from "../googleFlightsTfs";
import { buildGoogleFlightsSearchUrl } from "../searchUrl";

const OUT = { origin: "EIN", destination: "BLQ", date: "2026-09-14" };
const BACK = { origin: "BLQ", destination: "CRL", date: "2026-09-20" };

/** `tfs` value out of a built URL. */
function tfs(url: string): string {
  return new URL(url).searchParams.get("tfs") ?? "";
}

/** Decode base64url → bytes (test-side only; the encoder is one-way). */
function decode(s: string): number[] {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = Buffer.from(b64, "base64");
  return [...bin];
}

/** Walk the top-level protobuf fields → { field: [values] }, LEN kept as bytes. */
function fields(bytes: number[]): Map<number, (number | number[])[]> {
  const out = new Map<number, (number | number[])[]>();
  let i = 0;
  const readVarint = () => {
    let v = 0;
    let shift = 0;
    for (;;) {
      const b = bytes[i++];
      v += (b & 0x7f) * 2 ** shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return v;
  };
  while (i < bytes.length) {
    const key = readVarint();
    const field = key >> 3;
    const wire = key & 7;
    let value: number | number[];
    if (wire === 0) value = readVarint();
    else if (wire === 2) {
      const len = readVarint();
      value = bytes.slice(i, i + len);
      i += len;
    } else throw new Error(`unexpected wire type ${wire}`);
    const list = out.get(field) ?? [];
    list.push(value);
    out.set(field, list);
  }
  return out;
}

const ascii = (bytes: number[]) => String.fromCharCode(...bytes);

test("multi-city matches the live Google Flights URL byte-for-byte", () => {
  const url = buildGoogleFlightsTfsUrl([OUT, BACK], TFS_MULTI_CITY);
  assert.equal(
    tfs(url),
    "CBwQAhoeEgoyMDI2LTA5LTE0agcIARIDRUlOcgcIARIDQkxRGh4SCjIwMjYtMDktMjBqBwgBEgNCTFFyBwgBEgNDUkxAAUgBcAGCAQsI____________AZgBAw",
  );
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://www.google.com/travel/flights/search");
  assert.equal(u.searchParams.get("tfu"), "EgYIABAAGAA");
  assert.equal(u.searchParams.get("curr"), "EUR");
});

test("trip type rides in field 19", () => {
  for (const [type, expected] of [
    [TFS_ROUND_TRIP, 1],
    [TFS_ONE_WAY, 2],
    [TFS_MULTI_CITY, 3],
  ] as const) {
    const f = fields(decode(tfs(buildGoogleFlightsTfsUrl([OUT, BACK], type))));
    assert.deepEqual(f.get(19), [expected]);
  }
});

test("legs keep their order, one field-3 entry each", () => {
  const f = fields(decode(tfs(buildGoogleFlightsTfsUrl([OUT, BACK], TFS_MULTI_CITY))));
  const legs = (f.get(3) ?? []) as number[][];
  assert.equal(legs.length, 2);

  const leg = (bytes: number[]) => {
    const inner = fields(bytes);
    const date = ascii(inner.get(2)![0] as number[]);
    const code = (field: number) =>
      ascii(fields(inner.get(field)![0] as number[]).get(2)![0] as number[]);
    return { date, origin: code(13), destination: code(14) };
  };
  assert.deepEqual(leg(legs[0]), OUT);
  assert.deepEqual(leg(legs[1]), BACK);
});

test("one adult in economy by default; extra adults repeat field 9", () => {
  const one = fields(decode(tfs(buildGoogleFlightsTfsUrl([OUT], TFS_ONE_WAY))));
  assert.deepEqual(one.get(8), [1]); // economy
  assert.deepEqual(one.get(9), [1]);

  const three = fields(decode(tfs(buildGoogleFlightsTfsUrl([OUT], TFS_ONE_WAY, 3))));
  assert.deepEqual(three.get(9), [1, 1, 1]);
});

test("airport codes are upper-cased", () => {
  const lower = { origin: "ein", destination: "blq", date: "2026-09-14" };
  assert.equal(
    tfs(buildGoogleFlightsTfsUrl([lower], TFS_ONE_WAY)),
    tfs(buildGoogleFlightsTfsUrl([OUT], TFS_ONE_WAY)),
  );
});

test("output is unpadded base64url", () => {
  const value = tfs(buildGoogleFlightsTfsUrl([OUT, BACK], TFS_MULTI_CITY));
  assert.match(value, /^[A-Za-z0-9_-]+$/);
});

test("buildGoogleFlightsSearchUrl is a round trip with a synthesized return", () => {
  const rt = fields(
    decode(
      tfs(
        buildGoogleFlightsSearchUrl({
          origin: "EIN",
          destination: "BLQ",
          outbound_date: "2026-09-14",
          return_date: "2026-09-16",
          duration_days: 2,
        }),
      ),
    ),
  );
  assert.deepEqual(rt.get(19), [1]);
  assert.equal((rt.get(3) ?? []).length, 2); // return leg synthesized

  const legs = (rt.get(3) ?? []) as number[][];
  const code = (bytes: number[], field: number) =>
    ascii(
      fields(fields(bytes).get(field)![0] as number[]).get(2)![0] as number[],
    );
  // the synthesized return leg flies BACK to the same origin
  assert.equal(code(legs[1], 13), "BLQ");
  assert.equal(code(legs[1], 14), "EIN");
});
