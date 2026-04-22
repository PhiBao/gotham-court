"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { getEthereumProvider } from "@/lib/genlayer/client";
import {
  Droplets,
  ExternalLink,
  Copy,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

const GEN_DECIMALS = 18;

function formatGen(weiHex: string): string {
  const wei = BigInt(weiHex);
  const whole = wei / BigInt(10 ** GEN_DECIMALS);
  const fraction = (wei % BigInt(10 ** GEN_DECIMALS)).toString().padStart(GEN_DECIMALS, "0");
  const trimmed = fraction.replace(/0+$/, "");
  if (!trimmed) return `${whole} GEN`;
  return `${whole}.${trimmed.slice(0, 4)} GEN`;
}

const FAUCETS = [
  {
    name: "GenLayer Labs Trivia Faucet",
    url: "https://genlayerlabs.github.io/trivia-faucet/",
    description: "Answer the question about GenLayer. An AI evaluator grades your response (1–5 stars) and you earn 10 GEN per star. Funds are sent after the transaction is finalized (~30 min).",
    network: "Bradbury Testnet",
  },
  {
    name: "GenLayer Testnet Faucet",
    url: "https://testnet-faucet.genlayer.foundation",
    description: "Official testnet faucet for Asimov and Bradbury networks.",
    network: "testnet",
  },
];

export default function FaucetPage() {
  const { address, isConnected } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    const provider = getEthereumProvider();
    if (!provider) return;

    try {
      setIsLoadingBalance(true);
      const result = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      setBalance(formatGen(result));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchBalance]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-3xl bg-blue-500/20 rounded-full scale-150 animate-pulse" />
              <Droplets className="relative w-16 h-16 text-blue-400 mx-auto" />
            </div>
            <h1 className="text-4xl font-bold">
              <span className="text-blue-400">GEN</span> Faucet
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get GEN tokens to place real bets in Gotham Court. All betting uses native GEN transfers on-chain.
            </p>
          </div>

          {/* Wallet Card */}
          <div className="gotham-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold">Your Wallet</h2>
            </div>

            {!isConnected ? (
              <div className="text-center py-6 space-y-3">
                <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Connect your MetaMask wallet to see your GEN balance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="w-4 h-4 text-accent flex-shrink-0" />
                    <code className="text-sm font-mono truncate">{address}</code>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 rounded-md hover:bg-accent/10 transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <div className="flex items-center gap-2">
                    {isLoadingBalance && !balance ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-xl font-bold text-accent">
                        {balance ?? "—"}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={fetchBalance}
                  disabled={isLoadingBalance}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {isLoadingBalance ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing...</>
                  ) : (
                    <><Wallet className="w-4 h-4 mr-2" /> Refresh Balance</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Faucet Links */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              Faucet Sources
            </h2>

            {FAUCETS.map((faucet) => (
              <a
                key={faucet.name}
                href={faucet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block gotham-card gotham-card-hover p-5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-accent transition-colors">
                        {faucet.name}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground">{faucet.description}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {faucet.network}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* How Betting Uses GEN */}
          <div className="gotham-card p-6 space-y-3">
            <h2 className="text-lg font-bold">How Betting Works</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Gotham Court uses a <strong className="text-foreground">parimutuel pool</strong> model. All bets on a case are pooled together in native GEN tokens.
              </p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>You stake GEN on <strong className="text-foreground">Guilty</strong>, <strong className="text-foreground">Not Guilty</strong>, or <strong className="text-foreground">Insufficient Evidence</strong>.</li>
                <li>Your GEN is held in the contract escrow until the AI judges deliver a verdict.</li>
                <li>Winners split the <em>entire</em> pool proportionally based on their stake.</li>
                <li>When you claim, real GEN is transferred back to your wallet via on-chain message.</li>
              </ol>
            </div>
          </div>

          {/* Back to Court */}
          <div className="text-center">
            <Link href="/">
              <Button variant="outline" className="px-8">
                ← Back to Gotham Court
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
