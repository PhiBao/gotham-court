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
              <div className="text-center mb-10 animate-fade-in">
                <p className="text-5xl mb-4">🦇</p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="text-accent">GOTHAM</span> COURT
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Decentralized AI-powered dispute resolution.
                  <br />
                  File cases. Present evidence. Let AI judges deliver justice.
                </p>
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
                className="mt-10 gotham-card p-6 md:p-8 animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <h2 className="text-2xl font-bold mb-4">
                  How <span className="text-accent">Justice</span> Works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { step: "1", title: "File Case", desc: "Light the Bat-Signal. Identify the defendant, describe the dispute, and present evidence URLs." },
                    { step: "2", title: "Defense", desc: "The defendant submits their defense statement and counter-evidence for review." },
                    { step: "3", title: "AI Judgment", desc: "AI judges scrape evidence, analyze both sides, and deliver a verdict via Optimistic Democracy." },
                    { step: "4", title: "Verdict", desc: "Guilty, Not Guilty, or Insufficient Evidence. Results stored on-chain permanently." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="space-y-2">
                      <div className="text-accent font-bold text-lg">
                        {step}. {title}
                      </div>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
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
