import { HeroSection } from "@/components/sections/hero-section"
import { StatsBanner } from "@/components/sections/stats-banner"
import { ProcessSection } from "@/components/sections/process-section"
import { HomepageFeaturesSection } from "@/components/sections/homepage-features-section"
import { TrustSection } from "@/components/sections/trust-section"
import { FAQSection } from "@/components/sections/faq-section"
import { CTASection } from "@/components/sections/cta-section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

interface HomePageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return {
    title: dict.metadata?.title || "Pre-Application System",
    description:
      dict.metadata?.description || "Community pre-application and invite code management system",
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <>
      <HeroSection dict={dict} locale={locale} />
      <StatsBanner dict={dict} locale={locale} />
      <ProcessSection dict={dict} locale={locale} />
      <HomepageFeaturesSection dict={dict} locale={locale} />
      <TrustSection dict={dict} locale={locale} />
      <FAQSection dict={dict} locale={locale} />
      <CTASection dict={dict} locale={locale} />
    </>
  )
}
