import { locales, type Locale } from "@/lib/i18n/config"

export const siteConfig = {
  name: "linux.do 预申请系统",
  shortName: "linux.do 预申请",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://linuxhub.de5.net",
  ogImage: "/placeholder-logo.svg",
  logo: "/placeholder-logo.svg",
  description: "linux.do 社区官方预申请与邀请码管理平台，快速获取社区注册邀请码",
  keywords: [
    "linux.do",
    "预申请",
    "邀请码",
    "社区注册",
    "Linux社区",
    "开发者社区",
    "技术社区",
    "邀请码管理",
  ],
  links: {
    community: "https://linux.do",
    github: "https://github.com/linux-do",
    twitter: "https://twitter.com/",
  },
  contact: {
    email: "contact@linux.do",
  },
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export function getCanonicalUrl(path: string, locale?: Locale) {
  const baseUrl = getBaseUrl()
  const localePath = locale ? `/${locale}` : ""
  return `${baseUrl}${localePath}${path}`
}

export function getAlternateUrls(path: string) {
  const baseUrl = getBaseUrl()
  return locales.reduce(
    (acc, locale) => {
      acc[locale] = `${baseUrl}/${locale}${path}`
      return acc
    },
    {} as Record<Locale, string>,
  )
}

export interface PageSEO {
  title: string
  description: string
  path: string
  locale: Locale
  image?: string
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  keywords?: string[]
}

export function generatePageMetadata({
  title,
  description,
  path,
  locale,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
}: PageSEO) {
  const url = getCanonicalUrl(path, locale)
  const alternates = getAlternateUrls(path)

  return {
    title,
    description,
    keywords,
    authors: authors?.map((name) => ({ name })),
    alternates: {
      canonical: url,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      type,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
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
  }
}
