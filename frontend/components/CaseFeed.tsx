"use client";

import { useState } from "react";
import { CaseSummary } from "@/lib/contracts/types";
import { AddressDisplay } from "./AddressDisplay";
import { Scale, ShieldAlert, Gavel, BarChart3 } from "lucide-react";

/* ---- Badges ---- */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: string }> = {
    OPEN: { cls: "status-open", label: "Awaiting Defense", icon: "⏳" },
    DEFENSE: { cls: "status-defense", label: "Defense Filed", icon: "🛡️" },
    JUDGED: { cls: "status-judged", label: "Judged", icon: "⚖️" },
  };
  const s = map[status] || map.OPEN;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className="text-[10px]">{s.icon}</span> {s.label}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  if (!verdict) return null;
  const map: Record<string, { cls: string; label: string }> = {
    GUILTY: { cls: "verdict-guilty", label: "Guilty" },
    NOT_GUILTY: { cls: "verdict-not-guilty", label: "Not Guilty" },
    INSUFFICIENT_EVIDENCE: { cls: "verdict-insufficient", label: "Insufficient" },
  };
  const v = map[verdict] || map.INSUFFICIENT_EVIDENCE;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${v.cls}`}>
      {v.label}
    </span>
  );
}

function SeverityBar({ severity }: { severity: number }) {
  if (severity <= 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-[2px]">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-1.5 h-3 rounded-[1px]"
            style={{
              background: i < severity
                ? severity <= 3
                  ? "oklch(0.7 0.18 145)"
                  : severity <= 6
                  ? "oklch(0.85 0.17 85)"
                  : "oklch(0.6 0.22 25)"
                : "oklch(0.2 0 0)",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{severity}/10</span>
    </div>
  );
}

/* ---- Skeleton ---- */

function CaseCardSkeleton() {
  return (
    <div className="gotham-card p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-5 bg-muted rounded w-2/3" />
        <div className="h-5 bg-muted rounded-full w-24" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-3 bg-muted rounded w-28" />
        <div className="h-3 bg-accent/20 rounded w-6" />
        <div className="h-3 bg-muted rounded w-28" />
      </div>
    </div>
  );
}

/* ---- Analytics ---- */

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function CaseAnalytics({ cases }: { cases: CaseSummary[] }) {
  const total = cases.length;
  const open = cases.filter((c) => c.status === "OPEN").length;
  const defense = cases.filter((c) => c.status === "DEFENSE").length;
  const judged = cases.filter((c) => c.status === "JUDGED").length;
  const guilty = cases.filter((c) => c.verdict === "GUILTY").length;
  const notGuilty = cases.filter((c) => c.verdict === "NOT_GUILTY").length;
  const avgSev = judged > 0
    ? (cases.filter((c) => c.status === "JUDGED").reduce((s, c) => s + c.severity, 0) / judged).toFixed(1)
    : "—";

  return (
    <div className="gotham-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold">Court Statistics</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <Stat label="Total" value={total} color="text-accent" />
        <Stat label="Open" value={open} color="text-yellow-400" />
        <Stat label="Defense" value={defense} color="text-blue-400" />
        <Stat label="Judged" value={judged} color="text-gray-400" />
        <Stat label="Guilty" value={guilty} color="text-red-400" />
        <Stat label="Avg Sev." value={avgSev} color="text-orange-400" />
      </div>
      {judged > 0 && (
        <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden">
          {guilty > 0 && (
            <div className="rounded-full" style={{ width: `${(guilty / judged) * 100}%`, background: "oklch(0.6 0.22 25)" }} />
          )}
          {notGuilty > 0 && (
            <div className="rounded-full" style={{ width: `${(notGuilty / judged) * 100}%`, background: "oklch(0.7 0.18 145)" }} />
          )}
          {judged - guilty - notGuilty > 0 && (
            <div className="rounded-full" style={{ width: `${((judged - guilty - notGuilty) / judged) * 100}%`, background: "oklch(0.65 0.12 60)" }} />
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Filter Tabs ---- */

type FilterTab = "ALL" | "OPEN" | "DEFENSE" | "JUDGED";

const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: "ALL", label: "All", icon: <Scale className="w-3.5 h-3.5" /> },
  { key: "OPEN", label: "Open", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { key: "DEFENSE", label: "Defense", icon: <span className="text-xs">🛡️</span> },
  { key: "JUDGED", label: "Judged", icon: <Gavel className="w-3.5 h-3.5" /> },
];

/* ---- Case Card ---- */

interface CaseCardProps {
  caseData: CaseSummary;
  onClick: () => void;
}

function CaseCard({ caseData, onClick }: CaseCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left gotham-card gotham-card-hover p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-foreground truncate flex-1 group-hover:text-accent transition-colors">
          <span className="text-muted-foreground font-normal">#{caseData.id}</span>{" "}
          {caseData.title}
        </h3>
        <StatusBadge status={caseData.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <span className="opacity-60">Filed by</span>
          <AddressDisplay address={caseData.plaintiff} maxLength={10} className="text-foreground/70" />
        </div>
        <span className="text-accent font-bold">vs</span>
        <div className="flex items-center gap-1">
          <AddressDisplay address={caseData.defendant} maxLength={10} className="text-foreground/70" />
        </div>
      </div>

      {caseData.status === "JUDGED" && (
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <VerdictBadge verdict={caseData.verdict} />
          <SeverityBar severity={caseData.severity} />
        </div>
      )}
    </button>
  );
}

/* ---- Main Feed ---- */

interface CaseFeedProps {
  cases: CaseSummary[];
  isLoading: boolean;
  onSelectCase: (caseId: number) => void;
  onFileCaseClick?: () => void;
}

export function CaseFeed({ cases, isLoading, onSelectCase, onFileCaseClick }: CaseFeedProps) {
  const [filter, setFilter] = useState<FilterTab>("ALL");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <CaseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="gotham-card p-10 text-center">
        <div className="text-5xl mb-4">🦇</div>
        <h3 className="text-xl font-bold mb-2">No Cases Filed Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Gotham is quiet... for now. Be the first to light the Bat-Signal and bring a dispute before the court.
        </p>
        {onFileCaseClick && (
          <button onClick={onFileCaseClick} className="btn-bat px-6 py-2.5 text-sm font-semibold">
            ⚡ File the First Case
          </button>
        )}
      </div>
    );
  }

  const filtered = filter === "ALL" ? cases : cases.filter((c) => c.status === filter);
  const sorted = [...filtered].sort((a, b) => b.id - a.id);

  const tabCounts: Record<FilterTab, number> = {
    ALL: cases.length,
    OPEN: cases.filter((c) => c.status === "OPEN").length,
    DEFENSE: cases.filter((c) => c.status === "DEFENSE").length,
    JUDGED: cases.filter((c) => c.status === "JUDGED").length,
  };

  return (
    <div className="space-y-4">
      {cases.length >= 2 && <CaseAnalytics cases={cases} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold">
          <span className="text-accent">Case</span> Docket
        </h2>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === tab.key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                filter === tab.key ? "bg-black/20" : "bg-muted"
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="gotham-card p-6 text-center">
          <p className="text-muted-foreground">
            No {filter.toLowerCase()} cases found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <CaseCard key={c.id} caseData={c} onClick={() => onSelectCase(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
