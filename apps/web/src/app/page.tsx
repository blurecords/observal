import {
  Equipment,
  Hero,
  HowItWorks,
  LandingFooter,
  LandingNav,
  Pricing,
  UseCases,
} from "@/components/landing/sections";
import { AuthErrorRedirect } from "@/components/auth-error-redirect";

export default function HomePage() {
  return (
    <>
      <AuthErrorRedirect />
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Equipment />
        <UseCases />
        <Pricing />
      </main>
      <LandingFooter />
    </>
  );
}
