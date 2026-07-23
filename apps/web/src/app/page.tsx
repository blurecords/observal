import {
  Equipment,
  Hero,
  HowItWorks,
  LandingFooter,
  LandingNav,
  Pricing,
  UseCases,
} from "@/components/landing/sections";
import { AuthOAuthRedirect } from "@/components/auth-oauth-redirect";

export default function HomePage() {
  return (
    <>
      <AuthOAuthRedirect />
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
