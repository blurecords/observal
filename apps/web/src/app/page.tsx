import {
  Equipment,
  Hero,
  HowItWorks,
  LandingFooter,
  LandingNav,
  MuseumCase,
} from "@/components/landing/sections";

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Equipment />
        <MuseumCase />
      </main>
      <LandingFooter />
    </>
  );
}
