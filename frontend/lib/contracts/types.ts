/**
 * TypeScript types for Gotham Court contract
 */

export interface CaseBetTotals {
  guilty: number;
  not_guilty: number;
  insufficient_evidence: number;
}

export interface Case {
  id: number;
  plaintiff: string;
  defendant: string;
  title: string;
  description: string;
  evidence_urls: string;
  defense_text: string;
  defense_urls: string;
  verdict: string;
  reasoning: string;
  severity: number;
  status: "OPEN" | "DEFENSE" | "JUDGED";
  escrow?: number;
  bet_totals?: CaseBetTotals;
}

export interface CaseSummary {
  id: number;
  plaintiff: string;
  defendant: string;
  title: string;
  verdict: string;
  severity: number;
  status: "OPEN" | "DEFENSE" | "JUDGED";
  bet_totals?: CaseBetTotals;
}

export interface Bet {
  exists: boolean;
  bettor: string;
  case_id: number;
  outcome: string;
  amount: number;
  claimed: boolean;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
