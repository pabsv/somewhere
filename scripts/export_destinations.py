"""
Codegen: export scraper/targets.py pool data to TypeScript for the frontend.

Writes (with LF line endings):
  - frontend/data/destinations.gen.ts  (all destinations, sorted by name,
    plus REGIONS and a Map-backed getDestination lookup)
  - frontend/data/airports.gen.ts      (active origins)
  - frontend/data/groundpairs.gen.ts   (overland twin-city pairs + a
    both-directions getGroundLinks lookup)

Re-run after editing scraper/targets.py:
    python -m scripts.export_destinations
"""

import json
import os
import sys

# Project root on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper.targets import (
    DESTINATIONS,
    GROUND_PAIRS,
    ORIGINS,
    validate_ground_pairs,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "frontend", "data")

HEADER = (
    "// GENERATED — edit scraper/targets.py, then run: "
    "python -m scripts.export_destinations\n"
)


def ts_str(value: str) -> str:
    """JSON string literal == valid TS string literal. Keep unicode readable."""
    return json.dumps(value, ensure_ascii=False)


def destination_line(d: dict) -> str:
    return (
        f"  {{ code: {ts_str(d['code'])}, name: {ts_str(d['name'])}, "
        f"country: {ts_str(d['country'])}, region: {ts_str(d['region'])}, "
        f"tier: {ts_str(d['tier'])} }},"
    )


def origin_line(o: dict) -> str:
    return (
        f"  {{ code: {ts_str(o['code'])}, name: {ts_str(o['name'])}, "
        f"country: {ts_str(o['country'])} }},"
    )


def build_destinations_ts() -> str:
    dests = sorted(DESTINATIONS, key=lambda d: d["name"])
    regions = sorted({d["region"] for d in DESTINATIONS})

    lines = [
        HEADER,
        "export interface Destination {",
        "  code: string;",
        "  name: string;",
        "  country: string;",
        "  region: string;",
        '  tier: "A" | "B" | "C";',
        "}",
        "",
        "export const DESTINATIONS: Destination[] = [",
        *[destination_line(d) for d in dests],
        "];",
        "",
        "export const REGIONS: string[] = [",
        *[f"  {ts_str(r)}," for r in regions],
        "];",
        "",
        "const BY_CODE = new Map<string, Destination>(",
        "  DESTINATIONS.map((d) => [d.code, d]),",
        ");",
        "",
        "export function getDestination(code: string): Destination | undefined {",
        "  return BY_CODE.get(code);",
        "}",
        "",
    ]
    return "\n".join(lines)


def build_airports_ts() -> str:
    lines = [
        HEADER,
        "export interface Origin {",
        "  code: string;",
        "  name: string;",
        "  country: string;",
        "}",
        "",
        "// Active origins only. Inactive extras (e.g. DUS, NRN) live",
        "// commented-out in scraper/targets.py — re-enable there and re-run.",
        "export const ORIGINS: Origin[] = [",
        *[origin_line(o) for o in ORIGINS],
        "];",
        "",
    ]
    return "\n".join(lines)


def ground_pair_line(pair: tuple) -> str:
    a, b, hours = pair
    return f"  {{ a: {ts_str(a)}, b: {ts_str(b)}, hours: {hours} }},"


def build_groundpairs_ts() -> str:
    lines = [
        HEADER,
        "// Overland twin-city pairs (docs/MULTICITY_PLAN.md Phase 4). Each",
        "// unordered pair appears ONCE; getGroundLinks expands both directions.",
        "// `hours` = approximate one-way ground time — display info only.",
        "",
        "export interface GroundPair {",
        "  a: string;",
        "  b: string;",
        "  hours: number;",
        "}",
        "",
        "export interface GroundLink {",
        "  other: string;",
        "  hours: number;",
        "}",
        "",
        "export const GROUND_PAIRS: GroundPair[] = [",
        *[ground_pair_line(p) for p in GROUND_PAIRS],
        "];",
        "",
        "const LINKS = new Map<string, GroundLink[]>();",
        "for (const { a, b, hours } of GROUND_PAIRS) {",
        "  for (const [from, to] of [",
        "    [a, b],",
        "    [b, a],",
        "  ] as const) {",
        "    const list = LINKS.get(from) ?? [];",
        "    list.push({ other: to, hours });",
        "    LINKS.set(from, list);",
        "  }",
        "}",
        "",
        "/** Ground links touching `code`, both directions. [] when none. */",
        "export function getGroundLinks(code: string): GroundLink[] {",
        "  return LINKS.get(code) ?? [];",
        "}",
        "",
    ]
    return "\n".join(lines)


def write_lf(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


def main() -> None:
    validate_ground_pairs()
    os.makedirs(OUT_DIR, exist_ok=True)

    dest_path = os.path.join(OUT_DIR, "destinations.gen.ts")
    air_path = os.path.join(OUT_DIR, "airports.gen.ts")
    ground_path = os.path.join(OUT_DIR, "groundpairs.gen.ts")

    write_lf(dest_path, build_destinations_ts())
    write_lf(air_path, build_airports_ts())
    write_lf(ground_path, build_groundpairs_ts())

    regions = sorted({d["region"] for d in DESTINATIONS})
    print(f"Wrote {dest_path}: {len(DESTINATIONS)} destinations, {len(regions)} regions")
    print(f"Wrote {air_path}: {len(ORIGINS)} origins")
    print(f"Wrote {ground_path}: {len(GROUND_PAIRS)} ground pairs")


if __name__ == "__main__":
    main()
