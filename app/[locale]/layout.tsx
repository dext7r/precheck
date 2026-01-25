import type React from "react"
import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import Script from "next/script"
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
import { HtmlLang } from "@/components/seo/html-lang"

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
      "linux.do",
      "预申请",
      "邀请码",
      "社区注册",
      "Linux社区",
      "开发者社区",
      "技术社区",
      "邀请码管理",
      "community",
      "invite code",
      "pre-application",
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
          url: `${baseUrl}${siteConfig.ogImage}`,
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
      images: [`${baseUrl}${siteConfig.ogImage}`],
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
      <HtmlLang locale={currentLocale} />
      <Script
        id="LA_COLLECT"
        strategy="afterInteractive"
        src="//sdk.51.la/js-sdk-pro.min.js?id=L501OCykxVLJmw8n&ck=L501OCykxVLJmw8n&autoTrack=true&hashMode=true&screenRecord=true"
      />
      <Script
        id="LA_PERF"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!(function(c,i,e,b){var h=i.createElement("script");var f=i.getElementsByTagName("script")[0];h.type="text/javascript";h.crossorigin=true;h.onload=function(){new c[b]["Monitor"]().init({id:"L52KT284INPvfCrf"});};f.parentNode.insertBefore(h,f);h.src=e;})(window,document,"https://sdk.51.la/perf/js-sdk-perf.min.js","LingQue");`,
        }}
      />
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
