import { requireUser } from "@/lib/auth/session";

/**
 * Layout for the onboarding wizard.
 *
 * This layout only checks authentication - it does NOT redirect to onboarding
 * (which would cause an infinite loop). The onboarding page itself handles
 * the onboarding_completed check.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login when there is no valid session.
  await requireUser();

  return children;
}