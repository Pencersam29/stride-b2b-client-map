import { useMemo, useState } from "react";
import {
  Heart,
  Building2,
  PhoneCall,
  Snowflake,
  Flame,
  Users,
  TrendingUp,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
} from "lucide-react";
import {
  Client,
  ClientStatus,
  ClientType,
  LeadTemperature,
  STATUS_COLORS,
  isOverdue,
  isDueTodayOrOverdue,
  computePortfolioStats,
  formatMoney,
} from "@/types/client";
import ClientPopover from "./ClientPopover";

// Groups locations of the same business together (e.g. "Right at Home -
// Oshawa" and "Right at Home - Chicago" both group under "Right at Home").
function baseCompanyName(name: string): string {
  const idx = name.indexOf(" - ");
  return (idx !== -1 ? name.slice(0, idx) : name).trim();
}

function latestNotePreview(client: Client): string {
  const sorted = [...(client.notesLog ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted[0]?.text || client.notes || "";
}

interface PipelineBoardProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (client: Client | null) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onStatusChange: (clientId: string, status: ClientStatus) => void;
}

const COLUMNS: ClientStatus[] = [
  "Signed",
  "Interested in Trial",
  "Prospect",
  "Not Interested",
  "On Hold",
];

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PipelineBoard({
  clients,
  selectedClientId,
  onSelectClient,
  onEditClient,
  onDeleteClient,
  onStatusChange,
}: PipelineBoardProps) {
  const [typeFilter, setTypeFilter] = useState<ClientType | null>(null);
  const [tempFilter, setTempFilter] = useState<LeadTemperature | null>(null);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ClientStatus | null>(
    null
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const dueToday = useMemo(
    () =>
      clients
        .filter((c) => isDueTodayOrOverdue(c.nextFollowUpDate))
        .sort((a, b) =>
          (a.nextFollowUpDate ?? "").localeCompare(b.nextFollowUpDate ?? "")
        ),
    [clients]
  );

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        if (typeFilter && c.type !== typeFilter) return false;
        if (tempFilter && c.leadTemperature !== tempFilter) return false;
        if (followUpOnly && !isDueTodayOrOverdue(c.nextFollowUpDate))
          return false;
        if (
          searchQuery.trim() &&
          !c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
          return false;
        return true;
      }),
    [clients, typeFilter, tempFilter, followUpOnly, searchQuery]
  );

  const columns = useMemo(() => {
    const map = new Map<ClientStatus, Client[]>();
    for (const status of COLUMNS) map.set(status, []);
    for (const client of filtered) {
      map.get(client.status)?.push(client);
    }
    return map;
  }, [filtered]);

  // "Interested in Trial" groups multiple locations of the same business
  // together (e.g. every Cornerstone Caregiving location).
  const trialGroups = useMemo(() => {
    const trialCards = columns.get("Interested in Trial") ?? [];
    const map = new Map<string, Client[]>();
    for (const c of trialCards) {
      const key = baseCompanyName(c.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries());
  }, [columns]);

  const stats = useMemo(() => computePortfolioStats(clients), [clients]);
  const arrEntries = Object.entries(stats.arrByCurrency);

  return (
    <div className="min-h-full flex flex-col">
      {/* Stat bar */}
      <div className="grid grid-cols-3 gap-4 px-6 pt-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 size={13} style={{ color: "#94A3B8" }} />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Businesses Signed
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: "#0F172A", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.businessesSigned}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Users size={13} style={{ color: "#94A3B8" }} />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Total Clients
            </span>
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: "#0F172A", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.totalClients.toLocaleString()}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#CBD5E1" }}>
            across signed accounts
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp size={13} style={{ color: "#94A3B8" }} />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              ARR
            </span>
          </div>
          {arrEntries.length === 0 ? (
            <div
              className="text-2xl font-bold"
              style={{ color: "#0F172A", fontFamily: "'JetBrains Mono', monospace" }}
            >
              $0
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              {arrEntries.map(([currency, amount]) => (
                <span
                  key={currency}
                  className="text-2xl font-bold"
                  style={{ color: "#0F172A", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatMoney(amount, currency)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up banner */}
      {dueToday.length > 0 && (
        <div
          className="mx-6 mt-6 rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background: "rgba(251,113,133,0.08)",
            borderColor: "rgba(251,113,133,0.3)",
          }}
        >
          <PhoneCall size={16} style={{ color: "#FB7185" }} className="shrink-0" />
          <span
            className="text-sm font-semibold"
            style={{ color: "#9F1239", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            Follow up today ({dueToday.length})
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {dueToday.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectClient(c)}
                className="text-xs px-2 py-1 rounded-full transition-all hover:brightness-95"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(251,113,133,0.4)",
                  color: "#9F1239",
                  fontFamily: "Nunito, system-ui, sans-serif",
                }}
              >
                {c.name}
                {isOverdue(c.nextFollowUpDate) && (
                  <span className="ml-1" style={{ color: "#FB7185" }}>
                    · overdue
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFollowUpOnly((v) => !v)}
            className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium transition-all"
            style={{
              background: followUpOnly ? "#FB7185" : "#FFFFFF",
              color: followUpOnly ? "#FFFFFF" : "#9F1239",
              border: "1px solid rgba(251,113,133,0.4)",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
          >
            {followUpOnly ? "Showing follow-ups only" : "Show only these"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-2 flex-wrap">
        <div className="relative w-56 shrink-0">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40"
            style={{ color: "#94A3B8" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md outline-none transition-all"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              color: "#1E293B",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X size={11} style={{ color: "#94A3B8" }} />
            </button>
          )}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: "#E2E8F0" }} />

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
              onClick={() => setTypeFilter(value)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                fontFamily: "Nunito, system-ui, sans-serif",
                background: isActive ? "rgba(46,85,181,0.12)" : "#FFFFFF",
                border: `1px solid ${isActive ? "rgba(46,85,181,0.5)" : "#E2E8F0"}`,
                color: isActive ? "#2E55B5" : "#64748B",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}

        <div className="w-px h-5 mx-1" style={{ background: "#E2E8F0" }} />

        {(
          [
            { label: "All Leads", value: null, icon: null },
            { label: "Warm", value: "Warm" as LeadTemperature, icon: <Flame size={11} /> },
            { label: "Cold", value: "Cold" as LeadTemperature, icon: <Snowflake size={11} /> },
          ] as const
        ).map(({ label, value, icon }) => {
          const isActive = tempFilter === value;
          return (
            <button
              key={label}
              onClick={() => setTempFilter(value)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                fontFamily: "Nunito, system-ui, sans-serif",
                background: isActive ? "rgba(46,85,181,0.12)" : "#FFFFFF",
                border: `1px solid ${isActive ? "rgba(46,85,181,0.5)" : "#E2E8F0"}`,
                color: isActive ? "#2E55B5" : "#64748B",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}

        {followUpOnly && (
          <button
            onClick={() => setFollowUpOnly(false)}
            className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.5)",
              color: "#FB7185",
            }}
          >
            Follow-ups only ✕
          </button>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map((status) => {
            const cards = columns.get(status) ?? [];
            const color = STATUS_COLORS[status];
            const isOver = dragOverColumn === status;
            return (
              <div
                key={status}
                className="w-72 flex flex-col rounded-xl shrink-0"
                style={{
                  background: isOver ? "rgba(46,85,181,0.05)" : "#F1F5F9",
                  border: `1px solid ${isOver ? "rgba(46,85,181,0.4)" : "#E2E8F0"}`,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(status);
                }}
                onDragLeave={() => setDragOverColumn((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/client-id");
                  if (id) onStatusChange(id, status);
                  setDragOverColumn(null);
                  setDraggingId(null);
                }}
              >
                <div
                  className="flex items-center justify-between px-3 py-3 shrink-0"
                  style={{ borderBottom: "1px solid #E2E8F0" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-wide"
                      style={{ color: "#475569", fontFamily: "Nunito, system-ui, sans-serif" }}
                    >
                      {status}
                    </span>
                  </div>
                  <span
                    className="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "#FFFFFF",
                      color: "#64748B",
                      border: "1px solid #E2E8F0",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {cards.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
                  {status === "Interested in Trial"
                    ? trialGroups.map(([key, group]) =>
                        group.length > 1 ? (
                          <GroupedTrialCard
                            key={key}
                            name={key}
                            group={group}
                            isExpanded={expandedGroups.has(key)}
                            onToggle={() => toggleGroup(key)}
                            selectedClientId={selectedClientId}
                            draggingId={draggingId}
                            onDragStart={(client) => (e) => {
                              e.dataTransfer.setData("text/client-id", client.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingId(client.id);
                            }}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverColumn(null);
                            }}
                            onSelectClient={onSelectClient}
                          />
                        ) : (
                          <PipelineCard
                            key={group[0].id}
                            client={group[0]}
                            isSelected={selectedClientId === group[0].id}
                            isDragging={draggingId === group[0].id}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/client-id", group[0].id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingId(group[0].id);
                            }}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverColumn(null);
                            }}
                            onClick={() =>
                              onSelectClient(
                                selectedClientId === group[0].id ? null : group[0]
                              )
                            }
                          />
                        )
                      )
                    : cards.map((client) => (
                        <PipelineCard
                          key={client.id}
                          client={client}
                          isSelected={selectedClientId === client.id}
                          isDragging={draggingId === client.id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/client-id", client.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(client.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverColumn(null);
                          }}
                          onClick={() =>
                            onSelectClient(
                              selectedClientId === client.id ? null : client
                            )
                          }
                        />
                      ))}
                  {cards.length === 0 && (
                    <div
                      className="text-xs text-center py-6"
                      style={{ color: "#CBD5E1", fontFamily: "Nunito, system-ui, sans-serif" }}
                    >
                      No accounts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail popover */}
      {selectedClient && (
        <div
          className="fixed bottom-6 right-6 z-[500]"
          style={{ pointerEvents: "auto" }}
        >
          <ClientPopover
            client={selectedClient}
            onClose={() => onSelectClient(null)}
            onEdit={() => onEditClient(selectedClient)}
            onDelete={() => {
              onDeleteClient(selectedClient.id);
              onSelectClient(null);
            }}
            onStatusChange={(status) => onStatusChange(selectedClient.id, status)}
          />
        </div>
      )}
    </div>
  );
}

function PipelineCard({
  client,
  isSelected,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  client: Client;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const color = STATUS_COLORS[client.status];
  const overdue = isOverdue(client.nextFollowUpDate);

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 transition-all cursor-grab active:cursor-grabbing"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${isSelected ? color : "#E2E8F0"}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${color}30`
          : "0 1px 2px rgba(0,0,0,0.04)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className="text-sm font-semibold leading-tight"
          style={{ color: "#1E293B", fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {client.name}
        </span>
        {overdue && (
          <span
            className="w-2 h-2 rounded-full shrink-0 mt-1"
            style={{ background: "#FB7185", boxShadow: "0 0 4px #FB7185" }}
            title="Follow-up overdue"
          />
        )}
      </div>

      <div
        className="text-xs mb-2 truncate"
        style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        {client.contactName}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: "#F1F5F9",
            color: "#64748B",
            fontFamily: "Nunito, system-ui, sans-serif",
          }}
        >
          {client.type === "Homecare" ? <Heart size={9} /> : <Building2 size={9} />}
          {client.type === "Homecare" ? "Homecare" : "RH"}
        </span>
        <span
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: client.leadTemperature === "Warm" ? "#FEF3C7" : "#DBEAFE",
            color: client.leadTemperature === "Warm" ? "#B45309" : "#1D4ED8",
            fontFamily: "Nunito, system-ui, sans-serif",
          }}
        >
          {client.leadTemperature === "Warm" ? <Flame size={9} /> : <Snowflake size={9} />}
          {client.leadTemperature}
        </span>
      </div>

      {client.lastContactedDate && (
        <div
          className="text-[10px] mt-2"
          style={{ color: "#CBD5E1", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Last contact: {formatDate(client.lastContactedDate)}
        </div>
      )}

      {client.status === "Signed" &&
        client.contractedClientCount != null &&
        client.contractPriceMonthly != null && (
          <div
            className="text-[10px] mt-1.5 pt-1.5"
            style={{
              color: "#34D399",
              fontFamily: "'JetBrains Mono', monospace",
              borderTop: "1px dashed #E2E8F0",
            }}
          >
            {client.contractedClientCount.toLocaleString()} clients ·{" "}
            {formatMoney(client.contractPriceMonthly, client.contractCurrency || "USD")}/mo
          </div>
        )}
    </button>
  );
}

function GroupedTrialCard({
  name,
  group,
  isExpanded,
  onToggle,
  selectedClientId,
  draggingId,
  onDragStart,
  onDragEnd,
  onSelectClient,
}: {
  name: string;
  group: Client[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedClientId: string | null;
  draggingId: string | null;
  onDragStart: (client: Client) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onSelectClient: (client: Client | null) => void;
}) {
  const color = STATUS_COLORS["Interested in Trial"];
  const anyOverdue = group.some((c) => isOverdue(c.nextFollowUpDate));
  const type = group[0].type;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #E2E8F0", background: "#FFFFFF" }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-3 transition-all hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span
            className="text-sm font-semibold leading-tight"
            style={{ color: "#1E293B", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {name}
          </span>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {anyOverdue && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#FB7185", boxShadow: "0 0 4px #FB7185" }}
                title="A location has an overdue follow-up"
              />
            )}
            {isExpanded ? (
              <ChevronUp size={12} style={{ color: "#94A3B8" }} />
            ) : (
              <ChevronDown size={12} style={{ color: "#94A3B8" }} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "#F1F5F9", color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {type === "Homecare" ? <Heart size={9} /> : <Building2 size={9} />}
            {type === "Homecare" ? "Homecare" : "RH"}
          </span>
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: color + "18", color, fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {group.length} locations
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          className="space-y-1.5 p-2 pt-0"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          {group.map((client) => {
            const isSelected = selectedClientId === client.id;
            const overdue = isOverdue(client.nextFollowUpDate);
            const note = latestNotePreview(client);
            return (
              <button
                key={client.id}
                draggable
                onDragStart={onDragStart(client)}
                onDragEnd={onDragEnd}
                onClick={() => onSelectClient(isSelected ? null : client)}
                className="w-full text-left rounded-md p-2 transition-all cursor-grab active:cursor-grabbing"
                style={{
                  background: isSelected ? "rgba(46,85,181,0.05)" : "#F8FAFC",
                  border: `1px solid ${isSelected ? "#2E55B5" : "#E2E8F0"}`,
                  opacity: draggingId === client.id ? 0.4 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <User size={10} style={{ color: "#94A3B8" }} className="shrink-0" />
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: "#334155", fontFamily: "Nunito, system-ui, sans-serif" }}
                    >
                      {client.contactName}
                    </span>
                  </div>
                  {overdue && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#FB7185" }}
                      title="Follow-up overdue"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={9} style={{ color: "#CBD5E1" }} className="shrink-0" />
                  <span
                    className="text-[10px] truncate"
                    style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
                  >
                    {client.city}
                    {client.provinceState ? `, ${client.provinceState}` : ""}
                  </span>
                </div>
                {note && (
                  <p
                    className="text-[10px] mt-1 truncate italic"
                    style={{ color: "#B0B9C6", fontFamily: "Nunito, system-ui, sans-serif" }}
                  >
                    "{note}"
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
