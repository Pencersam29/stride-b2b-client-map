import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  Client,
  ClientStatus,
  ClientType,
  LeadTemperature,
  LEAD_SOURCES,
  CURRENCIES,
  NoteEntry,
} from "@/types/client";
import { supabase } from "@/lib/supabase";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Client, "id" | "createdAt">) => Promise<void>;
  editClient?: Client | null;
}

const STATUSES: ClientStatus[] = [
  "Prospect",
  "In Pipeline",
  "Interested in Trial",
  "Signed",
  "Not Interested",
  "On Hold",
];

const CLIENT_TYPES: ClientType[] = ["Homecare", "Retirement Home"];
const LEAD_TEMPERATURES: LeadTemperature[] = ["Warm", "Cold"];

interface FormData {
  name: string;
  type: ClientType;
  address: string;
  city: string;
  provinceState: string;
  country: string;
  contactName: string;
  contactEmail: string;
  phoneCell: string;
  phoneWork: string;
  status: ClientStatus;
  notes: string;
  leadTemperature: LeadTemperature;
  leadSource: string;
  lastContactedDate: string;
  nextFollowUpDate: string;
  newNoteText: string;
  contractedClientCount: string;
  contractPriceMonthly: string;
  contractCurrency: string;
}

const defaultForm: FormData = {
  name: "",
  type: "Homecare",
  address: "",
  city: "",
  provinceState: "",
  country: "Canada",
  contactName: "",
  contactEmail: "",
  phoneCell: "",
  phoneWork: "",
  status: "Prospect",
  notes: "",
  leadTemperature: "Warm",
  leadSource: "",
  lastContactedDate: "",
  nextFollowUpDate: "",
  newNoteText: "",
  contractedClientCount: "",
  contractPriceMonthly: "",
  contractCurrency: "USD",
};

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
    console.log("[geocode] edge fn response:", data, error);
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (typeof data?.lat === "number" && typeof data?.lng === "number") {
      return { lat: data.lat, lng: data.lng };
    }
  } catch (e) {
    console.error("[geocode] edge function failed:", e);
  }
  return null;
}

