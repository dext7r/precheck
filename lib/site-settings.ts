import { db } from "@/lib/db"
import { siteConfig } from "@/lib/seo"

export type SiteSettings = {
  siteName: string
  siteDescription: string
  contactEmail: string
  userRegistration: boolean
  oauthLogin: boolean
  emailNotifications: boolean
  postModeration: boolean
  maintenanceMode: boolean
}

const defaultSettings: SiteSettings = {
  siteName: siteConfig.name,
  siteDescription: "A production-ready Next.js starter template",
  contactEmail: "contact@example.com",
  userRegistration: true,
  oauthLogin: true,
  emailNotifications: true,
  postModeration: false,
  maintenanceMode: false,
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!db) {
    return defaultSettings
  }

  const existing = await db.siteSettings.findUnique({
    where: { id: "global" },
  })

  if (existing) {
    return {
      siteName: existing.siteName,
      siteDescription: existing.siteDescription,
      contactEmail: existing.contactEmail,
      userRegistration: existing.userRegistration,
      oauthLogin: existing.oauthLogin,
      emailNotifications: existing.emailNotifications,
      postModeration: existing.postModeration,
      maintenanceMode: existing.maintenanceMode,
    }
  }

  const created = await db.siteSettings.create({
    data: {
      id: "global",
      ...defaultSettings,
    },
  })

  return {
    siteName: created.siteName,
    siteDescription: created.siteDescription,
    contactEmail: created.contactEmail,
    userRegistration: created.userRegistration,
    oauthLogin: created.oauthLogin,
    emailNotifications: created.emailNotifications,
    postModeration: created.postModeration,
    maintenanceMode: created.maintenanceMode,
  }
}

export async function updateSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
  if (!db) {
    throw new Error("Database not configured")
  }

  const current = await getSiteSettings()
  const data: SiteSettings = {
    siteName: updates.siteName ?? current.siteName,
    siteDescription: updates.siteDescription ?? current.siteDescription,
    contactEmail: updates.contactEmail ?? current.contactEmail,
    userRegistration: updates.userRegistration ?? current.userRegistration,
    oauthLogin: updates.oauthLogin ?? current.oauthLogin,
    emailNotifications: updates.emailNotifications ?? current.emailNotifications,
    postModeration: updates.postModeration ?? current.postModeration,
    maintenanceMode: updates.maintenanceMode ?? current.maintenanceMode,
  }

  const saved = await db.siteSettings.upsert({
    where: { id: "global" },
    update: data,
    create: {
      id: "global",
      ...data,
    },
  })

  return {
    siteName: saved.siteName,
    siteDescription: saved.siteDescription,
    contactEmail: saved.contactEmail,
    userRegistration: saved.userRegistration,
    oauthLogin: saved.oauthLogin,
    emailNotifications: saved.emailNotifications,
    postModeration: saved.postModeration,
    maintenanceMode: saved.maintenanceMode,
  }
}
