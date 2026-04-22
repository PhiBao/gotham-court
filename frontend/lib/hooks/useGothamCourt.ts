"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import GothamCourt from "../contracts/GothamCourt";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/WalletProvider";

export function useGothamCourt() {
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const contract = useMemo(() => {
    const contractAddress = getContractAddress();
    const studioUrl = getStudioUrl();
    if (!contractAddress) return null;
    return new GothamCourt(contractAddress, address, studioUrl);
  }, [address]);

  // Fetch all cases
  const casesQuery = useQuery({
    queryKey: ["gotham-cases"],
    queryFn: async () => {
      if (!contract) return [];
      return contract.getAllCases();
    },
    enabled: !!contract,
    refetchInterval: 10000,
  });

  // Fetch single case
  const useCase = (caseId: number) =>
    useQuery({
      queryKey: ["gotham-case", caseId],
      queryFn: async () => {
        if (!contract) return null;
        return contract.getCase(caseId);
      },
      enabled: !!contract && caseId >= 0,
    });

  // File a new case
  const fileCaseMutation = useMutation({
    mutationFn: async (params: {
      defendant: string;
      title: string;
      description: string;
      evidenceUrls: string;
    }) => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.fileCase(
        params.defendant,
        params.title,
        params.description,
        params.evidenceUrls
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gotham-cases"] });
    },
  });

  // Submit defense
  const submitDefenseMutation = useMutation({
    mutationFn: async (params: {
      caseId: number;
      defenseText: string;
      defenseUrls: string;
    }) => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.submitDefense(
        params.caseId,
        params.defenseText,
        params.defenseUrls
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gotham-cases"] });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case", variables.caseId],
      });
    },
  });

  // Judge a case
  const judgeCaseMutation = useMutation({
    mutationFn: async (params: { caseId: number }) => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.judgeCase(params.caseId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gotham-cases"] });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case", variables.caseId],
      });
    },
  });

  // Fetch user bet for a case
  const useBet = (caseId: number, bettorAddress?: string | null) =>
    useQuery({
      queryKey: ["gotham-bet", caseId, bettorAddress],
      queryFn: async () => {
        if (!contract || !bettorAddress) return null;
        return contract.getBet(caseId, bettorAddress);
      },
      enabled: !!contract && !!bettorAddress && caseId >= 0,
      refetchInterval: 10000,
    });

  // Fetch case bet totals
  const useCaseBetTotals = (caseId: number) =>
    useQuery({
      queryKey: ["gotham-bet-totals", caseId],
      queryFn: async () => {
        if (!contract) return null;
        return contract.getCaseBetTotals(caseId);
      },
      enabled: !!contract && caseId >= 0,
      refetchInterval: 10000,
    });

  // Fetch contract balance
  const useContractBalance = () =>
    useQuery({
      queryKey: ["gotham-contract-balance"],
      queryFn: async () => {
        if (!contract) return 0;
        return contract.getContractBalance();
      },
      enabled: !!contract,
      refetchInterval: 15000,
    });

  // Fetch case escrow
  const useCaseEscrow = (caseId: number) =>
    useQuery({
      queryKey: ["gotham-case-escrow", caseId],
      queryFn: async () => {
        if (!contract) return 0;
        return contract.getCaseEscrow(caseId);
      },
      enabled: !!contract && caseId >= 0,
      refetchInterval: 10000,
    });

  // Fetch all user bets across cases
  const useUserBets = (caseIds: number[], bettorAddress?: string | null) =>
    useQuery({
      queryKey: ["gotham-user-bets", bettorAddress, caseIds],
      queryFn: async () => {
        if (!contract || !bettorAddress || caseIds.length === 0) return [];
        const bets = await Promise.all(
          caseIds.map((id) => contract.getBet(id, bettorAddress))
        );
        return bets;
      },
      enabled: !!contract && !!bettorAddress && caseIds.length > 0,
      refetchInterval: 10000,
    });

  // Place a bet (sends real GEN via value field)
  const placeBetMutation = useMutation({
    mutationFn: async (params: {
      caseId: number;
      outcome: string;
      amountWei: bigint;
    }) => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.placeBet(params.caseId, params.outcome, params.amountWei);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gotham-cases"] });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case", variables.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-bet", variables.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-bet-totals", variables.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-contract-balance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case-escrow", variables.caseId],
      });
    },
  });

  // Claim winnings
  const claimWinningsMutation = useMutation({
    mutationFn: async (params: { caseId: number }) => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.claimWinnings(params.caseId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gotham-cases"] });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case", variables.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-bet", variables.caseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-contract-balance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["gotham-case-escrow", variables.caseId],
      });
    },
  });

  return {
    cases: casesQuery.data || [],
    isLoading: casesQuery.isLoading,
    refetchCases: casesQuery.refetch,
    useCase,
    fileCase: fileCaseMutation,
    submitDefense: submitDefenseMutation,
    judgeCase: judgeCaseMutation,
    useBet,
    useCaseBetTotals,
    useContractBalance,
    useCaseEscrow,
    useUserBets,
    placeBet: placeBetMutation,
    claimWinnings: claimWinningsMutation,
  };
}
