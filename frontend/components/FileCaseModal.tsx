"use client";

import { useState } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGothamCourt } from "@/lib/hooks/useGothamCourt";
import { success, error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface FileCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="w-3 h-3" /> {message}
    </p>
  );
}

export function FileCaseModal({ open, onOpenChange }: FileCaseModalProps) {
  const { isConnected } = useWallet();
  const { fileCase } = useGothamCourt();

  const [defendant, setDefendant] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isSubmitting = fileCase.isPending;

  const errors: Record<string, string | undefined> = {
    defendant: !defendant
      ? "Defendant address is required"
      : !defendant.startsWith("0x") || defendant.length !== 42
      ? "Must be a valid 0x address (42 characters)"
      : undefined,
    title: !title ? "Case title is required" : title.length < 3 ? "Title too short" : undefined,
    description: !description ? "Description is required" : undefined,
    evidenceUrls: !evidenceUrls ? "At least one evidence URL is required" : undefined,
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const resetForm = () => {
    setDefendant("");
    setTitle("");
    setDescription("");
    setEvidenceUrls("");
    setTouched({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ defendant: true, title: true, description: true, evidenceUrls: true });

    if (hasErrors) return;

    try {
      await fileCase.mutateAsync({ defendant, title, description, evidenceUrls });
      success("Case filed successfully!", {
        description: "The Bat-Signal has been lit. Justice awaits.",
      });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      if (err.message?.includes("rejected")) {
        error("Transaction cancelled");
      } else {
        error("Failed to file case", {
          description: err.message || "Please try again.",
        });
      }
    }
  };

  if (!isConnected) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gotham-card border-accent/20 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            <span className="text-accent">File</span> a New Case
          </DialogTitle>
          <DialogDescription>
            Present your evidence to Gotham Court. AI judges will evaluate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="defendant">Defendant Address</Label>
            <Input
              id="defendant"
              placeholder="0x..."
              value={defendant}
              onChange={(e) => setDefendant(e.target.value)}
              onBlur={() => markTouched("defendant")}
              className={`font-mono text-sm bg-input border-border ${touched.defendant && errors.defendant ? "border-destructive" : ""}`}
              disabled={isSubmitting}
            />
            {touched.defendant && <FieldError message={errors.defendant} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Case Title</Label>
            <Input
              id="title"
              placeholder="Brief title for the dispute"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => markTouched("title")}
              className={`bg-input border-border ${touched.title && errors.title ? "border-destructive" : ""}`}
              disabled={isSubmitting}
            />
            {touched.title && <FieldError message={errors.title} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Describe the dispute in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => markTouched("description")}
              className={`w-full min-h-[80px] rounded-md bg-input border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${touched.description && errors.description ? "border-destructive" : ""}`}
              disabled={isSubmitting}
            />
            {touched.description && <FieldError message={errors.description} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evidence">Evidence URLs</Label>
            <Input
              id="evidence"
              placeholder="https://example.com/evidence (comma-separated)"
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              onBlur={() => markTouched("evidenceUrls")}
              className={`bg-input border-border text-sm ${touched.evidenceUrls && errors.evidenceUrls ? "border-destructive" : ""}`}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Provide URLs to evidence. Separate multiple with commas.
            </p>
            {touched.evidenceUrls && <FieldError message={errors.evidenceUrls} />}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-bat h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Filing Case...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                File Case
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
