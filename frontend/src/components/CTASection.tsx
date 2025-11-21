import { Button } from "./ui/button";

interface CTASectionProps {
  onEvaluateClick: () => void;
}

export function CTASection({ onEvaluateClick }: CTASectionProps) {
  return (
    <section className="px-6 pt-6 pb-32 bg-background">
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-3"
            asChild
          >
            <a href="https://docs.google.com/document/d/121jGQMd0n5nkMW6a32CURKZonBf7t-elGh70G0idV4w/edit?usp=sharing" target="_blank" rel="noopener noreferrer">
              View Documentation
            </a>
          </Button>
        </div>

        {/* Attribution */}
        <div className="pt-12 border-t border-border">
          <div className="text-center">
            <p className="text-muted-foreground">
              Built with{" "}
              <a
                href="https://8090.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline transition-colors"
              >
                8090.ai
              </a>
              {" "}Software Factory by{" "}
              <a
                href="https://www.linkedin.com/in/rohitkelapure/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline transition-colors"
              >
                Rohit Kelapure
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}