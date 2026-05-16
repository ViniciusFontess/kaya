import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingProof } from '@/components/landing/LandingProof'
import { LandingCTA } from '@/components/landing/LandingCTA'

export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <LandingHero />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingProof />
      <LandingCTA />
    </main>
  )
}
