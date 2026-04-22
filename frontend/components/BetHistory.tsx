"use client";

import { useMemo } from "react";
import { History, Coins, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { CaseSummary, Bet } from "@/lib/contracts/types";

function formatGenDisplay(n: number | undefined): string {
  if (n === undefined || n === null || n === 0) return "0 GEN";
  const gen = Number(n) / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}k GEN`;
  if (gen >= 1) return `${gen.toFixed(3)} GEN`;
  return `${gen.toFixed(6)} GEN`;
}

function outcomeLabel(outcome: string): string {
  if (outcome === "GUILTY") return "Guilty";
  if (outcome === "NOT_GUILTY") return "Not Guilty";
  if (outcome === "INSUFFICIENT_EVIDENCE") return "Insufficient Evidence";
  return outcome;
}

function outcomeColor(outcome: string): string {
  if (outcome === "GUILTY") return "text-red-400 bg-red-500/10 border-red-500/20";
  if (outcome === "NOT_GUILTY") return "text-green-400 bg-green-500/10 border-green-500/20";
  if (outcome === "INSUFFICIENT_EVIDENCE") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-muted-foreground bg-muted border-border";
}

interface BetHistoryProps {
  cases: CaseSummary[];
  bets: (Bet | null)[];
  isLoading: boolean;
}

export function BetHistory({ cases, bets, isLoading }: BetHistoryProps) {
  const activeBets = useMemo(() => {
    return cases
      .map((c, i) => ({ case: c, bet: bets[i] }))
      .filter((item) => item.bet?.exists && item.bet.amount > 0 && !item.bet.claimed)
      .sort((a, b) => b.case.id - a.case.id);
  }, [cases, bets]);

  const pastBets = useMemo(() => {
    return cases
      .map((c, i) => ({ case: c, bet: bets[i] }))
      .filter((item) => item.bet?.exists && item.bet.amount > 0 && item.bet.claimed)
      .sort((a, b) => b.case.id - a.case.id);
  }, [cases, bets]);

  if (isLoading) {
    return (
      <div className="gotham-card p-6 space-y-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-16 bg-muted rounded" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (activeBets.length === 0 && pastBets.length === 0) {
    return (
      <div className="gotham-card p-6 text-center space-y-3">
        <History className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          You haven&apos;t placed any bets yet.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Browse open cases and stake GEN on the outcome you predict.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div className="gotham-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold">Your Active Bets</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {activeBets.length} bet{activeBets.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {activeBets.map(({ case: c, bet }) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-accent/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">#{c.id}</span>
                    <span className="text-sm font-medium truncate">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${outcomeColor(bet?.outcome || "")}`}>
                      {outcomeLabel(bet?.outcome || "")}
                    </span>
                    {c.status === "JUDGED" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Claim ready
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-bold text-accent">
                    {formatGenDisplay(bet?.amount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.status === "OPEN" ? "Awaiting defense" : c.status === "DEFENSE" ? "Awaiting judgment" : "Verdict delivered"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Bets */}
      {pastBets.length > 0 && (
        <div className="gotham-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold">Past Bets</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {pastBets.length} bet{pastBets.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {pastBets.map(({ case: c, bet }) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">#{c.id}</span>
                    <span className="text-sm font-medium truncate text-muted-foreground">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${outcomeColor(bet?.outcome || "")}`}>
                      {outcomeLabel(bet?.outcome || "")}
                    </span>
                    {c.verdict && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Verdict: {outcomeLabel(c.verdict)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-bold text-muted-foreground">
                    {formatGenDisplay(bet?.amount)}
                  </div>
                  <div className="text-[10px] text-green-400 flex items-center gap-1 justify-end">
                    <CheckCircle2 className="w-3 h-3" /> Claimed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
