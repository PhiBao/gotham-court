/**
 * TypeScript types for Gotham Court contract
 */

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
}

export interface CaseSummary {
  id: number;
  plaintiff: string;
  defendant: string;
  title: string;
  verdict: string;
  severity: number;
  status: "OPEN" | "DEFENSE" | "JUDGED";
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
