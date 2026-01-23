import { HeroSection } from "@/components/sections/hero-section"
import { HomepageFeaturesSection } from "@/components/sections/homepage-features-section"
import { ProcessSection } from "@/components/sections/process-section"
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
      <HomepageFeaturesSection dict={dict} locale={locale} />
      <ProcessSection dict={dict} locale={locale} />
      <FAQSection dict={dict} locale={locale} />
      <CTASection dict={dict} locale={locale} />
    </>
  )
}