export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  editClient,
}: ClientModalProps) {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (editClient) {
        setForm({
          name: editClient.name,
          type: editClient.type,
          address: editClient.address,
          city: editClient.city,
          provinceState: editClient.provinceState,
          country: editClient.country,
          contactName: editClient.contactName,
          contactEmail: editClient.contactEmail,
          phoneCell: editClient.phoneCell ?? "",
          phoneWork: editClient.phoneWork ?? "",
          status: editClient.status,
          notes: editClient.notes,
          leadTemperature: editClient.leadTemperature ?? "Warm",
          leadSource: editClient.leadSource ?? "",
          lastContactedDate: editClient.lastContactedDate ?? "",
          nextFollowUpDate: editClient.nextFollowUpDate ?? "",
          newNoteText: "",
          contractedClientCount:
            editClient.contractedClientCount != null
              ? String(editClient.contractedClientCount)
              : "",
          contractPriceMonthly:
            editClient.contractPriceMonthly != null
              ? String(editClient.contractPriceMonthly)
              : "",
          contractCurrency: editClient.contractCurrency ?? "USD",
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
      setGeocodeError("");
    } else {
      const t = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, editClient]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = "Client name is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.provinceState.trim())
      errs.provinceState = "Province / State is required";
    if (!form.country.trim()) errs.country = "Country is required";
    if (!form.contactName.trim())
      errs.contactName = "Contact name is required";
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      errs.contactEmail = "Invalid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setGeocodeError("");

    const coords = await geocodeAddress(
      form.address,
      form.city,
      form.provinceState,
      form.country
    );

    if (!coords) {
      setGeocodeError(
        "Could not locate this address. Please check the city and province/state, then try again."
      );
      setIsLoading(false);
      return;
    }

    const existingNotesLog: NoteEntry[] = editClient?.notesLog ?? [];
    const notesLog: NoteEntry[] = form.newNoteText.trim()
      ? [
          ...existingNotesLog,
          { timestamp: new Date().toISOString(), text: form.newNoteText.trim() },
        ]
      : existingNotesLog;

    const {
      newNoteText,
      contractedClientCount,
      contractPriceMonthly,
      contractCurrency,
      ...formRest
    } = form;

    try {
      await onSave({
        ...formRest,
        notesLog,
        lastContactedDate: form.lastContactedDate || null,
        nextFollowUpDate: form.nextFollowUpDate || null,
        contractedClientCount: contractedClientCount.trim()
          ? Number(contractedClientCount)
          : null,
        contractPriceMonthly: contractPriceMonthly.trim()
          ? Number(contractPriceMonthly)
          : null,
        contractCurrency: contractCurrency || null,
        lat: coords.lat,
        lng: coords.lng,
      });
      setIsLoading(false);
      onClose();
    } catch (err) {
      setGeocodeError(
        err instanceof Error ? err.message : "Failed to save client. Please try again."
      );
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{
        background: isOpen ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
        backdropFilter: isOpen ? "blur(4px)" : "none",
        transition: "all 0.3s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.2)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <div>
            <h2
              className="text-base font-bold"
              style={{ color: "#1E293B", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              {editClient ? "Edit Client" : "Add New Client"}
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              {editClient
                ? "Update client information"
                : "Fill in the details to add a new account"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-slate-100"
            style={{ color: "#64748B" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField
                label="Client Name *"
                error={errors.name}
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Maple Grove Homecare"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Client Type">
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as ClientType,
                    }))
                  }
                  className="form-input"
                >
                  {CLIENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div>
              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as ClientStatus,
                    }))
                  }
                  className="form-input"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="col-span-2">
              <FormField label="Street Address">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="e.g. 123 King St W"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="City *" error={errors.city}>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="e.g. Toronto"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField
                label="Province / State *"
                error={errors.provinceState}
              >
                <input
                  type="text"
                  value={form.provinceState}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, provinceState: e.target.value }))
                  }
                  placeholder="e.g. ON or NY"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Country *" error={errors.country}>
                <select
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                  className="form-input"
                >
                  <option>Canada</option>
                  <option>USA</option>
                </select>
              </FormField>
            </div>

            <div>
              <FormField label="Contact Name *" error={errors.contactName}>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactName: e.target.value }))
                  }
                  placeholder="Full name"
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="col-span-2">
              <FormField label="Contact Email" error={errors.contactEmail}>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactEmail: e.target.value }))
                  }
                  placeholder="email@example.com"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Cell Phone (C)">
                <input
                  type="tel"
                  value={form.phoneCell}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneCell: e.target.value }))
                  }
                  placeholder="e.g. 416-555-0100"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Work Phone (W)">
                <input
                  type="tel"
                  value={form.phoneWork}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneWork: e.target.value }))
                  }
                  placeholder="e.g. 416-555-0200"
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="col-span-2">
              <FormField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Additional notes about this client..."
                  className="form-input resize-none"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Lead Temperature">
                <select
                  value={form.leadTemperature}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      leadTemperature: e.target.value as LeadTemperature,
                    }))
                  }
                  className="form-input"
                >
                  {LEAD_TEMPERATURES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div>
              <FormField label="Lead Source">
                <select
                  value={form.leadSource}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, leadSource: e.target.value }))
                  }
                  className="form-input"
                >
                  <option value="">Select source…</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div>
              <FormField label="Last Contacted Date">
                <input
                  type="date"
                  value={form.lastContactedDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastContactedDate: e.target.value }))
                  }
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Next Follow-up Date">
                <input
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))
                  }
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="col-span-2">
              <FormField label="Add Activity Note">
                <textarea
                  value={form.newNoteText}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, newNoteText: e.target.value }))
                  }
                  rows={2}
                  placeholder="e.g. 9/17 - left voicemail, following up Thursday"
                  className="form-input resize-none"
                />
              </FormField>
              {editClient && editClient.notesLog?.length > 0 && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "#94A3B8", fontFamily: "Nunito, system-ui, sans-serif" }}
                >
                  {editClient.notesLog.length} previous {editClient.notesLog.length === 1 ? "entry" : "entries"} — this adds a new timestamped entry to the log.
                </p>
              )}
            </div>

            <div className="col-span-2 pt-2" style={{ borderTop: "1px solid #E2E8F0" }}>
              <p
                className="text-xs font-semibold mb-3 mt-1"
                style={{ color: "#475569", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Contract Terms (for Signed accounts)
              </p>
            </div>

            <div>
              <FormField label="Clients Agreed To">
                <input
                  type="number"
                  min="0"
                  value={form.contractedClientCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contractedClientCount: e.target.value }))
                  }
                  placeholder="e.g. 200"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Price / Client / Month">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contractPriceMonthly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contractPriceMonthly: e.target.value }))
                  }
                  placeholder="e.g. 8.00"
                  className="form-input"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Currency">
                <select
                  value={form.contractCurrency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contractCurrency: e.target.value }))
                  }
                  className="form-input"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {geocodeError && (
            <div
              className="flex items-start gap-2 p-3 rounded-md"
              style={{
                background: "rgba(251,113,133,0.1)",
                border: "1px solid rgba(251,113,133,0.3)",
              }}
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#FB7185" }} />
              <p
                className="text-xs"
                style={{ color: "#FB7185", fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                {geocodeError}
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid #E2E8F0" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md transition-colors hover:bg-slate-100"
            style={{ color: "#64748B", fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-md transition-all hover:brightness-110 disabled:opacity-60"
            style={{
              background: "#2E55B5",
              color: "#0E1117",
              fontFamily: "Nunito, system-ui, sans-serif",
              boxShadow: "0 0 16px rgba(46,85,181,0.2)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Locating...
              </>
            ) : editClient ? (
              "Save Changes"
            ) : (
              "Add Client"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "#475569", fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        {label}
      </label>
      <div>
        <div
          style={error ? { borderColor: "#FB7185" } : undefined}
          className="[&_.form-input]:w-full"
        >
          {children}
        </div>
      </div>
      {error && (
        <p
          className="text-xs"
          style={{ color: "#FB7185", fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
