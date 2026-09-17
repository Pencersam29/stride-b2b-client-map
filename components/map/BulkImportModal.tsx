import { useRef, useState } from "react";
import { X, Loader2, AlertCircle, UploadCloud, Trash2, CheckCircle2 } from "lucide-react";
import { Client, ClientStatus, ClientType } from "@/types/client";
import { supabase } from "@/lib/supabase";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: Omit<Client, "id" | "createdAt">[]) => Promise<void>;
}

interface PreviewRow {
  key: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phoneCell: string;
  phoneWork: string;
  rawAddress: string;
  address: string;
  city: string;
  provinceState: string;
  country: string;
  type: ClientType;
  leadTemperature: "Warm" | "Cold";
  status: ClientStatus;
  skip: boolean;
  error: string | null;
  geocoding: boolean;
  geocoded: boolean;
}

const CA_PROVINCES = new Set([
  "ON", "BC", "AB", "QC", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU",
]);

const CLIENT_TYPES: ClientType[] = ["Homecare", "Retirement Home"];
const STATUSES: ClientStatus[] = [
  "Prospect",
  "In Pipeline",
  "Interested in Trial",
  "Signed",
  "Not Interested",
  "On Hold",
];

function splitAddress(raw: string): { address: string; city: string; provinceState: string; country: string } {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const provinceState = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    const address = parts.slice(0, parts.length - 2).join(", ");
    const country = CA_PROVINCES.has(provinceState.toUpperCase()) ? "Canada" : "USA";
    return { address, city, provinceState, country };
  }
  if (parts.length === 2) {
    const country = CA_PROVINCES.has(parts[1].toUpperCase()) ? "Canada" : "USA";
    return { address: "", city: parts[0], provinceState: parts[1], country };
  }
  return { address: "", city: parts[0] ?? raw, provinceState: "", country: "Canada" };
}

function parseDelimited(text: string): string[][] {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    if (delimiter === "\t") return line.split("\t").map((c) => c.trim());
    // simple CSV split supporting quoted fields
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  });
}

function normalizeCategory(raw: string): ClientType {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("retirement") || v === "rh") return "Retirement Home";
  return "Homecare";
}

// Columns are always: Company, Contact Name, Email, Cell, Work Phone, Address, Category.
// The Address itself commonly contains commas (street, city, ST), so rather than
// mapping by a fixed column index we take the first 5 fields as-is, the LAST field
// as Category, and everything in between (rejoined) as the Address. This keeps
// unquoted multi-comma addresses intact.
function rowsFromText(text: string): PreviewRow[] {
  const grid = parseDelimited(text);
  if (grid.length === 0) return [];

  const headerRow = grid[0].map((c) => c.toLowerCase());
  const looksLikeHeader = headerRow.some((c) => c.includes("company"));
  const dataRows = looksLikeHeader ? grid.slice(1) : grid;

  return dataRows.map((cells, i) => {
    const name = (cells[0] ?? "").trim();
    const contactName = (cells[1] ?? "").trim();
    const contactEmail = (cells[2] ?? "").trim();
    const phoneCell = (cells[3] ?? "").trim();
    const phoneWork = (cells[4] ?? "").trim();
    const categoryRaw = cells.length > 6 ? cells[cells.length - 1] : (cells[6] ?? "");
    const rawAddress = cells.length > 6 ? cells.slice(5, cells.length - 1).join(", ") : (cells[5] ?? "");
    const parsedAddress = splitAddress(rawAddress);

    let error: string | null = null;
    if (!name) error = "Missing company name";
    else if (!rawAddress) error = "Missing address";

    return {
      key: `${i}-${name}`,
      name,
      contactName,
      contactEmail,
      phoneCell,
      phoneWork,
      rawAddress,
      ...parsedAddress,
      type: normalizeCategory(categoryRaw || "Homecare"),
      leadTemperature: "Cold",
      status: "Prospect",
      skip: !!error,
      error,
      geocoding: false,
      geocoded: false,
    };
  });
}

