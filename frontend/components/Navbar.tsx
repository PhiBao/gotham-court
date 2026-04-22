"use client";

import { useState, useEffect } from "react";
import { AccountPanel } from "./AccountPanel";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import { Plus, Droplets, Trophy, History } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

interface NavbarProps {
  onFileCaseClick?: () => void;
}

export function Navbar({ onFileCaseClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { cases } = useGothamCourt();
  const { isConnected } = useWallet();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalCases = cases?.length || 0;
  const judgedCases = cases?.filter((c) => c.status === "JUDGED").length || 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div
        className={`transition-all duration-300 ${
          isScrolled ? "gotham-navbar shadow-lg" : ""
        }`}
        style={{
          background: isScrolled
            ? undefined
            : "linear-gradient(to bottom, oklch(0.05 0 0 / 0.95) 0%, oklch(0.05 0 0 / 0.6) 100%)",
          backdropFilter: "blur(16px)",
          borderBottom: isScrolled
            ? undefined
            : "1px solid oklch(0.85 0.17 85 / 0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦇</span>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-accent">GOTHAM</span>
                <span className="text-foreground ml-1">COURT</span>
              </span>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Cases:</span>
                <span className="font-bold text-accent">{totalCases}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Judged:</span>
                <span className="font-bold text-accent">{judgedCases}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 hidden md:inline-flex">
                  <Trophy className="w-4 h-4 mr-1" />
                  Leaderboard
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 hover:bg-accent/10 hidden md:inline-flex">
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
              </Link>
              <Link href="/faucet">
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                  <Droplets className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Faucet</span>
                </Button>
              </Link>
              {isConnected && onFileCaseClick && (
                <Button variant="default" size="sm" className="btn-bat" onClick={onFileCaseClick}>
                  <Plus className="w-4 h-4 mr-1" />
                  File Case
                </Button>
              )}
              <AccountPanel />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
