"use client";

import { useState } from "react";
import { ArrowLeft, Gavel, Shield, Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { Case } from "@/lib/contracts/types";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import { success, error } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

/* ---- Timeline ---- */

function CaseTimeline({ status }: { status: string }) {
  const steps = [
    { key: "OPEN", label: "Case Filed", icon: FileText },
    { key: "DEFENSE", label: "Defense Submitted", icon: Shield },
    { key: "JUDGED", label: "Verdict Delivered", icon: Gavel },
  ];

  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done
                    ? active
                      ? "bg-accent border-accent text-accent-foreground"
                      : "bg-accent/20 border-accent/40 text-accent"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                {done && !active ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[10px] text-center ${done ? "text-accent" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full mt-[-16px] ${
                i < currentIdx ? "bg-accent/40" : "bg-border"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Severity Display ---- */

function SeverityDisplay({ severity }: { severity: number }) {
  if (severity <= 0) return null;
  const color = severity <= 3 ? "oklch(0.7 0.18 145)" : severity <= 6 ? "oklch(0.85 0.17 85)" : "oklch(0.6 0.22 25)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-2 h-4 rounded-[2px]"
            style={{ background: i < severity ? color : "oklch(0.2 0 0)" }}
          />
        ))}
      </div>
      <span className="text-sm font-bold">{severity}/10</span>
    </div>
  );
}

/* ---- Main Component ---- */

interface CaseDetailProps {
  caseData: Case;
  onBack: () => void;
}

export function CaseDetail({ caseData, onBack }: CaseDetailProps) {
  const { address } = useWallet();
  const { submitDefense, judgeCase } = useGothamCourt();

  const [defenseText, setDefenseText] = useState("");
  const [defenseUrls, setDefenseUrls] = useState("");

  const isDefendant = address?.toLowerCase() === caseData.defendant?.toLowerCase();
  const canDefend = caseData.status === "OPEN" && isDefendant;
  const canJudge = caseData.status === "DEFENSE";
  const isJudged = caseData.status === "JUDGED";

  const handleDefend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defenseText) {
      error("Defense text is required");
      return;
    }
    try {
      await submitDefense.mutateAsync({
        caseId: caseData.id,
        defenseText,
        defenseUrls,
      });
      success("Defense submitted!", { description: "The court will review the evidence." });
    } catch (err: any) {
      if (err.message?.includes("rejected")) error("Transaction cancelled");
      else error("Failed to submit defense", { description: err.message });
    }
  };

  const handleJudge = async () => {
    try {
      await judgeCase.mutateAsync({ caseId: caseData.id });
      success("Verdict delivered!", { description: "Justice has been served in Gotham." });
    } catch (err: any) {
      if (err.message?.includes("rejected")) error("Transaction cancelled");
      else error("Judgment failed", { description: err.message });
    }
  };

  const verdictColor =
    caseData.verdict === "GUILTY"
      ? "verdict-guilty"
      : caseData.verdict === "NOT_GUILTY"
      ? "verdict-not-guilty"
      : "verdict-insufficient";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            Case <span className="text-accent">#{caseData.id}</span>
          </h2>
          <p className="text-muted-foreground text-sm">{caseData.title}</p>
        </div>
      </div>

      {/* Timeline */}
      <CaseTimeline status={caseData.status} />

      {/* Case Info */}
      <div className="gotham-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Plaintiff</p>
            <AddressDisplay address={caseData.plaintiff} maxLength={20} showCopy className="text-sm" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Defendant</p>
            <AddressDisplay address={caseData.defendant} maxLength={20} showCopy className="text-sm" />
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{caseData.description}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Plaintiff Evidence</p>
          <div className="flex flex-wrap gap-2">
            {caseData.evidence_urls?.split(",").map((url, i) => (
              <a
                key={i}
                href={url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline break-all bg-accent/10 px-2 py-1 rounded"
              >
                {url.trim()}
              </a>
            ))}
          </div>
        </div>

        {caseData.defense_text && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Defense Statement</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{caseData.defense_text}</p>
            </div>
            {caseData.defense_urls && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Defense Evidence</p>
                <div className="flex flex-wrap gap-2">
                  {caseData.defense_urls.split(",").map((url, i) => (
                    <a
                      key={i}
                      href={url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline break-all bg-accent/10 px-2 py-1 rounded"
                    >
                      {url.trim()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Verdict */}
      {isJudged && (
        <div className={`gotham-card p-6 border-2 relative overflow-hidden animate-[fadeInScale_0.5s_ease-out] ${verdictColor}`} style={{ borderColor: "inherit" }}>
          {/* Glow background */}
          <div className={`absolute inset-0 opacity-10 ${
            caseData.verdict === "GUILTY" ? "bg-red-500" : caseData.verdict === "NOT_GUILTY" ? "bg-green-500" : "bg-amber-500"
          } blur-2xl`} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Gavel className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold tracking-wide">The Court&apos;s Verdict</h3>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-md text-base font-black tracking-wider ${verdictColor}`}>
                  {caseData.verdict === "GUILTY" ? "⚡ GUILTY" : caseData.verdict === "NOT_GUILTY" ? "🛡️ NOT GUILTY" : "🔍 INSUFFICIENT EVIDENCE"}
                </span>
                <SeverityDisplay severity={caseData.severity} />
              </div>
              {caseData.reasoning && (
                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                    <span className="text-accent">🤖</span> AI Judges&apos; Reasoning
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{caseData.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Defense Form */}
      {canDefend && (
        <div className="gotham-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold">Submit Your Defense</h3>
          </div>
          <form onSubmit={handleDefend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defense-text">Defense Statement</Label>
              <textarea
                id="defense-text"
                placeholder="Present your defense..."
                value={defenseText}
                onChange={(e) => setDefenseText(e.target.value)}
                className="w-full min-h-[100px] rounded-md bg-input border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={submitDefense.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defense-urls">Defense Evidence URLs (optional)</Label>
              <Input
                id="defense-urls"
                placeholder="https://... (comma-separated)"
                value={defenseUrls}
                onChange={(e) => setDefenseUrls(e.target.value)}
                className="bg-input border-border text-sm"
                disabled={submitDefense.isPending}
              />
            </div>
            <Button type="submit" disabled={submitDefense.isPending || !defenseText} className="btn-bat">
              {submitDefense.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" /> Submit Defense</>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Judge Button */}
      {canJudge && (
        <div className="gotham-card p-6 text-center">
          {judgeCase.isPending ? (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-8 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute -inset-4 rounded-full border border-accent/30 animate-pulse" />
                  <Gavel className="relative w-12 h-12 text-accent animate-bounce" style={{ animationDuration: "1.5s" }} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">AI Judges Deliberating...</h3>
                <p className="text-sm text-muted-foreground">This may take a minute. Gotham&apos;s justice is thorough.</p>
              </div>
              <div className="max-w-md mx-auto space-y-3">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full animate-[judgeProgress_90s_ease-in-out_forwards]" />
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="animate-pulse">🔍 Scraping evidence from submitted URLs...</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.5s" }}>🤖 AI analyzing arguments from both sides...</span>
                  <span className="animate-pulse" style={{ animationDelay: "1s" }}>⚖️ Reaching consensus via Optimistic Democracy...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <Gavel className="w-8 h-8 text-accent mx-auto mb-3" />
              <p className="text-muted-foreground mb-5">
                Both sides have presented their case. The evidence is ready.
              </p>
              <Button onClick={handleJudge} className="btn-bat h-12 px-10 text-lg font-bold">
                <Gavel className="w-5 h-5 mr-2" /> Deliver Judgment
              </Button>
              <p className="text-xs text-muted-foreground/50 mt-3">
                Anyone can trigger judgment — AI consensus ensures fairness.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Waiting */}
      {caseData.status === "OPEN" && !isDefendant && (
        <div className="gotham-card p-6 text-center">
          <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            Waiting for the defendant to submit their defense...
          </p>
        </div>
      )}
    </div>
  );
}
