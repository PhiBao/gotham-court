"use client";

import { useMemo } from "react";
import { Trophy, TrendingUp, Scale, Coins } from "lucide-react";
import { CaseSummary, CaseBetTotals } from "@/lib/contracts/types";

function formatGenDisplay(n: number | undefined): string {
  if (n === undefined || n === null || n === 0) return "0 GEN";
  const gen = Number(n) / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(2)}k GEN`;
  if (gen >= 1) return `${gen.toFixed(3)} GEN`;
  return `${gen.toFixed(6)} GEN`;
}

function totalPool(totals?: CaseBetTotals): number {
  if (!totals) return 0;
  return (totals.guilty || 0) + (totals.not_guilty || 0) + (totals.insufficient_evidence || 0);
}

interface LeaderboardProps {
  cases: CaseSummary[];
}

export function Leaderboard({ cases }: LeaderboardProps) {
  const ranked = useMemo(() => {
    return [...cases]
      .map((c) => ({
        ...c,
        pool: totalPool(c.bet_totals),
      }))
      .filter((c) => c.pool > 0)
      .sort((a, b) => b.pool - a.pool)
      .slice(0, 10);
  }, [cases]);

  const grandTotal = useMemo(() => {
    return cases.reduce((sum, c) => sum + totalPool(c.bet_totals), 0);
  }, [cases]);

  if (ranked.length === 0) {
    return null;
  }

  return (
    <div className="gotham-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold">Betting Leaderboard</h3>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Top Cases by Volume
        </span>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Coins className="w-4 h-4 text-accent" />
        <span>
          Total protocol volume: <strong className="text-foreground">{formatGenDisplay(grandTotal)}</strong>
        </span>
      </div>

      <div className="space-y-2">
        {ranked.map((c, idx) => {
          const maxPool = ranked[0].pool;
          const pct = maxPool > 0 ? (c.pool / maxPool) * 100 : 0;
          const isOpen = c.status !== "JUDGED";

          return (
            <div key={c.id} className="flex items-center gap-3 group">
              <div className="w-6 text-center text-sm font-bold text-muted-foreground">
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                    #{c.id} {c.title}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {formatGenDisplay(c.pool)}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {isOpen ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      Open for Bets
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Judged
                    </span>
                  )}
                  {c.verdict && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {c.verdict.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
