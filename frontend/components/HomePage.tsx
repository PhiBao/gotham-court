"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { CaseFeed } from "@/components/CaseFeed";
import { CaseDetail } from "@/components/CaseDetail";
import { FileCaseModal } from "@/components/FileCaseModal";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import { Case } from "@/lib/contracts/types";

export default function HomePage() {
  const { cases, isLoading, useCase } = useGothamCourt();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [fileCaseOpen, setFileCaseOpen] = useState(false);

  const openFileCase = useCallback(() => setFileCaseOpen(true), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onFileCaseClick={openFileCase} />
      <FileCaseModal open={fileCaseOpen} onOpenChange={setFileCaseOpen} />

      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {selectedCaseId !== null ? (
            <CaseDetailWrapper
              caseId={selectedCaseId}
              onBack={() => setSelectedCaseId(null)}
              useCase={useCase}
            />
          ) : (
            <>
              {/* Hero */}
              <div className="text-center mb-12 animate-fade-in">
                {/* Bat-Signal Glow */}
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 blur-3xl bg-accent/20 rounded-full scale-150 animate-pulse-glow" />
                  <p className="relative text-7xl" style={{ filter: "drop-shadow(0 0 24px oklch(0.85 0.17 85 / 0.5))" }}>🦇</p>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
                  <span className="text-accent" style={{ textShadow: "0 0 40px oklch(0.85 0.17 85 / 0.3)" }}>GOTHAM</span>{" "}
                  <span className="text-foreground">COURT</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Decentralized AI-powered dispute resolution on{" "}
                  <span className="text-accent font-semibold">GenLayer</span>.
                </p>
                <p className="text-sm text-muted-foreground/60 mt-2 italic">
                  File cases. Present evidence. Let AI judges deliver justice.
                </p>
                {!cases?.length && (
                  <div className="mt-8">
                    <button onClick={openFileCase} className="btn-bat px-8 py-3 text-base font-bold animate-pulse-glow">
                      ⚡ Light the Bat-Signal
                    </button>
                  </div>
                )}
              </div>

              {/* Case Feed */}
              <div className="animate-slide-up">
                <CaseFeed
                  cases={cases}
                  isLoading={isLoading}
                  onSelectCase={setSelectedCaseId}
                  onFileCaseClick={openFileCase}
                />
              </div>

              {/* How It Works */}
              <div
                className="mt-12 gotham-card p-6 md:p-8 animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <h2 className="text-2xl font-bold mb-6">
                  How <span className="text-accent">Justice</span> Works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { step: "1", emoji: "🔦", title: "File Case", desc: "Light the Bat-Signal. Identify the defendant, present your evidence, and state your case." },
                    { step: "2", emoji: "🛡️", title: "Defense", desc: "The accused answers the charges. Submit a defense statement and counter-evidence." },
                    { step: "3", emoji: "🤖", title: "AI Judgment", desc: "AI judges scrape evidence, analyze arguments, and reach consensus via Optimistic Democracy." },
                    { step: "4", emoji: "⚖️", title: "Verdict", desc: "Guilty, Not Guilty, or Insufficient Evidence — etched on-chain permanently." },
                  ].map(({ step, emoji, title, desc }) => (
                    <div key={step} className="space-y-3 text-center md:text-left">
                      <div className="text-3xl">{emoji}</div>
                      <div className="text-accent font-bold text-base">
                        {title}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Footer */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground/50 animate-fade-in" style={{ animationDelay: "400ms" }}>
                <span className="bg-secondary/50 px-2.5 py-1 rounded-full">GenLayer SDK</span>
                <span className="bg-secondary/50 px-2.5 py-1 rounded-full">Optimistic Democracy</span>
                <span className="bg-secondary/50 px-2.5 py-1 rounded-full">AI Consensus</span>
                <span className="bg-secondary/50 px-2.5 py-1 rounded-full">On-Chain Verdicts</span>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-accent/10 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="text-accent/60">🦇 Gotham Court</span>
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Powered by GenLayer
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CaseDetailWrapper({
  caseId,
  onBack,
  useCase,
}: {
  caseId: number;
  onBack: () => void;
  useCase: (id: number) => any;
}) {
  const { data: caseData, isLoading } = useCase(caseId);

  if (isLoading || !caseData) {
    return (
      <div className="gotham-card p-8 text-center animate-pulse space-y-3">
        <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
        <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
        <div className="h-32 bg-muted rounded w-full mt-4" />
      </div>
    );
  }

  return <CaseDetail caseData={caseData as Case} onBack={onBack} />;
}
