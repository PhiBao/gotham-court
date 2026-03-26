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

  return {
    cases: casesQuery.data || [],
    isLoading: casesQuery.isLoading,
    refetchCases: casesQuery.refetch,
    useCase,
    fileCase: fileCaseMutation,
    submitDefense: submitDefenseMutation,
    judgeCase: judgeCaseMutation,
  };
}
