import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Heart,
  MapPin,
  User,
} from "lucide-react";
import { Client, ClientStatus, ClientType, STATUS_COLORS } from "@/types/client";

interface SidebarProps {
  clients: Client[];
  activeFilter: ClientStatus | null;
  onFilterChange: (status: ClientStatus | null) => void;
  typeFilter: ClientType | null;
  onTypeFilterChange: (type: ClientType | null) => void;
  onClientSelect: (client: Client) => void;
  selectedClientId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const STATUSES: ClientStatus[] = [
  "Signed",
  "In Pipeline",
  "Prospect",
  "Not Interested",
  "On Hold",
];

export default function Sidebar({
  clients,
  activeFilter,
  onFilterChange,
  typeFilter,
  onTypeFilterChange,
  onClientSelect,
  selectedClientId,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const filtered = clients.filter((c) => {
    if (activeFilter && c.status !== activeFilter) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });

  return (
    <div
      className="fixed top-23 bottom-0 left-0 z-30 flex flex-col transition-all duration-300"
      style={{
        width: isCollapsed ? "0px" : "320px",
        top: "88px",
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-4 top-4 z-50 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:brightness-125"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          color: "#64748B",
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!isCollapsed && (
        <>
          {/* Sidebar header */}
          <div
            className="px-4 pt-4 pb-3 shrink-0"
            style={{ borderBottom: "1px solid #E2E8F0" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-bold tracking-wide uppercase"
                style={{
                  color: "#475569",
                  fontFamily: "Syne, sans-serif",
                  letterSpacing: "0.08em",
                }}
              >
                Accounts
              </h2>
              <span
                className="text-xs tabular-nums px-2 py-0.5 rounded-full"
                style={{
                  background: "#F1F5F9",
                  color: "#00E5CC",
                  fontFamily: "'JetBrains Mono', monospace",
                  border: "1px solid #E2E8F0",
                }}
              >
                {filtered.length}
              </span>
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5 mb-2">
              {([
                { label: "All", icon: null, value: null },
                { label: "Homecare", icon: <Heart size={10} />, value: "Homecare" as ClientType },
                { label: "RH", icon: <Building2 size={10} />, value: "Retirement Home" as ClientType },
              ] as const).map(({ label, icon, value }) => {
                const isActive = typeFilter === value;
                return (
                  <button
                    key={label}
                    onClick={() => onTypeFilterChange(value)}
                    className="flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all"
                    style={{
                      background: isActive ? "rgba(0,229,204,0.1)" : "#F8FAFC",
                      border: `1px solid ${isActive ? "rgba(0,229,204,0.3)" : "#E2E8F0"}`,
                      color: isActive ? "#00E5CC" : "#64748B",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {icon}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Status filter dots */}
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map((status) => {
                const isActive = activeFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => onFilterChange(isActive ? null : status)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
                    style={{
                      background: isActive
                        ? STATUS_COLORS[status] + "18"
                        : "#F8FAFC",
                      border: `1px solid ${isActive ? STATUS_COLORS[status] + "60" : "#E2E8F0"}`,
                      color: isActive ? STATUS_COLORS[status] : "#4A5568",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[status] }}
                    />
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <MapPin size={20} style={{ color: "#CBD5E1" }} />
                <p
                  className="text-xs"
                  style={{ color: "#4A5568", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  No clients match filters
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filtered.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    isSelected={selectedClientId === client.id}
                    onClick={() => onClientSelect(client)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClientCard({
  client,
  isSelected,
  onClick,
}: {
  client: Client;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color = STATUS_COLORS[client.status];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-stretch text-left transition-all group"
      style={{
        background: isSelected ? "rgba(0,229,204,0.05)" : "transparent",        borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
      }}
    >
      {/* Color bar */}
      <div
        className="w-0.5 shrink-0 transition-all"
        style={{
          background: color,
          opacity: isSelected ? 1 : 0.3,
        }}
      />

      <div className="flex-1 px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span
            className="text-sm font-semibold leading-tight"
            style={{
              color: isSelected ? "#1E293B" : "#475569",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {client.name}
          </span>
          <span
            className="text-xs shrink-0 px-1.5 py-0.5 rounded"
            style={{
              background: color + "18",
              color: color,
              fontFamily: "Space Grotesk, sans-serif",
              border: `1px solid ${color}30`,
            }}
          >
            {client.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {client.type === "Homecare" ? (
              <Heart size={10} style={{ color: "#94A3B8" }} />
            ) : (
              <Building2 size={10} style={{ color: "#94A3B8" }} />
            )}
            <span
              className="text-xs"
              style={{ color: "#94A3B8", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {client.type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={10} style={{ color: "#94A3B8" }} />
            <span
              className="text-xs"
              style={{ color: "#94A3B8", fontFamily: "Space Grotesk, sans-serif" }}
            >
              {client.address ? `${client.address}, ` : ""}{client.city}, {client.provinceState}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <User size={10} style={{ color: "#CBD5E1" }} />
          <span
            className="text-xs truncate"
            style={{ color: "#CBD5E1", fontFamily: "Space Grotesk, sans-serif" }}
          >
            {client.contactName}
          </span>
        </div>
      </div>
    </button>
  );
}
