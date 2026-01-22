import { HeroSection } from "@/components/sections/hero-section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import type { Locale } from "@/lib/i18n/config"

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  return <HeroSection dict={dict} locale={locale} />
}
