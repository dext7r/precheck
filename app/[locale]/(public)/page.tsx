import { HeroSection } from "@/components/sections/hero-section"
import { StatsBanner } from "@/components/sections/stats-banner"
import { ProcessSection } from "@/components/sections/process-section"
import { TrustSection } from "@/components/sections/trust-section"
import { FAQSection } from "@/components/sections/faq-section"
import { CTASection } from "@/components/sections/cta-section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return (
    <>
      <HeroSection dict={dict} locale={locale} />
      <StatsBanner dict={dict} locale={locale} />
      <ProcessSection dict={dict} locale={locale} />
      <TrustSection dict={dict} locale={locale} />
      <FAQSection dict={dict} locale={locale} />
      <CTASection dict={dict} locale={locale} />
    </>
  )
}
