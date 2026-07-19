import type { Metadata } from "next";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Character AI",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <article>
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted">
            Last updated: {new Date().getFullYear()}
          </p>

          <Section title="1. Data we collect">
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-white">Account data:</strong> username,
                email, display name, and a securely hashed password.
              </li>
              <li>
                <strong className="text-white">Content:</strong> characters you
                create, chat messages, and saved (favourited) items.
              </li>
              <li>
                <strong className="text-white">Technical data:</strong> a session
                cookie, a CSRF cookie, and best-effort IP-derived identifiers used
                for rate limiting and security.
              </li>
            </ul>
          </Section>

          <Section title="2. How we use your data">
            To provide the Service: authenticate you, store your characters and
            chats, generate AI responses, prevent abuse and secure the platform,
            and comply with legal obligations. We do not sell your personal data.
          </Section>

          <Section title="3. AI processing">
            To generate character replies, the relevant conversation context is
            sent to our AI model provider (Anthropic) for processing. Only the
            content needed to produce a reply is sent.
          </Section>

          <Section title="4. Cookies">
            We use only strictly necessary cookies: an authentication session
            cookie, a CSRF-protection cookie, an anonymous id cookie, a language
            preference cookie, and a one-time consent cookie. We do not use
            advertising cookies.
          </Section>

          <Section title="5. Data retention">
            We keep your data while your account is active. When you delete your
            account, your characters, conversations, messages and saved items are
            permanently removed.
          </Section>

          <Section title="6. Your rights (GDPR/CCPA)">
            You can access and export your data, and delete your account and all
            associated data, from{" "}
            <a href="/settings" className="text-brand-soft hover:underline">
              account settings
            </a>
            . Depending on your jurisdiction you may have additional rights to
            rectification, restriction, and objection.
          </Section>

          <Section title="7. Security">
            Passwords are hashed with scrypt; session tokens are stored only as
            SHA-256 hashes; all state-changing requests are CSRF-protected and
            rate-limited. No system is perfectly secure, but we apply industry
            practices to protect your data.
          </Section>

          <Section title="8. Children">
            The Service is not directed to anyone under 18. We do not knowingly
            collect data from minors; if we learn we have, we delete it.
          </Section>

          <Section title="9. Changes & contact">
            We may update this policy and will post changes here with a revised
            date. For privacy requests, contact the operator of this deployment.
          </Section>

          <p className="mt-8 rounded-lg border border-line bg-bg-soft p-4 text-xs text-muted">
            This document is a template provided with the open-source project and
            is not legal advice. Operators should have it reviewed by a qualified
            lawyer for their jurisdiction before launch.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
