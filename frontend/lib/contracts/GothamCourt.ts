import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studionet } from "genlayer-js/chains";
import type { Case, CaseSummary } from "./types";

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

      if (data instanceof Map) {
        const obj: any = {};
        data.forEach((value: any, key: any) => {
          obj[key] = value;
        });
        return {
          ...obj,
          id: Number(obj.id),
          severity: Number(obj.severity),
        } as Case;
      }

      return {
        ...data,
        id: Number(data.id),
        severity: Number(data.severity),
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
          if (item instanceof Map) {
            const obj: any = {};
            item.forEach((value: any, key: any) => {
              obj[key] = value;
            });
            return {
              ...obj,
              id: Number(obj.id),
              severity: Number(obj.severity),
            } as CaseSummary;
          }
          return {
            ...item,
            id: Number(item.id),
            severity: Number(item.severity),
          } as CaseSummary;
        });
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch cases:", error);
      return [];
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
}

export default GothamCourt;
