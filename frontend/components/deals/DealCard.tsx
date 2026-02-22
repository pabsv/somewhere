import { Deal } from "@/types";

interface DealCardProps {
  deal: Deal;
}

export default function DealCard({ deal }: DealCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const days = Math.ceil(
    (new Date(deal.return_date).getTime() - new Date(deal.outbound_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <a
      href={deal.azair_link}
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
          {deal.is_hot_deal && (
            <div className="text-xs text-emerald-600 font-medium">HOT</div>
          )}
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
