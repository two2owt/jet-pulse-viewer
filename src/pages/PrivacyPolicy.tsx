import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-2">Jet Mobile App</p>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-foreground/80 mb-4">
              Welcome to Jet Mobile App ("JET", "we", "our", or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website at{" "}
              <a href="https://jet-around.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://jet-around.com/
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="text-foreground/80 mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Account information (email, display name, profile picture)</li>
              <li>Location data (when you enable location services)</li>
              <li>Usage data and preferences</li>
              <li>Device information and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground/80 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Provide, maintain, and improve the Jet Mobile App</li>
              <li>Send you nearby deals and notifications</li>
              <li>Personalize your experience</li>
              <li>Analyze usage patterns to improve the app</li>
              <li>Communicate with you about updates and features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Location Data</h2>
            <p className="text-foreground/80 mb-4">
              Jet Mobile App collects location data to show you relevant deals and venues near you. You can:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Control location permissions in your device settings</li>
              <li>Disable location tracking at any time</li>
              <li>Delete your location history from your profile</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
            <p className="text-foreground/80">
              We implement industry-standard security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Third-Party Services</h2>
            <p className="text-foreground/80 mb-4">
              Jet Mobile App uses third-party services for analytics, authentication, and storage. These services have their own privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Your Rights</h2>
            <p className="text-foreground/80 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Access your personal data</li>
              <li>Request data deletion</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <p className="text-foreground/80">
              Jet Mobile App is not intended for children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Changes to This Policy</h2>
            <p className="text-foreground/80">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy at{" "}
              <a href="https://jet-around.com/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://jet-around.com/privacy-policy
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <p className="text-foreground/80">
              If you have questions about this privacy policy, please contact us at{" "}
              <a href="mailto:privacy@jet-around.com" className="text-primary hover:underline">
                privacy@jet-around.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
