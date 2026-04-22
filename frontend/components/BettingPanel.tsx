"use client";

import { useState } from "react";
import { Coins, Trophy, Loader2, CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { Case, Bet, CaseBetTotals } from "@/lib/contracts/types";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { success, error } from "@/lib/utils/toast";

const OUTCOMES = [
  {
    key: "GUILTY",
    label: "Guilty",
    emoji: "⚡",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-red-500",
  },
  {
    key: "NOT_GUILTY",
    label: "Not Guilty",
    emoji: "🛡️",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    bar: "bg-green-500",
  },
  {
    key: "INSUFFICIENT_EVIDENCE",
    label: "Insufficient Evidence",
    emoji: "🔍",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    bar: "bg-amber-500",
  },
];

const GEN_DECIMALS = 18;
const GEN_FACTOR = BigInt(10 ** GEN_DECIMALS);

function toWei(genAmount: string): bigint {
  const [whole, fraction = ""] = genAmount.split(".");
  const paddedFraction = (fraction + "0".repeat(GEN_DECIMALS)).slice(0, GEN_DECIMALS);
  return BigInt(whole || "0") * GEN_FACTOR + BigInt(paddedFraction);
}

function fromWei(weiAmount: number | bigint | undefined): string {
  if (weiAmount === undefined || weiAmount === null) return "0";
  const n = BigInt(weiAmount);
  const whole = n / GEN_FACTOR;
  const fraction = (n % GEN_FACTOR).toString().padStart(GEN_DECIMALS, "0");
  // Trim trailing zeros but keep at least 2 decimals
  const trimmed = fraction.replace(/0+$/, "");
  if (!trimmed) return whole.toString();
  return `${whole}.${trimmed}`;
}

function formatWei(weiAmount: number | bigint | undefined): string {
  const gen = fromWei(weiAmount);
  const num = parseFloat(gen);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M GEN";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "k GEN";
  if (num === 0) return "0 GEN";
  return parseFloat(gen).toFixed(4) + " GEN";
}

function PoolBar({
  totals,
  verdict,
}: {
  totals: CaseBetTotals;
  verdict?: string;
}) {
  // Defensive: ensure all values are numbers (genlayer-js may return BigInt)
  const g = Number(totals?.guilty || 0);
  const ng = Number(totals?.not_guilty || 0);
  const ie = Number(totals?.insufficient_evidence || 0);
  const total = g + ng + ie;

  if (!total || total <= 0) return null;

  const items = [
    { key: "GUILTY", value: g, cls: "bg-red-500" },
    { key: "NOT_GUILTY", value: ng, cls: "bg-green-500" },
    { key: "INSUFFICIENT_EVIDENCE", value: ie, cls: "bg-amber-500" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Scale className="w-3 h-3" /> Total Pool
        </span>
        <span className="font-semibold text-foreground">{formatWei(total)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
        {items.map((item) => (
          <div
            key={item.key}
            className={`${item.cls} transition-all`}
            style={{
              width: `${(item.value / total) * 100}%`,
              opacity: verdict && verdict !== item.key ? 0.4 : 1,
            }}
          />
        ))}
      </div>
      <div className="flex gap-3 text-[10px]">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${item.cls}`} />
            <span className="text-muted-foreground">{formatWei(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BettingPanelProps {
  caseData: Case;
  bet: Bet | null | undefined;
  totals: CaseBetTotals | null | undefined;
  escrow?: number;
  placeBet: {
    mutateAsync: (params: { caseId: number; outcome: string; amountWei: bigint }) => Promise<any>;
    isPending: boolean;
  };
  claimWinnings: {
    mutateAsync: (params: { caseId: number }) => Promise<any>;
    isPending: boolean;
  };
}

export function BettingPanel({
  caseData,
  bet,
  totals,
  escrow,
  placeBet,
  claimWinnings,
}: BettingPanelProps) {
  const { address, isConnected } = useWallet();
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState("");

  const isJudged = caseData.status === "JUDGED";
  const canBet = !isJudged && caseData.status !== "JUDGED";

  const isParty =
    !!address &&
    (address.toLowerCase() === caseData.plaintiff?.toLowerCase() ||
      address.toLowerCase() === caseData.defendant?.toLowerCase());

  const hasBet = bet?.exists && bet.amount > 0;
  const userOutcome = bet?.outcome || "";

  const handlePlaceBet = async () => {
    if (!selectedOutcome) {
      error("Please select an outcome");
      return;
    }
    if (!betAmount || parseFloat(betAmount) <= 0) {
      error("Enter a valid bet amount in GEN");
      return;
    }

    try {
      const amountWei = toWei(betAmount);
      await placeBet.mutateAsync({
        caseId: caseData.id,
        outcome: selectedOutcome,
        amountWei,
      });
      success("Bet placed!", {
        description: `${betAmount} GEN staked on ${OUTCOMES.find((o) => o.key === selectedOutcome)?.label}`,
      });
      setBetAmount("");
      setSelectedOutcome(null);
    } catch (err: any) {
      if (err.message?.includes("rejected")) error("Transaction cancelled");
      else error("Failed to place bet", { description: err.message });
    }
  };

  const handleClaim = async () => {
    try {
      await claimWinnings.mutateAsync({ caseId: caseData.id });
      success("Winnings claimed!", {
        description: "GEN has been sent to your wallet via on-chain transfer.",
      });
    } catch (err: any) {
      if (err.message?.includes("rejected")) error("Transaction cancelled");
      else error("Failed to claim winnings", { description: err.message });
    }
  };

  // ---- Judged state: show results + claim ----
  if (isJudged) {
    const winningOutcome = caseData.verdict;
    const didWin = hasBet && userOutcome === winningOutcome;
    const alreadyClaimed = bet?.claimed;

    return (
      <div className="gotham-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold">Betting Results</h3>
        </div>

        {totals && <PoolBar totals={totals} verdict={winningOutcome} />}

        {escrow !== undefined && escrow > 0 && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Coins className="w-3 h-3" /> Escrow locked: {formatWei(escrow)}
          </div>
        )}

        {hasBet ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Your bet:</span>
              <span className="font-semibold">
                {formatWei(bet.amount)} on{" "}
                {OUTCOMES.find((o) => o.key === userOutcome)?.label}
              </span>
            </div>

            {didWin ? (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-green-400 font-bold">You won!</p>
                {alreadyClaimed ? (
                  <p className="text-xs text-muted-foreground">Winnings already claimed and transferred.</p>
                ) : (
                  <Button
                    onClick={handleClaim}
                    disabled={claimWinnings.isPending}
                    className="btn-bat"
                  >
                    {claimWinnings.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Claiming...</>
                    ) : (
                      <><Coins className="w-4 h-4 mr-2" /> Claim & Transfer GEN</>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <p className="text-red-400 font-semibold text-sm">Better luck next time</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verdict was {OUTCOMES.find((o) => o.key === winningOutcome)?.label}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You did not place a bet on this case.
          </p>
        )}
      </div>
    );
  }

  // ---- Open / Defense state: betting interface ----
  if (!isConnected) {
    return (
      <div className="gotham-card p-6 text-center">
        <Coins className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Connect your wallet to place bets with real GEN.</p>
      </div>
    );
  }

  if (isParty) {
    return (
      <div className="gotham-card p-6 text-center">
        <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Plaintiffs and defendants cannot bet on their own case.
        </p>
      </div>
    );
  }

  return (
    <div className="gotham-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold">Place Your Bet</h3>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Parimutuel Pool</span>
      </div>

      {totals && <PoolBar totals={totals} />}

      {escrow !== undefined && escrow > 0 && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Scale className="w-3 h-3" /> Escrow: {formatWei(escrow)}
        </div>
      )}

      {hasBet && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Active bet: </span>
          <span className="font-semibold text-accent">
            {formatWei(bet.amount)} on {OUTCOMES.find((o) => o.key === userOutcome)?.label}
          </span>
          <span className="text-muted-foreground text-xs ml-1">(can add more)</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {OUTCOMES.map((outcome) => {
          const isSelected = selectedOutcome === outcome.key;
          const isCurrentBet = userOutcome === outcome.key;
          return (
            <button
              key={outcome.key}
              onClick={() => setSelectedOutcome(outcome.key)}
              disabled={placeBet.isPending}
              className={`relative rounded-lg border p-3 text-left transition-all ${
                isSelected || isCurrentBet
                  ? `${outcome.bg} ${outcome.border} ring-1 ring-${outcome.color.split("-")[1]}-400`
                  : "border-border hover:border-accent/50 bg-secondary/30"
              }`}
            >
              <div className="text-lg mb-1">{outcome.emoji}</div>
              <div className={`text-xs font-bold ${outcome.color}`}>{outcome.label}</div>
              {isCurrentBet && (
                <div className="absolute top-1.5 right-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          step="0.001"
          placeholder="Amount in GEN..."
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          disabled={placeBet.isPending}
          className="bg-input border-border text-sm"
          min={0.001}
        />
        <Button
          onClick={handlePlaceBet}
          disabled={placeBet.isPending || !selectedOutcome || !betAmount}
          className="btn-bat whitespace-nowrap"
        >
          {placeBet.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Betting...</>
          ) : (
            <><Coins className="w-4 h-4 mr-2" /> Stake GEN</>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Betting closes when judgment is delivered. Winners receive a proportional share of the losing pool via on-chain GEN transfer.
        1 GEN = 10¹⁸ wei.
      </p>
    </div>
  );
}
