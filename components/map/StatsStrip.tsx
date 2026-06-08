import { Client, ClientType, STATUS_COLORS } from "@/types/client";
import { Heart, Building2 } from "lucide-react";

interface StatsStripProps {
  clients: Client[];
  typeFilter: ClientType | null;
}

export default function StatsStrip({ clients, typeFilter }: StatsStripProps) {
  const scoped = typeFilter ? clients.filter((c) => c.type === typeFilter) : clients;

  const homecare = clients.filter((c) => c.type === "Homecare").length;
  const retirement = clients.filter((c) => c.type === "Retirement Home").length;

  const total = scoped.length;
  const interestedInTrial = scoped.filter((c) => c.status === "Interested in Trial").length;
  const signed = scoped.filter((c) => c.status === "Signed").length;
  const inPipeline = scoped.filter((c) => c.status === "In Pipeline").length;
  const prospects = scoped.filter((c) => c.status === "Prospect").length;

  const stats = [
    { label: typeFilter ? typeFilter : "Total Accounts", value: total, color: "#2E55B5" },
    { label: "Interested in Trial", value: interestedInTrial, color: STATUS_COLORS["Interested in Trial"] },
    { label: "Signed", value: signed, color: STATUS_COLORS["Signed"] },
    { label: "In Pipeline", value: inPipeline, color: STATUS_COLORS["In Pipeline"] },
    { label: "Prospects", value: prospects, color: STATUS_COLORS["Prospect"] },
  ];

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 flex items-center px-5 h-9 gap-1"
      style={{
        background: "#F8FAFC",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      {/* Type breakdown chips */}
      <div className="flex items-center gap-1 mr-3">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{
            background: typeFilter === "Homecare" ? "rgba(46,85,181,0.08)" : "#F1F5F9",
            border: `1px solid ${typeFilter === "Homecare" ? "rgba(46,85,181,0.3)" : "#E2E8F0"}`,
            color: typeFilter === "Homecare" ? "#2E55B5" : "#64748B",
            fontFamily: "Nunito, system-ui, sans-serif",
          }}
        >
          <Heart size={9} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {String(homecare).padStart(2, "0")}
          </span>
          <span className="ml-0.5">HC</span>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{
            background: typeFilter === "Retirement Home" ? "rgba(46,85,181,0.08)" : "#F1F5F9",
            border: `1px solid ${typeFilter === "Retirement Home" ? "rgba(46,85,181,0.3)" : "#E2E8F0"}`,
            color: typeFilter === "Retirement Home" ? "#2E55B5" : "#64748B",
            fontFamily: "Nunito, system-ui, sans-serif",
          }}
        >
          <Building2 size={9} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {String(retirement).padStart(2, "0")}
          </span>
          <span className="ml-0.5">RH</span>
        </div>
        <div className="w-px h-3 mx-2" style={{ background: "#E2E8F0" }} />
      </div>

      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-2">
          {i > 0 && (
            <div className="w-px h-3 mx-3" style={{ background: "#E2E8F0" }} />
          )}
          <span
            className="text-xs"
            style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {stat.label}
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {String(stat.value).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
