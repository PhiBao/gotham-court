import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studionet } from "genlayer-js/chains";
import type { Case, CaseSummary, Bet, CaseBetTotals } from "./types";

class GothamCourt {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: studionet,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    if (studioUrl) {
      config.endpoint = studioUrl;
    }

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      account: address as `0x${string}`,
    };

    this.client = createClient(config);
  }

  async getCaseCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_case_count",
        args: [],
      });
      return Number(count) || 0;
    } catch (error) {
      console.error("Failed to get case count:", error);
      return 0;
    }
  }

  async getCase(caseId: number): Promise<Case | null> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_case",
        args: [caseId],
      });

      const parsed = this.parseMap(data);
      return {
        ...parsed,
        id: Number(parsed.id),
        severity: Number(parsed.severity),
        escrow: parsed.escrow !== undefined ? Number(parsed.escrow) : undefined,
        bet_totals: parsed.bet_totals
          ? this.parseMap(parsed.bet_totals)
          : undefined,
      } as Case;
    } catch (error) {
      console.error("Error fetching case:", error);
      return null;
    }
  }

  async getAllCases(): Promise<CaseSummary[]> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_all_cases",
        args: [],
      });

      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const parsed = this.parseMap(item);
          return {
            ...parsed,
            id: Number(parsed.id),
            severity: Number(parsed.severity),
            bet_totals: parsed.bet_totals
              ? this.parseMap(parsed.bet_totals)
              : undefined,
          } as CaseSummary;
        });
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch cases:", error);
      return [];
    }
  }

  async getBet(caseId: number, bettor: string): Promise<Bet | null> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_bet",
        args: [caseId, bettor],
      });

      const parsed = this.parseMap(data);
      return {
        exists: Boolean(parsed.exists),
        bettor: String(parsed.bettor || ""),
        case_id: Number(parsed.case_id),
        outcome: String(parsed.outcome || ""),
        amount: Number(parsed.amount),
        claimed: Boolean(parsed.claimed),
      } as Bet;
    } catch (error) {
      console.error("Error fetching bet:", error);
      return null;
    }
  }

  async getCaseBetTotals(caseId: number): Promise<CaseBetTotals | null> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_case_bet_totals",
        args: [caseId],
      });

      const parsed = this.parseMap(data);
      return {
        guilty: Number(parsed.guilty || 0),
        not_guilty: Number(parsed.not_guilty || 0),
        insufficient_evidence: Number(parsed.insufficient_evidence || 0),
      } as CaseBetTotals;
    } catch (error) {
      console.error("Error fetching bet totals:", error);
      return null;
    }
  }

  async getContractBalance(): Promise<number> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_contract_balance",
        args: [],
      });
      return Number(data) || 0;
    } catch (error) {
      console.error("Error fetching contract balance:", error);
      return 0;
    }
  }

  async getCaseEscrow(caseId: number): Promise<number> {
    try {
      const data: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_case_escrow",
        args: [caseId],
      });
      return Number(data) || 0;
    } catch (error) {
      console.error("Error fetching case escrow:", error);
      return 0;
    }
  }

  async fileCase(
    defendant: string,
    title: string,
    description: string,
    evidenceUrls: string
  ): Promise<any> {
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "file_case",
      args: [defendant, title, description, evidenceUrls],
      value: BigInt(0),
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 100,
    });

    return receipt;
  }

  async submitDefense(
    caseId: number,
    defenseText: string,
    defenseUrls: string
  ): Promise<any> {
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_defense",
      args: [caseId, defenseText, defenseUrls],
      value: BigInt(0),
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 100,
    });

    return receipt;
  }

  async judgeCase(caseId: number): Promise<any> {
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "judge_case",
      args: [caseId],
      value: BigInt(0),
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 200,
    });

    return receipt;
  }

  async placeBet(
    caseId: number,
    outcome: string,
    amountWei: bigint
  ): Promise<any> {
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "place_bet",
      args: [caseId, outcome],
      value: amountWei,
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 100,
    });

    return receipt;
  }

  async claimWinnings(caseId: number): Promise<any> {
    const hash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "claim_winnings",
      args: [caseId],
      value: BigInt(0),
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      retries: 100,
    });

    return receipt;
  }

  /**
   * Helper to normalize Map responses from genlayer-js readContract.
   * Converts nested Maps to plain objects and BigInt values to numbers.
   */
  private parseMap(data: any): any {
    if (data instanceof Map) {
      const obj: any = {};
      data.forEach((value: any, key: any) => {
        if (value instanceof Map) {
          obj[key] = this.parseMap(value);
        } else if (typeof value === "bigint") {
          obj[key] = Number(value);
        } else {
          obj[key] = value;
        }
      });
      return obj;
    }
    if (typeof data === "bigint") {
      return Number(data);
    }
    return data;
  }
}

export default GothamCourt;
