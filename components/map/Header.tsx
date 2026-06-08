import { Search, Plus, X, Heart, Building2, Map, LayoutDashboard } from "lucide-react";
import { Client, ClientStatus, ClientType, STATUS_COLORS } from "@/types/client";

interface HeaderProps {
  clients: Client[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: ClientStatus | null;
  onFilterChange: (status: ClientStatus | null) => void;
  typeFilter: ClientType | null;
  onTypeFilterChange: (type: ClientType | null) => void;
  onAddClient: () => void;
  onSearchSelect: (client: Client) => void;
  activeView: "map" | "command";
  onViewChange: (view: "map" | "command") => void;
}

const STATUSES: ClientStatus[] = [
  "Signed",
  "In Pipeline",
  "Interested in Trial",
  "Prospect",
  "Not Interested",
  "On Hold",
];

export default function Header({
  clients,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  typeFilter,
  onTypeFilterChange,
  onAddClient,
  onSearchSelect,
  activeView,
  onViewChange,
}: HeaderProps) {
  const searchResults =
    searchQuery.length > 1
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex flex-col"
      style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
    >
      {/* Top row */}
      <div className="flex items-center gap-4 px-5 h-14">
        {/* Brand mark (otter only) */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/stride-otter.png"
            alt="Stride"
            className="h-8 w-auto select-none"
            draggable={false}
          />
          <div className="flex flex-col leading-none">
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: "Nunito, system-ui, sans-serif", color: "#2E55B5" }}
            >
              Stride
            </span>
            <span
              className="text-[10px] font-medium tracking-[0.14em] uppercase mt-0.5"
              style={{ fontFamily: "Nunito, system-ui, sans-serif", color: "#94A3B8" }}
            >
              {activeView === "command" ? "Command" : "Client Map"}
            </span>
          </div>
        </div>

        {/* View Toggle */}
        <div
          className="flex items-center rounded-full p-0.5 shrink-0"
          style={{
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
          }}
        >
          {(["map", "command"] as const).map((view) => {
            const isActive = activeView === view;
            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  fontFamily: "Nunito, system-ui, sans-serif",
                  background: isActive ? "#FFFFFF" : "transparent",
                  color: isActive ? "#0F172A" : "#94A3B8",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {view === "map" ? <Map size={12} /> : <LayoutDashboard size={12} />}
                {view === "map" ? "Map View" : "Command Center"}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div
          className="w-px h-6 shrink-0"
          style={{ background: "#E2E8F0", display: activeView === "command" ? "none" : undefined }}
        />

        {activeView === "map" && (
          <>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
            style={{ color: "#94A3B8" }}
          />
          <input
            type="text"
            placeholder="Search clients or cities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md outline-none transition-all"
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              color: "#1E293B",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "rgba(46,85,181,0.4)")
            }
            onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X size={12} style={{ color: "#94A3B8" }} />
            </button>
          )}

          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-md overflow-hidden z-50 shadow-2xl"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            >
              {searchResults.slice(0, 5).map((client) => (
                <button
                  key={client.id}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  onClick={() => {
                    onSearchSelect(client);
                    onSearchChange("");
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: STATUS_COLORS[client.status] }}
                  />
                  <span
                    className="text-sm"
                    style={{
                      color: "#1E293B",
                      fontFamily: "Nunito, system-ui, sans-serif",
                    }}
                  >
                    {client.name}
                  </span>
                  <span
                    className="text-xs ml-auto"
                    style={{ color: "#94A3B8" }}
                  >
                    {client.city}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length > 1 && searchResults.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-md p-3 z-50"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            >
              <p
                className="text-xs text-center"
                style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                No clients found
              </p>
            </div>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1 shrink-0">
          {(
            [
              { label: "All", value: null, icon: null },
              { label: "Homecare", value: "Homecare" as ClientType, icon: <Heart size={11} /> },
              { label: "Retirement Home", value: "Retirement Home" as ClientType, icon: <Building2 size={11} /> },
            ] as const
          ).map(({ label, value, icon }) => {
            const isActive = typeFilter === value;
            return (
              <button
                key={label}
                onClick={() => onTypeFilterChange(value)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  fontFamily: "Nunito, system-ui, sans-serif",
                  background: isActive ? "rgba(46,85,181,0.12)" : "#F8FAFC",
                  border: `1px solid ${isActive ? "rgba(46,85,181,0.5)" : "#E2E8F0"}`,
                  color: isActive ? "#2E55B5" : "#64748B",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: "#E2E8F0" }} />

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-1">
          {STATUSES.map((status) => {
            const isActive = activeFilter === status;
            return (
              <button
                key={status}
                onClick={() => onFilterChange(isActive ? null : status)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  fontFamily: "Nunito, system-ui, sans-serif",
                  background: isActive
                    ? STATUS_COLORS[status] + "22"
                    : "#F8FAFC",
                  border: `1px solid ${isActive ? STATUS_COLORS[status] : "#E2E8F0"}`,
                  color: isActive ? STATUS_COLORS[status] : "#64748B",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: STATUS_COLORS[status] }}
                />
                {status}
              </button>
            );
          })}
        </div>

        {/* Add Client CTA */}
        <button
          onClick={onAddClient}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold shrink-0 transition-all hover:brightness-110 active:scale-95"
          style={{
            background: "#2E55B5",
            color: "#FFFFFF",
            fontFamily: "Nunito, system-ui, sans-serif",
            boxShadow: "0 0 16px rgba(46,85,181,0.35)",
          }}
        >
          <Plus size={14} />
          Add Client
        </button>
          </>
        )}
      </div>
    </header>
  );
}
