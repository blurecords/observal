import {
  Equipment,
  Hero,
  HowItWorks,
  LandingFooter,
  LandingNav,
  Pricing,
  UseCases,
} from "@/components/landing/sections";

export default function HomePage() {
  return (
    <>
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
