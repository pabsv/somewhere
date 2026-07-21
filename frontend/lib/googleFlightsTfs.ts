// ─── Google Flights `tfs` deep links ─────────────────────────────────────────
// Google Flights encodes a whole search (legs, dates, trip type, cabin, pax)
// into the `tfs` query param: a protobuf message, base64url-encoded, unpadded.
// Building it ourselves gives EXACT deep links — the airports and dates are
// stated, not parsed out of a `?q=` sentence — and unlocks the one shape the
// text form can't express at all: MULTI-CITY, which is what an open-jaw or
// twin-city combo actually is (fly out to one city, fly home from another).
//
// Wire format (reverse-engineered from a live Google Flights URL, verified
// byte-identical against it):
//
//   1 : varint 28                    constant
//   2 : varint 2                     constant
//   3 : repeated LEG {               one per flight leg, in order
//         2 : string "YYYY-MM-DD"
//         13: { 1: 1, 2: "EIN" }     from — 1 = airport code (3 = city entity)
//         14: { 1: 1, 2: "BLQ" }     to
//       }
//   8 : varint 1                     cabin = economy
//   9 : varint 1                     one entry per adult passenger (repeated)
//   14: varint 1                     constant
//   16: { 1: -1 }                    max price unset
//   19: varint tripType              1 round trip / 2 one way / 3 multi-city
//
// The trip-type enum matches fli's own `TripType` (the scraper backend), which
// is a good sign the numbering is stable. Field ORDER matters — emit exactly
// as above. Pure + dependency-free (no Buffer) so it runs on the server, in the
// browser bundle, and under `tsx --test`.

/** One flight leg of a Google Flights search. `date` is `YYYY-MM-DD`. */
export interface TfsLeg {
  origin: string;
  destination: string;
  date: string;
}

/** Google Flights trip type — same numbering as fli's `TripType`. */
export type TfsTripType = 1 | 2 | 3; // round trip | one way | multi-city

export const TFS_ROUND_TRIP: TfsTripType = 1;
export const TFS_ONE_WAY: TfsTripType = 2;
export const TFS_MULTI_CITY: TfsTripType = 3;

// ─── protobuf writers (over plain number[] — no Buffer/Uint8Array juggling) ──

function varint(n: number): number[] {
  const out: number[] = [];
  let v = n;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v > 0) b |= 0x80;
    out.push(b);
  } while (v > 0);
  return out;
}

const tag = (field: number, wire: number) => varint((field << 3) | wire);
/** varint field */
const vf = (field: number, n: number) => [...tag(field, 0), ...varint(n)];
/** length-delimited field */
const lf = (field: number, body: number[]) => [
  ...tag(field, 2),
  ...varint(body.length),
  ...body,
];
/** string field */
const sf = (field: number, s: string) => lf(field, [...new TextEncoder().encode(s)]);

/** `{ 1: -1 }` — max price unset. -1 as a 64-bit varint = nine 0xff + 0x01. */
const MAX_PRICE_UNSET = [
  0x08, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01,
];

/** `{ 1: 1, 2: CODE }` — a location given as an IATA airport code. */
const airport = (code: string) => [...vf(1, 1), ...sf(2, code.toUpperCase())];

const legBytes = (leg: TfsLeg) => [
  ...sf(2, leg.date),
  ...lf(13, airport(leg.origin)),
  ...lf(14, airport(leg.destination)),
];

// ─── base64url, unpadded (matches Google's own URLs) ─────────────────────────

const B64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function b64url(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64URL[b0 >> 2];
    out += B64URL[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64URL[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64URL[b2 & 0x3f];
  }
  return out;
}

// ─── URL builder ─────────────────────────────────────────────────────────────

/** Constant companion param on every Google Flights search URL: `{2:{1:0,2:0,3:0}}`. */
const TFU = "EgYIABAAGAA";

/**
 * Google Flights search URL for an arbitrary list of legs.
 *
 * Currency/locale are pinned (`gl=NL&hl=en&curr=EUR`) for the same reason the
 * scraper pins them: Google picks the response currency by GeoIP otherwise, and
 * every price in this app is EUR.
 */
export function buildGoogleFlightsTfsUrl(
  legs: TfsLeg[],
  tripType: TfsTripType,
  adults = 1,
): string {
  const body = [
    ...vf(1, 28),
    ...vf(2, 2),
    ...legs.flatMap((leg) => lf(3, legBytes(leg))),
    ...vf(8, 1), // economy
    ...Array.from({ length: Math.max(1, adults) }, () => vf(9, 1)).flat(),
    ...vf(14, 1),
    ...lf(16, MAX_PRICE_UNSET),
    ...vf(19, tripType),
  ];
  return (
    `https://www.google.com/travel/flights/search?tfs=${b64url(body)}` +
    `&tfu=${TFU}&hl=en&gl=NL&curr=EUR`
  );
}
