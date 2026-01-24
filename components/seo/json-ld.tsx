import Script from "next/script"
import { siteConfig, getBaseUrl } from "@/lib/seo"
import type { Locale } from "@/lib/i18n/config"

interface JsonLdProps {
  locale: Locale
}

export function WebsiteJsonLd({ locale }: JsonLdProps) {
  const baseUrl = getBaseUrl()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: `${baseUrl}/${locale}`,
    inLanguage: locale === "zh" ? "zh-CN" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <Script
      id={`jsonld-website-${locale}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function SoftwareApplicationJsonLd({ locale }: JsonLdProps) {
  const baseUrl = getBaseUrl()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "WebApplication",
    applicationSubCategory: "CommunityManagementApplication",
    operatingSystem: "Web",
    url: `${baseUrl}/${locale}`,
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "linux.do",
      url: siteConfig.links.community,
    },
    featureList: [
      "社区预申请管理",
      "邀请码生成与分配",
      "用户审核流程",
      "多语言支持",
      "站内消息系统",
    ],
  }

  return (
    <Script
      id={`jsonld-software-${locale}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <Script
      id="jsonld-breadcrumb"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function OrganizationJsonLd() {
  const baseUrl = getBaseUrl()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "linux.do",
    alternateName: siteConfig.name,
    url: siteConfig.links.community,
    logo: `${baseUrl}/logo.png`,
    description: "linux.do 开发者技术社区",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: siteConfig.contact.email,
    },
    sameAs: [
      siteConfig.links.community,
      siteConfig.links.github,
      ...(siteConfig.links.twitter ? [siteConfig.links.twitter] : []),
    ],
  }

  return (
    <Script
      id="jsonld-organization"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function FAQJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <Script
      id="jsonld-faq"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
