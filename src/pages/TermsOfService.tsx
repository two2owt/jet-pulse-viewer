import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-2">Jet Mobile App</p>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground/80">
              By accessing and using Jet Mobile App ("JET", "we", "our", or "us") at{" "}
              <a href="https://jet-around.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://jet-around.com/
              </a>, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-foreground/80">
              Jet Mobile App provides a platform to discover local deals, events, and venue information based on your location. We reserve the right to modify or discontinue the service at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-foreground/80 mb-4">
              When you create an account with Jet Mobile App, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Be at least 13 years old</li>
              <li>Not share your account with others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. User Conduct</h2>
            <p className="text-foreground/80 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with other users' use of the service</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Scrape or harvest data without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Content and Intellectual Property</h2>
            <p className="text-foreground/80">
              All content, features, and functionality are owned by Jet Mobile App and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Location Services</h2>
            <p className="text-foreground/80">
              Jet Mobile App uses location data to provide you with relevant deals. By using location features, you consent to the collection and use of your location information as described in our{" "}
              <a href="https://jet-around.com/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Third-Party Links</h2>
            <p className="text-foreground/80">
              Our service may contain links to third-party websites. We are not responsible for the content or practices of these external sites.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Disclaimers</h2>
            <p className="text-foreground/80 mb-4">
              The service is provided "as is" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Uninterrupted or error-free service</li>
              <li>Accuracy of venue information or deals</li>
              <li>That defects will be corrected</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
            <p className="text-foreground/80">
              Jet Mobile App shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
            <p className="text-foreground/80">
              We may terminate or suspend your account at any time for violations of these terms. You may also terminate your account at any time through your profile settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
            <p className="text-foreground/80">
              We reserve the right to modify these terms at any time. Updates will be posted at{" "}
              <a href="https://jet-around.com/terms-of-service" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://jet-around.com/terms-of-service
              </a>. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
            <p className="text-foreground/80">
              For questions about these terms, please contact us at{" "}
              <a href="mailto:legal@jet-around.com" className="text-primary hover:underline">
                legal@jet-around.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
