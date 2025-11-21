// Payment dialog - prompts user to pay $0.99 to unlock save and export features

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Check, Loader2, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createCheckoutSession } from "../lib/api-auth";
import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "../types/api";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluationData: {
    prdTitle: string;
    prdText: string;
    binaryScore: BinaryScoreOutput;
    fixPlan: FixPlanOutput;
    agentTasks: AgentTasksOutput;
  } | null;
}

export function PaymentDialog({ open, onOpenChange, evaluationData }: PaymentDialogProps) {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!user || !evaluationData) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get Firebase ID token
      const token = await user.getIdToken();

      // Create Stripe Checkout session
      const { checkoutUrl } = await createCheckoutSession(evaluationData, token);

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error("Payment initiation failed:", err);
      setError(err?.message || "Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  // If user is not signed in, show sign-in prompt
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="dialog-title text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-chart-4" />
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              Please sign in with your Google account to unlock save and export features.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You'll be able to pay $0.99 to unlock this evaluation after signing in.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="dialog-title text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-chart-4" />
            Unlock This Evaluation
          </DialogTitle>
          <DialogDescription>
            Pay once to permanently save this evaluation and export as Markdown/JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Price */}
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground mb-1">$0.99</div>
            <div className="text-sm text-muted-foreground">one-time payment</div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-chart-2" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Save to your account</p>
                <p className="text-xs text-muted-foreground">
                  Access this evaluation anytime from your dashboard
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-chart-2" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Export as Markdown/JSON</p>
                <p className="text-xs text-muted-foreground">
                  Download full evaluation results in your preferred format
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-chart-2" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Secure payment via Stripe</p>
                <p className="text-xs text-muted-foreground">
                  We never store your payment details
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Pay button */}
          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay $0.99 with Stripe
              </>
            )}
          </Button>

          {/* Privacy note */}
          <p className="text-xs text-center text-muted-foreground">
            Payment processed securely by Stripe. Your PRD data is saved only after successful payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

