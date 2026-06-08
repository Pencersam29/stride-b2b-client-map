import { ClientStatus, STATUS_COLORS } from "@/types/client";

const STATUSES: { status: ClientStatus; label: string }[] = [
  { status: "Signed", label: "Signed" },
  { status: "In Pipeline", label: "In Pipeline" },
  { status: "Interested in Trial", label: "Interested in Trial" },
  { status: "Prospect", label: "Prospect" },
  { status: "Not Interested", label: "Not Interested" },
  { status: "On Hold", label: "On Hold" },
];

interface StatusLegendProps {
  activeFilter: ClientStatus | null;
  onFilterChange: (status: ClientStatus | null) => void;
}

export default function StatusLegend({
  activeFilter,
  onFilterChange,
}: StatusLegendProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid #E2E8F0",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
      }}
    >
      {STATUSES.map(({ status, label }) => {
        const isActive = activeFilter === status;
        const color = STATUS_COLORS[status];
        return (
          <button
            key={status}
            onClick={() => onFilterChange(isActive ? null : status)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
            style={{
              background: isActive ? color + "18" : "transparent",
              border: `1px solid ${isActive ? color + "60" : "transparent"}`,
              color: isActive ? color : "#94A3B8",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-all"
              style={{
                background: color,
                boxShadow: isActive ? `0 0 6px ${color}` : "none",
              }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
