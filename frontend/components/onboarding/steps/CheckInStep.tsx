import Badge from "@/components/ui/Badge";
import FareTag from "@/components/ui/FareTag";

const CALENDAR_DAYS = [
  "empty",
  "empty",
  "empty",
  "empty",
  "empty",
  "free",
  "free",
  "empty",
  "soft",
  "soft",
  "empty",
  "free",
  "free",
  "free",
  "empty",
  "empty",
  "empty",
  "empty",
  "empty",
  "free",
  "empty",
] as const;

const WATCHED_FARES = [
  { origin: "EIN", destination: "BCN", price: 38 },
  { origin: "AMS", destination: "FCO", price: 52 },
  { origin: "BRU", destination: "OPO", price: 41 },
] as const;

function FreeDaysVignette() {
  return (
    <div className="flex flex-col items-center gap-2.5" aria-hidden="true">
      <div className="flex items-center gap-1">
        <span className="rounded bg-brand px-1.5 py-1 font-mono text-[8px] font-bold tracking-wide text-brand-ink">
          EIN
        </span>
        <span className="font-mono text-[9px] text-ink-muted">+</span>
        <span className="rounded bg-brand px-1.5 py-1 font-mono text-[8px] font-bold tracking-wide text-brand-ink">
          AMS
        </span>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {CALENDAR_DAYS.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className={`size-3 rounded-[3px] ${
              day === "free"
                ? "bg-brand"
                : day === "soft"
                  ? "bg-brand/30"
                  : "bg-line/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function PriceWatchVignette() {
  return (
    <div
      className="w-full max-w-[8.5rem] overflow-hidden rounded-lg bg-night shadow-sm"
      aria-hidden="true"
    >
      <div className="h-[3px] bg-brand" />
      {WATCHED_FARES.map(({ origin, destination, price }, index) => (
        <div
          key={`${origin}-${destination}`}
          className={`flex items-center justify-between px-2 py-1.5 font-mono text-[8px] font-semibold text-paper ${
            index < WATCHED_FARES.length - 1
              ? "border-b border-white/10"
              : ""
          }`}
        >
          <span className="tracking-[0.06em]">
            {origin}&rarr;{destination}
          </span>
          <span className="tnum">&euro;{price}</span>
        </div>
      ))}
    </div>
  );
}

function MatchedTripVignette() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
        <span className="font-mono text-[10px] font-semibold tracking-[0.04em] text-ink">
          EIN&rarr;BCN
        </span>
        <FareTag price={29} tier="steal" size="sm" />
        <Badge variant="steal" className="text-[8px]">
          STEAL
        </Badge>
      </div>
      <span className="font-mono text-[7px] font-semibold tracking-[0.13em] text-ink-muted">
        21 JUN &middot; 4 NTS
      </span>
    </div>
  );
}

type EquationCardProps = {
  title: string;
  result?: boolean;
  children: React.ReactNode;
  caption?: string;
};

function EquationCard({
  title,
  result = false,
  children,
  caption,
}: EquationCardProps) {
  return (
    <section
      className={`flex min-h-44 min-w-0 flex-col items-center justify-center rounded-(--radius-card) px-2.5 py-3 text-center ${
        result
          ? "border-2 border-brand bg-linear-to-br from-card via-card to-brand/10"
          : "border border-line bg-card"
      }`}
    >
      <div className="flex min-h-16 items-center justify-center">{children}</div>
      <h2 className="mt-2.5 font-display text-sm font-semibold leading-tight text-ink">
        {title}
      </h2>
      {caption && (
        <p className="mt-1 text-[10px] leading-snug text-ink-muted">
          {caption}
        </p>
      )}
    </section>
  );
}

function EquationMark({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-display text-2xl font-bold leading-none text-ink"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export default function CheckInStep() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted/80">
          How it works
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Open to go anywhere,
          <br />
          on any free day.
        </h1>
        <p className="mt-3 max-w-lg text-base text-ink-muted">
          Two minutes of setup, then{" "}
          <span className="mx-[0.25em] whitespace-nowrap font-display font-bold tracking-tight text-ink">
            <span
              aria-hidden="true"
              className="mr-[0.28em] inline-block h-[0.7em] w-[0.88em] rounded-[0.1em] bg-brand align-middle [clip-path:polygon(0%_0%,72%_0%,100%_50%,72%_100%,0%_100%)]"
            />
            Somewhere
          </span>{" "}
          quietly watches for cheap flights so you don&rsquo;t have to.
        </p>
      </header>

      <div className="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-2">
        <EquationCard
          title="Your free days"
          caption="And the airports you want to fly from."
        >
          <FreeDaysVignette />
        </EquationCard>

        <div className="flex items-center justify-center">
          <EquationMark>+</EquationMark>
        </div>

        <EquationCard title="Our daily price watch">
          <PriceWatchVignette />
        </EquationCard>

        <div className="flex items-center justify-center">
          <EquationMark>=</EquationMark>
        </div>

        <EquationCard title="A trip worth taking" result>
          <MatchedTripVignette />
        </EquationCard>
      </div>
    </div>
  );
}
