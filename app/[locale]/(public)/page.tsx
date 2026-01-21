import { HeroSection } from "@/components/sections/hero-section"
import { FeaturesSection } from "@/components/sections/features-section"
import { TechStackSection } from "@/components/sections/tech-stack-section"
import { DeploySection } from "@/components/sections/deploy-section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <>
      <HeroSection dict={dict} />
      <FeaturesSection dict={dict} />
      <TechStackSection dict={dict} />
      <DeploySection dict={dict} />
    </>
  )
}