async function geocodeAddress(
  address: string,
  city: string,
  provinceState: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("supabase-functions-geocode", {
      body: { address, city, provinceState, country },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (typeof data?.lat === "number" && typeof data?.lng === "number") {
      return { lat: data.lat, lng: data.lng };
    }
  } catch (e) {
    console.error("[bulk-import] geocode failed:", e);
  }
  return null;
}

export default function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [step, setStep] = useState<"paste" | "review">("paste");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep("paste");
    setRawText("");
    setRows([]);
    setImportError("");
    setImportedCount(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleParse = () => {
    const parsed = rowsFromText(rawText);
    setRows(parsed);
    setStep("review");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  };

  const updateRow = (key: string, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const activeRows = rows.filter((r) => !r.skip);

  const handleCommit = async () => {
    setImporting(true);
    setImportError("");

    const toImport: Omit<Client, "id" | "createdAt">[] = [];

    for (const row of activeRows) {
      updateRow(row.key, { geocoding: true });
      const coords = await geocodeAddress(row.address, row.city, row.provinceState, row.country);
      if (!coords) {
        updateRow(row.key, {
          geocoding: false,
          error: "Could not geocode this address — fix it or skip the row.",
          skip: true,
        });
        continue;
      }
      updateRow(row.key, { geocoding: false, geocoded: true });
      toImport.push({
        name: row.name,
        type: row.type,
        address: row.address,
        city: row.city,
        provinceState: row.provinceState,
        country: row.country,
        contactName: row.contactName,
        contactEmail: row.contactEmail,
        phoneCell: row.phoneCell,
        phoneWork: row.phoneWork,
        status: row.status,
        notes: "",
        lat: coords.lat,
        lng: coords.lng,
        leadTemperature: row.leadTemperature,
        leadSource: "",
        notesLog: [],
        lastContactedDate: null,
        nextFollowUpDate: null,
      });
    }

    if (toImport.length === 0) {
      setImportError("No rows could be geocoded. Fix the addresses and try again.");
      setImporting(false);
      return;
    }

    try {
      await onImport(toImport);
      setImportedCount(toImport.length);
      setImporting(false);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed. Please try again.");
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "#1E293B", fontFamily: "Nunito, system-ui, sans-serif" }}>
              Bulk Import Cold Leads
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}>
              {step === "paste"
                ? "Paste a list or upload a CSV: Company, Contact Name, Email, Cell, Work Phone, Address, Category"
                : `Review ${rows.length} row${rows.length === 1 ? "" : "s"} before importing`}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md transition-colors hover:bg-slate-100" style={{ color: "#64748B" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {importedCount !== null ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CheckCircle2 size={36} style={{ color: "#34D399" }} />
              <p className="text-sm font-semibold" style={{ color: "#1E293B", fontFamily: "Nunito, system-ui, sans-serif" }}>
                Imported {importedCount} cold lead{importedCount === 1 ? "" : "s"}
              </p>
            </div>
          ) : step === "paste" ? (
            <div className="space-y-3">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                placeholder={
                  "Company, Contact Name, Email, Cell, Work Phone, Address, Category\n" +
                  "Acme Homecare, Jane Doe, jane@acme.com, 416-555-0100, 416-555-0200, 123 Main St, Toronto, ON, Homecare"
                }
                className="form-input resize-none"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:bg-slate-50"
                  style={{ border: "1px solid #E2E8F0", color: "#475569", fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  <UploadCloud size={12} />
                  Upload CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                <span className="text-xs" style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}>
                  New accounts default to Cold lead / Prospect status — editable in the next step.
                </span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                    {["", "Company", "Contact", "Category", "Temp", "Status", "Address", ""].map((h, i) => (
                      <th key={i} className="text-left py-2 px-2 font-semibold" style={{ color: "#94A3B8" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        opacity: row.skip ? 0.5 : 1,
                      }}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={!row.skip}
                          onChange={(e) => updateRow(row.key, { skip: !e.target.checked, error: row.error && e.target.checked ? row.error : null })}
                        />
                      </td>
                      <td className="py-2 px-2 min-w-[140px]">
                        <div className="font-semibold" style={{ color: "#1E293B" }}>{row.name || "—"}</div>
                        {row.error && (
                          <div className="flex items-center gap-1 mt-0.5" style={{ color: "#FB7185" }}>
                            <AlertCircle size={10} />
                            {row.error}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 min-w-[120px]" style={{ color: "#64748B" }}>{row.contactName || "—"}</td>
                      <td className="py-2 px-2">
                        <select
                          value={row.type}
                          onChange={(e) => updateRow(row.key, { type: e.target.value as ClientType })}
                          className="text-xs rounded px-1 py-0.5"
                          style={{ border: "1px solid #E2E8F0" }}
                        >
                          {CLIENT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={row.leadTemperature}
                          onChange={(e) => updateRow(row.key, { leadTemperature: e.target.value as "Warm" | "Cold" })}
                          className="text-xs rounded px-1 py-0.5"
                          style={{ border: "1px solid #E2E8F0" }}
                        >
                          <option value="Cold">Cold</option>
                          <option value="Warm">Warm</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={row.status}
                          onChange={(e) => updateRow(row.key, { status: e.target.value as ClientStatus })}
                          className="text-xs rounded px-1 py-0.5"
                          style={{ border: "1px solid #E2E8F0" }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 min-w-[180px]" style={{ color: "#94A3B8" }}>
                        {row.rawAddress}
                        {row.geocoding && <Loader2 size={10} className="inline ml-1 animate-spin" />}
                        {row.geocoded && <CheckCircle2 size={10} className="inline ml-1" style={{ color: "#34D399" }} />}
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => removeRow(row.key)} style={{ color: "#94A3B8" }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importError && (
                <div
                  className="flex items-start gap-2 p-3 rounded-md mt-3"
                  style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)" }}
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#FB7185" }} />
                  <p className="text-xs" style={{ color: "#FB7185", fontFamily: "Nunito, system-ui, sans-serif" }}>
                    {importError}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: "1px solid #E2E8F0" }}>
          {importedCount !== null ? (
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm font-semibold rounded-md transition-all hover:brightness-110"
              style={{ background: "#2E55B5", color: "#FFFFFF", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Done
            </button>
          ) : step === "paste" ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-md transition-colors hover:bg-slate-100"
                style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-md transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "#2E55B5", color: "#FFFFFF", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Preview Import
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("paste")}
                className="px-4 py-2 text-sm rounded-md transition-colors hover:bg-slate-100"
                style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={importing || activeRows.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-md transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "#2E55B5", color: "#FFFFFF", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Importing…
                  </>
                ) : (
                  `Import ${activeRows.length} Account${activeRows.length === 1 ? "" : "s"}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
