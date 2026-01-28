import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer 
      className="border-t border-border/50 mt-12 py-6 px-4 bg-background"
      style={{
        // Containment prevents CLS propagation and isolates from map rendering
        contain: 'layout style',
        transform: 'translateZ(0)',
        // Create isolated stacking context to prevent map z-index bleed
        isolation: 'isolate',
        // Explicit position to prevent layout recalculation
        position: 'relative',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Jet Mobile App. All rights reserved.</p>
          <div className="flex gap-6">
            <a 
              href="mailto:creativebreakroominfo@gmail.com"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <Link 
              to="/privacy-policy" 
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms-of-service" 
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
