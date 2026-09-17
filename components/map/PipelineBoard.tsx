import { useMemo, useState } from "react";
import { Heart, Building2, PhoneCall, Snowflake, Flame } from "lucide-react";
import {
  Client,
  ClientStatus,
  ClientType,
  LeadTemperature,
  STATUS_COLORS,
  isOverdue,
  isDueTodayOrOverdue,
} from "@/types/client";
import ClientPopover from "./ClientPopover";

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
  "In Pipeline",
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ClientStatus | null>(
    null
  );

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
        return true;
      }),
    [clients, typeFilter, tempFilter, followUpOnly]
  );

  const columns = useMemo(() => {
    const map = new Map<ClientStatus, Client[]>();
    for (const status of COLUMNS) map.set(status, []);
    for (const client of filtered) {
      map.get(client.status)?.push(client);
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-full flex flex-col">
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
                  {cards.map((client) => (
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
    </button>
  );
}
