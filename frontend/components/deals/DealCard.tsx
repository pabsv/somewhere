import { Deal } from "@/types";
import { getSearchUrl } from "@/lib/api";

interface DealCardProps {
  deal: Deal;
}

// Parse YYYY-MM-DD as local date (not UTC midnight, which shifts the date for UTC+X users)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function DealCard({ deal }: DealCardProps) {
  const formatDate = (dateStr: string) => {
    return parseLocalDate(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const days = Math.ceil(
    (parseLocalDate(deal.return_date).getTime() - parseLocalDate(deal.outbound_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <a
      href={getSearchUrl(deal)}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-neutral-200 p-4 hover:border-neutral-400 transition-colors"
    >
      {/* Header: Route + Price */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
            <span>{deal.origin}</span>
            <span className="text-neutral-400">→</span>
            <span>{deal.destination}</span>
          </div>
          <div className="text-sm text-neutral-500">{deal.destination_city}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-neutral-900">
            €{deal.price}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span>
          {formatDate(deal.outbound_date)} – {formatDate(deal.return_date)}
        </span>
        <span>·</span>
        <span>{days}d</span>
        <span>·</span>
        <span>{deal.is_direct ? "Direct" : "1 stop"}</span>
        <span>·</span>
        <span>{deal.airline}</span>
      </div>
    </a>
  );
}
