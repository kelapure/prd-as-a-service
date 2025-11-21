// Payment success page - shown after successful Stripe payment

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Simulate brief loading to allow webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Processing Payment...</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment and save your evaluation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-chart-2/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-chart-2" />
        </div>

        {/* Success message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
          <p className="text-muted-foreground">
            Your evaluation has been saved to your account. You can now export it as Markdown or JSON.
          </p>
        </div>

        {/* Session ID (for reference) */}
        {sessionId && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Payment Reference</p>
            <p className="text-xs font-mono text-foreground break-all">{sessionId}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => navigate("/my-evaluations")}
            className="flex-1 gap-2"
            size="lg"
          >
            View My Evaluations
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Back to Home
          </Button>
        </div>

        {/* Additional info */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            A receipt has been sent to your email address.
          </p>
        </div>
      </div>
    </div>
  );
}

