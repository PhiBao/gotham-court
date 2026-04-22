"use client";

import { Trophy, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Leaderboard } from "@/components/Leaderboard";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LeaderboardPage() {
  const { cases, isLoading } = useGothamCourt();

  const totalVolume = cases.reduce(
    (sum, c) =>
      sum +
      (c.bet_totals?.guilty || 0) +
      (c.bet_totals?.not_guilty || 0) +
      (c.bet_totals?.insufficient_evidence || 0),
    0
  );

  const totalBets = cases.filter(
    (c) =>
      (c.bet_totals?.guilty || 0) +
      (c.bet_totals?.not_guilty || 0) +
      (c.bet_totals?.insufficient_evidence || 0) >
      0
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-3xl bg-yellow-500/20 rounded-full scale-150 animate-pulse" />
              <Trophy className="relative w-14 h-14 text-yellow-400 mx-auto" />
            </div>
            <h1 className="text-4xl font-bold">
              <span className="text-yellow-400">Betting</span> Leaderboard
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Top cases by total pool volume. The crowd has spoken — who are they betting on?
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="gotham-card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{totalBets}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Cases with Bets</div>
            </div>
            <div className="gotham-card p-4 text-center">
              <div className="text-2xl font-bold text-accent">
                {totalVolume > 0 ? `${(Number(totalVolume) / 1e18).toFixed(3)}` : "0"} GEN
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Volume</div>
            </div>
          </div>

          {/* Leaderboard */}
          {isLoading ? (
            <div className="gotham-card p-8 animate-pulse space-y-3">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          ) : (
            <Leaderboard cases={cases} />
          )}

          {/* Back */}
          <div className="text-center">
            <Link href="/">
              <Button variant="outline" className="px-8">
                ← Back to Court
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
