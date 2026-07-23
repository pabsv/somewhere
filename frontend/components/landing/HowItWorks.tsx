import Link from "next/link";
import Badge from "@/components/ui/Badge";
import FareTag from "@/components/ui/FareTag";

const calendarDays = [
  "empty",
  "empty",
  "empty",
  "empty",
  "empty",
  "solid",
  "solid",
  "empty",
  "soft",
  "soft",
  "soft",
  "solid",
  "solid",
  "solid",
  "empty",
  "empty",
  "empty",
  "empty",
  "empty",
  "solid",
  "empty",
] as const;

const dayStyles = {
  empty: "bg-line/60",
  soft: "bg-brand/25",
  solid: "bg-brand",
};

const watchedFares = [
  ["EIN→BCN", "€38"],
  ["AMS→FCO", "€52"],
  ["BRU→OPO", "€41"],
] as const;

const groupAvailability = [
  {
    label: "YOU",
    labelClass: "text-ink-muted",
    days: ["empty", "free", "free", "free", "empty", "free", "free"],
  },
  {
    label: "ANA",
    labelClass: "text-ink-muted",
    days: ["free", "free", "free", "empty", "empty", "free", "free"],
  },
  {
    label: "ALL",
    labelClass: "text-steal",
    days: ["empty", "empty", "empty", "empty", "empty", "shared", "shared"],
  },
] as const;

const groupDayStyles = {
  empty: "bg-line/60",
  free: "bg-brand",
  shared: "bg-steal",
};

function FreeDaysVignette() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-7 gap-[3px]"
    >
      {calendarDays.map((day, index) => (
        <span
          key={`${day}-${index}`}
          className={`size-4 rounded-[3px] ${dayStyles[day]}`}
        />
      ))}
    </div>
  );
}

function PriceWatchVignette() {
  return (
    <div
      aria-hidden="true"
      className="w-[186px] overflow-hidden rounded-lg bg-night shadow-sm"
    >
      <div className="h-[3px] bg-brand" />
      {watchedFares.map(([route, price], index) => (
        <div
          key={route}
          className={`flex items-center justify-between px-2.5 py-1.5 font-mono text-[9px] text-paper ${
            index < watchedFares.length - 1
              ? "border-b border-white/10"
              : ""
          }`}
        >
          <span className="font-medium tracking-[0.1em]">{route}</span>
          <span className="tnum font-semibold">{price}</span>
        </div>
      ))}
    </div>
  );
}

function MatchedTripVignette() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium tracking-[0.06em] text-ink">
          EIN→BCN
        </span>
        <FareTag price={29} tier="steal" size="sm" className="px-2.5 py-0.5" />
        <Badge variant="steal" className="text-[9px]">
          STEAL
        </Badge>
      </div>
      <span className="font-mono text-[9px] font-medium tracking-[0.14em] text-ink-muted">
        21 JUN · 4 NTS · ROUND TRIP
      </span>
    </div>
  );
}

function GroupAvailabilityVignette() {
  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 grid-cols-[auto_repeat(7,14px)] items-center gap-[3px]"
    >
      {groupAvailability.map((row) => (
        <div key={row.label} className="contents">
          <span
            className={`pr-[5px] font-mono text-[8px] font-semibold ${row.labelClass}`}
          >
            {row.label}
          </span>
          {row.days.map((day, index) => (
            <span
              key={`${row.label}-${index}`}
              className={`size-[14px] rounded-[3px] ${groupDayStyles[day]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type StepProps = {
  title: string;
  caption: string;
  result?: boolean;
  children: React.ReactNode;
};

function Step({ title, caption, result = false, children }: StepProps) {
  return (
    <div className="w-full text-center">
      <div
        className={`flex h-[92px] items-center justify-center rounded-[var(--radius-card)] bg-card sm:h-[120px] ${
          result
            ? "border-2 border-brand shadow-card"
            : "border border-line"
        }`}
      >
        {children}
      </div>
      <h3 className="mt-2 font-display text-[15px] font-semibold text-ink sm:mt-4 sm:text-[17px]">
        {title}
      </h3>
      <p className="mx-auto mt-0.5 max-w-[230px] text-[12.5px] leading-snug text-ink-muted sm:mt-1 sm:text-[13.5px] sm:leading-relaxed">
        {caption}
      </p>
    </div>
  );
}

function EquationMark({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="hidden font-display font-bold leading-none text-ink sm:-my-1 sm:mb-16 sm:block sm:text-4xl"
    >
      {children}
    </span>
  );
}

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-20 sm:mt-24">
      <header className="text-center">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted/70">
          How it works
        </p>
        <h2
          id="how-heading"
          className="mt-2 font-display text-3xl font-bold tracking-tight text-ink"
        >
          Flight search, backwards.
        </h2>
      </header>

      <div className="mt-6 flex flex-col items-center gap-2.5 sm:mt-10 sm:grid sm:gap-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Step
          title="Your free days"
          caption="Paint them once in 2 minutes."
        >
          <FreeDaysVignette />
        </Step>

        <EquationMark>+</EquationMark>

        <Step
          title="Our daily price watch"
          caption="1,000+ routes from your airports, swept every day."
        >
          <PriceWatchVignette />
        </Step>

        <EquationMark>=</EquationMark>

        <Step
          title="A trip you say yes to"
          caption="Receive great deals when you are free."
          result
        >
          <MatchedTripVignette />
        </Step>
      </div>

      <div className="mt-9 flex flex-col items-start gap-5 rounded-[var(--radius-card)] border border-line bg-card p-5 sm:flex-row sm:items-center sm:gap-7 sm:px-6">
        <GroupAvailabilityVignette />

        <p className="text-sm leading-relaxed text-ink-muted">
          <strong className="font-semibold text-ink">Going with friends?</strong>{" "}
          Add them, and we intersect everyone&rsquo;s free days. And find great
          deals when everyone is free.
        </p>

        <Link
          href="/register"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90 sm:ml-auto sm:w-auto"
        >
          Try it
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
