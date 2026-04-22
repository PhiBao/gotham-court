"use client";

import { History, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BetHistory } from "@/components/BetHistory";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { cases, isLoading, useUserBets } = useGothamCourt();
  const { address, isConnected } = useWallet();

  const caseIds = cases.map((c) => c.id);
  const { data: userBets, isLoading: betsLoading } = useUserBets(caseIds, address);

  const activeCount = (userBets || []).filter(
    (b) => b?.exists && b.amount > 0 && !b.claimed
  ).length;

  const claimedCount = (userBets || []).filter(
    (b) => b?.exists && b.amount > 0 && b.claimed
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-3xl bg-accent/20 rounded-full scale-150 animate-pulse" />
              <History className="relative w-14 h-14 text-accent mx-auto" />
            </div>
            <h1 className="text-4xl font-bold">
              Your <span className="text-accent">Bet History</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Track all your active and past bets across every case in Gotham Court.
            </p>
          </div>

          {/* Stats */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="gotham-card p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{activeCount}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Bets</div>
              </div>
              <div className="gotham-card p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{claimedCount}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Claimed</div>
              </div>
            </div>
          )}

          {/* History */}
          {!isConnected ? (
            <div className="gotham-card p-10 text-center space-y-4">
              <Wallet className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                Connect your MetaMask wallet to view your betting history.
              </p>
              <Link href="/faucet">
                <Button variant="outline" size="sm">
                  Get GEN →
                </Button>
              </Link>
            </div>
          ) : (
            <BetHistory
              cases={cases}
              bets={userBets || []}
              isLoading={isLoading || betsLoading}
            />
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
