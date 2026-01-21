import type React from "react"
import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getBaseUrl, getAlternateUrls, siteConfig } from "@/lib/seo"
import {
  WebsiteJsonLd,
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
} from "@/components/seo/json-ld"

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const currentLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
  const dict = await getDictionary(currentLocale)
  const baseUrl = getBaseUrl()
  const alternates = getAlternateUrls("")

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: dict.metadata.title,
      template: `%s | ${dict.metadata.title}`,
    },
    description: dict.metadata.description,
    keywords: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Prisma",
      "shadcn/ui",
      "Starter Template",
    ],
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternates,
      types: {
        "application/rss+xml": `${baseUrl}/${locale}/feed.xml`,
        "application/atom+xml": `${baseUrl}/${locale}/atom.xml`,
      },
    },
    openGraph: {
      type: "website",
      locale: currentLocale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: currentLocale === "zh" ? "en_US" : "zh_CN",
      title: dict.metadata.title,
      description: dict.metadata.description,
      siteName: siteConfig.name,
      url: `${baseUrl}/${currentLocale}`,
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: dict.metadata.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.title,
      description: dict.metadata.description,
      images: [`${baseUrl}/og-image.png`],
      creator: "",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: "your-google-verification-code",
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }
  const currentLocale = locale as Locale

  return (
    <>
      <WebsiteJsonLd locale={currentLocale} />
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd locale={currentLocale} />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </>
  )
}
