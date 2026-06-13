// ─── CityHeader — City detail masthead (Track E) ─────────────────────────────
// Big display city name + country, the yellow mono IATA tag (the page's single
// loud accent — spec §F yellow scarcity), a neutral region Badge, and the
// route baseline line when present. Used by CityDetail and its skeleton.

import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/format";
import { countryName } from "./countryName";

interface CityHeaderProps {
  /** Display city name, e.g. "Barcelona". */
  name: string;
  /** Destination IATA code, e.g. "BCN". */
  code: string;
  /** ISO-3166 alpha-2 country code, e.g. "ES". */
  country: string;
  /** Region label, e.g. "Iberia". Null = no Badge. */
  region?: string | null;
  /** Route baseline (typical round-trip). Null = cold route, no line. */
  baseline?: number | null;
  /** Optional trailing control (e.g. the save-city star), right-aligned. */
  action?: React.ReactNode;
}

export default function CityHeader({
  name,
  code,
  country,
  region,
  baseline,
  action,
}: CityHeaderProps) {
  return (
    <header className="border-b border-line pb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          {name}
        </h1>
        <span className="tnum shrink-0 rounded-tag bg-brand px-2 py-0.5 font-mono text-sm font-semibold uppercase tracking-wide text-brand-ink">
          {code}
        </span>
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-base text-ink-muted">{countryName(country)}</span>
        {region ? <Badge variant="neutral">{region}</Badge> : null}
      </div>

      {baseline != null ? (
        <p className="mt-3 text-sm text-ink-muted">
          typical round-trip from your airports:{" "}
          <span className="tnum font-mono font-medium text-ink">
            {formatPrice(baseline)}
          </span>
        </p>
      ) : null}
    </header>
  );
}
