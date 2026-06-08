import { useState, useEffect, useCallback } from "react";
import { Client } from "@/types/client";
import { supabase } from "@/lib/supabase";
import { Save, Heart, Building2, Users } from "lucide-react";

interface CommandCenterProps {
  clients: Client[];
}

interface OsMetrics {
  id: number;
  hc_outreach_this_week: number;
  rh_outreach_this_week: number;
  b2c_waitlist_signups: number;
  b2c_referral_channels: number;
  b2c_content_this_week: number;
  framework_complete: boolean;
  pilot_proposals_sent: number;
  content_published_total: number;
  rh_fit_decision_made: boolean;
  updated_at: string;
}

const defaultMetrics: Omit<OsMetrics, "id" | "updated_at"> = {
  hc_outreach_this_week: 0,
  rh_outreach_this_week: 0,
  b2c_waitlist_signups: 0,
  b2c_referral_channels: 0,
  b2c_content_this_week: 0,
  framework_complete: false,
  pilot_proposals_sent: 0,
  content_published_total: 0,
  rh_fit_decision_made: false,
};

function Stepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 border border-[#E2E8F0] text-sm font-bold leading-none"
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        −
      </button>
      <span
        className="w-10 text-center text-sm font-semibold text-slate-800"
        style={{ fontFamily: "JetBrains Mono, monospace" }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 border border-[#E2E8F0] text-sm font-bold leading-none"
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        +
      </button>
    </div>
  );
}

function ProgressBar({
  value,
  target,
  color,
}: {
  value: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>
        <span className="text-slate-500">{value.toLocaleString()} / {target.toLocaleString()}</span>
        <span className="font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
      <span
        className="text-xs text-slate-500"
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function BooleanToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
  color,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel: string;
  falseLabel: string;
  color: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200"
      style={{
        fontFamily: "Nunito, system-ui, sans-serif",
        backgroundColor: value ? color + "22" : "#F1F5F9",
        borderColor: value ? color : "#E2E8F0",
        color: value ? color : "#94A3B8",
      }}
    >
      {value ? trueLabel : falseLabel}
    </button>
  );
}

type LastWeek = {
  hc_outreach_this_week: number;
  rh_outreach_this_week: number;
  b2c_content_this_week: number;
  b2c_waitlist_signups: number;
  b2c_referral_channels: number;
  week_start_date: string;
} | null;

function Delta({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined) return null;
  const diff = current - prev;
  const color = diff > 0 ? "#34D399" : diff < 0 ? "#F87171" : "#94A3B8";
  const sign = diff > 0 ? "+" : "";
  return (
    <span
      className="ml-2 text-[10px]"
      style={{ color, fontFamily: "JetBrains Mono, monospace" }}
      title={`Last week: ${prev}`}
    >
      last wk {prev} ({sign}{diff})
    </span>
  );
}

export default function CommandCenter({ clients }: CommandCenterProps) {
  const [metrics, setMetrics] = useState<Omit<OsMetrics, "id" | "updated_at">>(defaultMetrics);
  const [metricsId, setMetricsId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastWeek, setLastWeek] = useState<LastWeek>(null);

  // Derived from clients
  const hcClients = clients.filter((c) => c.type === "Homecare");
  const rhClients = clients.filter((c) => c.type === "Retirement Home");

  const hcSigned = hcClients.filter((c) => c.status === "Signed").length;
  const hcActiveConvos = hcClients.filter(
    (c) => c.status === "In Pipeline" || c.status === "Interested in Trial"
  ).length;
  const hcProspects = hcClients.filter((c) => c.status === "Prospect").length;

  const rhTotal = rhClients.length;
  const rhDiscovery = rhClients.filter((c) => c.status !== "Prospect").length;

  const totalB2B = clients.length;

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("os_metrics")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .single();

    if (!error && data) {
      setMetricsId(data.id);
      setMetrics({
        hc_outreach_this_week: data.hc_outreach_this_week ?? 0,
        rh_outreach_this_week: data.rh_outreach_this_week ?? 0,
        b2c_waitlist_signups: data.b2c_waitlist_signups ?? 0,
        b2c_referral_channels: data.b2c_referral_channels ?? 0,
        b2c_content_this_week: data.b2c_content_this_week ?? 0,
        framework_complete: data.framework_complete ?? false,
        pilot_proposals_sent: data.pilot_proposals_sent ?? 0,
        content_published_total: data.content_published_total ?? 0,
        rh_fit_decision_made: data.rh_fit_decision_made ?? false,
      });
    }
    setLoading(false);
  }, []);

  const fetchLastWeek = useCallback(async () => {
    const { data } = await supabase
      .from("os_metrics_history")
      .select(
        "hc_outreach_this_week, rh_outreach_this_week, b2c_content_this_week, b2c_waitlist_signups, b2c_referral_channels, week_start_date"
      )
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLastWeek(data as LastWeek);
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchLastWeek();
  }, [fetchMetrics, fetchLastWeek]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...metrics,
      updated_at: new Date().toISOString(),
    };

    if (metricsId !== null) {
      await supabase.from("os_metrics").update(payload).eq("id", metricsId);
    } else {
      const { data } = await supabase
        .from("os_metrics")
        .insert(payload)
        .select()
        .single();
      if (data) setMetricsId(data.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = <K extends keyof typeof metrics>(key: K, value: typeof metrics[K]) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64 text-slate-400 text-sm"
        style={{ fontFamily: "Nunito, system-ui, sans-serif", background: "#F8FAFC" }}
      >
        Loading metrics…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(46,85,181,0.08), transparent 60%), #F8FAFC",
        fontFamily: "Nunito, system-ui, sans-serif",
      }}
    >
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div
        className="rounded-2xl border bg-white p-6 mb-6 flex items-center justify-between"
        style={{
          borderColor: "#E2E8F0",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(46,85,181,0.06)",
        }}
      >
        <div>
          <div
            className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2"
            style={{ color: "#2E55B5" }}
          >
            Operating Scorecard
          </div>
          <h1
            className="text-4xl tracking-tight"
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              fontWeight: 900,
              color: "#0F172A",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            Command Center
          </h1>
          <p
            className="text-sm text-slate-500 mt-2"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            Live CRM data, weekly outreach metrics, and quarterly targets at a glance.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0 ml-8">
          <img
            src="/stride-logo.png"
            alt="Stride"
            className="h-16 w-auto select-none"
            draggable={false}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              fontFamily: "Nunito, system-ui, sans-serif",
              backgroundColor: saved ? "#34D399" : "#2E55B5",
              color: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(46,85,181,0.25)",
            }}
          >
            <Save size={14} />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Metrics"}
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total B2B Accounts */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
              Total B2B Accounts
            </span>
          </div>
          <div
            className="text-3xl font-bold text-slate-900"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {totalB2B}
          </div>
          <div className="text-xs text-slate-400 mt-1">auto-derived from CRM</div>
        </div>

        {/* Pilot Proposals Sent */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
              Pilot Proposals Sent
            </span>
          </div>
          <div
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {metrics.pilot_proposals_sent}
          </div>
          <Stepper
            value={metrics.pilot_proposals_sent}
            onChange={(v) => set("pilot_proposals_sent", v)}
          />
        </div>

        {/* Content Published Total */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
              Content Published
            </span>
          </div>
          <div
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {metrics.content_published_total}
          </div>
          <Stepper
            value={metrics.content_published_total}
            onChange={(v) => set("content_published_total", v)}
          />
        </div>

        {/* Framework Status */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Save size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
              Framework Status
            </span>
          </div>
          <div
            className="text-lg font-bold mb-3"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: metrics.framework_complete ? "#34D399" : "#FBBF24",
            }}
          >
            {metrics.framework_complete ? "Complete" : "In Progress"}
          </div>
          <BooleanToggle
            value={metrics.framework_complete}
            onChange={(v) => set("framework_complete", v)}
            trueLabel="✓ Complete"
            falseLabel="⟳ In Progress"
            color="#34D399"
          />
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ─── Homecare Card ─── */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden transition-shadow hover:shadow-md">
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ background: "#2E55B518", borderBottom: "1px solid #E2E8F0" }}
          >
            <Heart size={18} style={{ color: "#2E55B5" }} />
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Homecare
              </h2>
              <p className="text-xs text-slate-400">Target: 45 trial agreements</p>
            </div>
          </div>
          <div className="px-5 py-3">
            <MetricRow label="Signed / Trial Agreements">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: "#2E55B5" }}
                >
                  {hcSigned}
                </span>
                <span className="text-xs text-slate-400">/ 45</span>
              </div>
            </MetricRow>

            <MetricRow label="Active Convos (In Pipeline + Trial)">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: "#2E55B5" }}
                >
                  {hcActiveConvos}
                </span>
                <span className="text-xs text-slate-400">/ 10 target</span>
              </div>
            </MetricRow>

            <MetricRow label="Prospects">
              <span
                className="text-sm font-bold text-slate-700"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {hcProspects}
              </span>
            </MetricRow>

            <MetricRow label="Outreach this week">
              <div className="flex items-center">
                <Stepper
                  value={metrics.hc_outreach_this_week}
                  onChange={(v) => set("hc_outreach_this_week", v)}
                />
                <Delta current={metrics.hc_outreach_this_week} prev={lastWeek?.hc_outreach_this_week} />
              </div>
            </MetricRow>

            <div className="pt-3">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Outreach target (10/week)
              </div>
              <ProgressBar
                value={metrics.hc_outreach_this_week}
                target={10}
                color="#2E55B5"
              />
            </div>

            <div className="pt-3 pb-1">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Trial agreement progress (45 total)
              </div>
              <ProgressBar value={hcSigned} target={45} color="#2E55B5" />
            </div>
          </div>
        </div>

        {/* ─── Retirement Homes Card ─── */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden transition-shadow hover:shadow-md">
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ background: "#8B5CF618", borderBottom: "1px solid #E2E8F0" }}
          >
            <Building2 size={18} style={{ color: "#8B5CF6" }} />
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Retirement Homes
              </h2>
              <p className="text-xs text-slate-400">Target: 8 discovery calls</p>
            </div>
          </div>
          <div className="px-5 py-3">
            <MetricRow label="Total RH Accounts">
              <span
                className="text-sm font-bold text-slate-700"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {rhTotal}
              </span>
            </MetricRow>

            <MetricRow label="Discovery / Non-Prospect">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "JetBrains Mono, monospace", color: "#8B5CF6" }}
                >
                  {rhDiscovery}
                </span>
                <span className="text-xs text-slate-400">/ 8 target</span>
              </div>
            </MetricRow>

            <MetricRow label="Outreach this week">
              <div className="flex items-center">
                <Stepper
                  value={metrics.rh_outreach_this_week}
                  onChange={(v) => set("rh_outreach_this_week", v)}
                />
                <Delta current={metrics.rh_outreach_this_week} prev={lastWeek?.rh_outreach_this_week} />
              </div>
            </MetricRow>

            <MetricRow label="Go/No-Go Decision">
              <BooleanToggle
                value={metrics.rh_fit_decision_made}
                onChange={(v) => set("rh_fit_decision_made", v)}
                trueLabel="✓ Decision Made"
                falseLabel="Pending"
                color="#8B5CF6"
              />
            </MetricRow>

            <div className="pt-3">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Outreach target (5/week)
              </div>
              <ProgressBar
                value={metrics.rh_outreach_this_week}
                target={5}
                color="#8B5CF6"
              />
            </div>

            <div className="pt-3 pb-1">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Discovery calls progress (8 target)
              </div>
              <ProgressBar value={rhDiscovery} target={8} color="#8B5CF6" />
            </div>
          </div>
        </div>

        {/* ─── B2C Older Adults Card ─── */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden transition-shadow hover:shadow-md">
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ background: "#F59E0B18", borderBottom: "1px solid #E2E8F0" }}
          >
            <Users size={18} style={{ color: "#F59E0B" }} />
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                B2C Older Adults
              </h2>
              <p className="text-xs text-slate-400">Target: 1,000 waitlist signups</p>
            </div>
          </div>
          <div className="px-5 py-3">
            <MetricRow label="Waitlist Signups">
              <Stepper
                value={metrics.b2c_waitlist_signups}
                onChange={(v) => set("b2c_waitlist_signups", v)}
              />
            </MetricRow>

            <div className="py-2 border-b border-[#E2E8F0]">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Waitlist progress (target 1,000)
              </div>
              <ProgressBar
                value={metrics.b2c_waitlist_signups}
                target={1000}
                color="#F59E0B"
              />
            </div>

            <MetricRow label="Content this week">
              <div className="flex items-center">
                <Stepper
                  value={metrics.b2c_content_this_week}
                  onChange={(v) => set("b2c_content_this_week", v)}
                />
                <Delta current={metrics.b2c_content_this_week} prev={lastWeek?.b2c_content_this_week} />
              </div>
            </MetricRow>

            <div className="py-2 border-b border-[#E2E8F0]">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Content target (2/week)
              </div>
              <ProgressBar
                value={metrics.b2c_content_this_week}
                target={2}
                color="#F59E0B"
              />
            </div>

            <MetricRow label="Referral Channels">
              <Stepper
                value={metrics.b2c_referral_channels}
                onChange={(v) => set("b2c_referral_channels", v)}
              />
            </MetricRow>

            <div className="pt-3 pb-1">
              <div className="text-xs text-slate-400 mb-1" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
                Referral channel target (3)
              </div>
              <ProgressBar
                value={metrics.b2c_referral_channels}
                target={3}
                color="#F59E0B"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
