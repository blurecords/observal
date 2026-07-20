import {
  Equipment,
  Hero,
  HowItWorks,
  LandingFooter,
  LandingNav,
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
      </main>
      <LandingFooter />
    </>
  );
}
