import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Navigation</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                to="/about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About Us
              </Link>
              <Link
                to="/faq"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Resources</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                to="/quickstart"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Quickstart Guide
              </Link>
              <a
                href="https://docs.google.com/document/d/121jGQMd0n5nkMW6a32CURKZonBf7t-elGh70G0idV4w/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Documentation
              </a>
            </nav>
          </div>

          {/* Attribution */}
          <div>
            <a
              href="https://www.linkedin.com/in/rohitkelapure/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              <Linkedin className="w-4 h-4" />
              Created by Rohit Kelapure
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} PRD-as-a-Service by Rohit Kelapure. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

