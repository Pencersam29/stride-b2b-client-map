import { useState } from "react";
import {
  X,
  Edit2,
  Trash2,
  Mail,
  User,
  MapPin,
  Building2,
  Heart,
  Phone,
  Flame,
  Snowflake,
  CalendarClock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Client,
  ClientStatus,
  STATUS_COLORS,
  isOverdue,
  clientARR,
  formatMoney,
} from "@/types/client";
import { DollarSign, Users } from "lucide-react";

interface ClientPopoverProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ClientStatus) => void;
}

const STATUSES: ClientStatus[] = [
  "Prospect",
  "In Pipeline",
  "Interested in Trial",
  "Signed",
  "Not Interested",
  "On Hold",
];

export default function ClientPopover({
  client,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: ClientPopoverProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const color = STATUS_COLORS[client.status];
  const overdue = isOverdue(client.nextFollowUpDate);
  const sortedNotes = [...(client.notesLog ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const visibleNotes = showAllNotes ? sortedNotes : sortedNotes.slice(0, 3);

  return (
    <div
      className="w-72 rounded-xl overflow-hidden shadow-2xl"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${color}40`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px ${color}20`,
      }}
    >
      {/* Header with color accent */}
      <div
        className="px-4 pt-4 pb-3 relative"
        style={{ borderBottom: "1px solid #E2E8F0" }}
      >
        {/* Status accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-bold leading-tight truncate"
              style={{ color: "#E2E8F0", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              {client.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {client.type === "Homecare" ? (
                <Heart size={10} style={{ color: "#4A5568" }} />
              ) : (
                <Building2 size={10} style={{ color: "#4A5568" }} />
              )}
              <span
                className="text-xs"
                style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {client.type}
              </span>
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ml-1"
                style={{
                  background: client.leadTemperature === "Warm" ? "#FEF3C7" : "#DBEAFE",
                  color: client.leadTemperature === "Warm" ? "#B45309" : "#1D4ED8",
                  fontFamily: "Nunito, system-ui, sans-serif",
                }}
              >
                {client.leadTemperature === "Warm" ? (
                  <Flame size={9} />
                ) : (
                  <Snowflake size={9} />
                )}
                {client.leadTemperature}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:bg-white/10 shrink-0"
            style={{ color: "#4A5568" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="px-4 py-3 space-y-2">
        <InfoRow icon={<MapPin size={12} />} label="Location">
          {client.address ? `${client.address}, ` : ""}{client.city}, {client.provinceState}, {client.country}
        </InfoRow>
        <InfoRow icon={<User size={12} />} label="Contact">
          {client.contactName}
        </InfoRow>
        {client.contactEmail && (
          <InfoRow icon={<Mail size={12} />} label="Email">
            <a
              href={`mailto:${client.contactEmail}`}
              className="transition-colors hover:underline"
              style={{ color: "#38BDF8" }}
            >
              {client.contactEmail}
            </a>
          </InfoRow>
        )}
        {client.phoneCell && (
          <InfoRow icon={<Phone size={12} />} label="Cell (C)">
            <a
              href={`tel:${client.phoneCell}`}
              className="transition-colors hover:underline"
              style={{ color: "#38BDF8" }}
            >
              {client.phoneCell}
            </a>
          </InfoRow>
        )}
        {client.phoneWork && (
          <InfoRow icon={<Phone size={12} />} label="Work (W)">
            <a
              href={`tel:${client.phoneWork}`}
              className="transition-colors hover:underline"
              style={{ color: "#38BDF8" }}
            >
              {client.phoneWork}
            </a>
          </InfoRow>
        )}
        {client.leadSource && (
          <InfoRow icon={<User size={12} />} label="Lead Source">
            {client.leadSource}
          </InfoRow>
        )}
        {(client.lastContactedDate || client.nextFollowUpDate) && (
          <InfoRow icon={<CalendarClock size={12} />} label="Follow-up">
            <span className="flex items-center gap-1.5 flex-wrap">
              {client.lastContactedDate && (
                <span>Last contacted {client.lastContactedDate}</span>
              )}
              {client.nextFollowUpDate && (
                <span
                  className="inline-flex items-center gap-1"
                  style={overdue ? { color: "#FB7185" } : undefined}
                >
                  {client.lastContactedDate && "·"} Next: {client.nextFollowUpDate}
                  {overdue && (
                    <span
                      className="text-[9px] font-bold px-1 py-px rounded"
                      style={{ background: "rgba(251,113,133,0.15)", color: "#FB7185" }}
                    >
                      OVERDUE
                    </span>
                  )}
                </span>
              )}
            </span>
          </InfoRow>
        )}
      </div>

      {/* Status selector */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid #1E2533" }}
      >
        <p
          className="text-xs mb-2"
          style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          Status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const isActive = client.status === s;
            const sc = STATUS_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className="text-xs px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: isActive ? sc + "22" : "#0E1117",
                  border: `1px solid ${isActive ? sc : "#1E2533"}`,
                  color: isActive ? sc : "#4A5568",
                  fontFamily: "Nunito, system-ui, sans-serif",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contract terms (Signed accounts) */}
      {client.status === "Signed" &&
        (client.contractedClientCount != null || client.contractPriceMonthly != null) && (
          <div
            className="px-4 py-3"
            style={{ borderTop: "1px solid #1E2533" }}
          >
            <p
              className="text-xs mb-2"
              style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Contract
            </p>
            <div className="space-y-2">
              {client.contractedClientCount != null && (
                <InfoRow icon={<Users size={12} />} label="Clients Agreed To">
                  {client.contractedClientCount.toLocaleString()}
                </InfoRow>
              )}
              {client.contractPriceMonthly != null && (
                <InfoRow icon={<DollarSign size={12} />} label="Price">
                  {formatMoney(client.contractPriceMonthly, client.contractCurrency || "USD")}
                  {" "}
                  / client / month
                </InfoRow>
              )}
              {clientARR(client) != null && (
                <InfoRow icon={<DollarSign size={12} />} label="ARR">
                  <span style={{ color: "#34D399", fontWeight: 600 }}>
                    {formatMoney(clientARR(client)!, client.contractCurrency || "USD")}
                  </span>
                </InfoRow>
              )}
            </div>
          </div>
        )}

      {/* Notes */}
      {client.notes && (
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid #1E2533" }}
        >
          <p
            className="text-xs mb-1"
            style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            Notes
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {client.notes}
          </p>
        </div>
      )}

      {/* Activity log */}
      {sortedNotes.length > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid #1E2533" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p
              className="text-xs"
              style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Activity Log
            </p>
            {sortedNotes.length > 3 && (
              <button
                onClick={() => setShowAllNotes((v) => !v)}
                className="flex items-center gap-0.5 text-[10px]"
                style={{ color: "#38BDF8", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {showAllNotes ? "Show less" : `Show all (${sortedNotes.length})`}
                {showAllNotes ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleNotes.map((entry, i) => (
              <div key={i} className="text-xs">
                <span
                  className="block"
                  style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  {new Date(entry.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span
                  className="leading-relaxed"
                  style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  {entry.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {!showDeleteConfirm ? (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderTop: "1px solid #1E2533" }}
        >
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all hover:bg-white/5"
            style={{
              border: "1px solid #1E2533",
              color: "#64748B",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
          >
            <Edit2 size={12} />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-all hover:bg-rose-500/10"
            style={{
              border: "1px solid rgba(251,113,133,0.2)",
              color: "#FB7185",
              fontFamily: "Nunito, system-ui, sans-serif",
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      ) : (
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid #1E2533" }}
        >
          <p
            className="text-xs text-center mb-3"
            style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            Delete this client permanently?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-1.5 text-xs rounded-md transition-colors hover:bg-white/5"
              style={{
                border: "1px solid #1E2533",
                color: "#64748B",
                fontFamily: "Nunito, system-ui, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-1.5 text-xs rounded-md font-semibold transition-all hover:brightness-110"
              style={{
                background: "#FB7185",
                color: "#0E1117",
                fontFamily: "Nunito, system-ui, sans-serif",
              }}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span style={{ color: "#4A5568", marginTop: "1px" }}>{icon}</span>
      <div>
        <span
          className="text-xs block"
          style={{ color: "#4A5568", fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {label}
        </span>
        <span
          className="text-xs"
          style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
