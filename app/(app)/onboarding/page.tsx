import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set up your study plan",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile();

  // If onboarding is already complete, redirect to dashboard
  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  // Pass the user's name from the auth profile to pre-fill the display name
  const initialName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <OnboardingWizard initialName={initialName} />
    </Container>
  );
}