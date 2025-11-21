// Payment cancel page - shown when user cancels Stripe payment

import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

export function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Cancel icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-chart-4/20 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-chart-4" />
        </div>

        {/* Cancel message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Payment Cancelled</h2>
          <p className="text-muted-foreground">
            You cancelled the payment. Don't worry - your evaluation results are still visible on this page.
          </p>
        </div>

        {/* What you can do */}
        <div className="rounded-lg border bg-muted/50 p-4 text-left space-y-3">
          <p className="text-sm font-medium text-foreground">What you can do:</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Try payment again to unlock save and export features</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Continue viewing your evaluation results for free</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Take screenshots or notes to save your results manually</span>
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 gap-2"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            Try Payment Again
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Help text */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{" "}
            <a href="mailto:support@evalgpt.com" className="text-primary hover:underline">
              support@evalgpt.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

