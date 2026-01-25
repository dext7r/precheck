import type { Prisma } from "@prisma/client"

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN"

export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED"

export type PostStatus = "DRAFT" | "PUBLISHED" | "PENDING" | "REJECTED"

export type PreApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED" | "ARCHIVED"

export type PreApplicationSource = "TIEBA" | "BILIBILI" | "DOUYIN" | "XIAOHONGSHU" | "OTHER"

export type PreApplicationGroup = "GROUP_ONE" | "GROUP_TWO" | "GROUP_THREE"

export type EmailLogStatus = "PENDING" | "SUCCESS" | "FAILED"

export interface User {
  id: string
  email: string
  emailVerified: Date | null
  password: string | null
  name: string | null
  avatar: string | null
  role: Role
  status: UserStatus
  country: string | null
  createdAt: Date
  updatedAt: Date
  accounts: Account[]
  sessions: Session[]
  posts: Post[]
  messageRecipients: MessageRecipient[]
  messagesCreated: Message[]
  messagesRevoked: Message[]
  preApplications: PreApplication[]
  preApplicationsReviewed: PreApplication[]
  preApplicationVersionsReviewed: PreApplicationVersion[]
  inviteCodesCreated: InviteCode[]
  inviteCodesAssigned: InviteCode[]
  inviteCodesUsed: InviteCode[]
  inviteCodesIssued: InviteCode[]
  queryTokensCreated: InviteCodeQueryToken[]
  auditLogs: AuditLog[]
  resetToken: string | null
  resetTokenExpiry: Date | null
}

export interface Account {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
  user: User
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
  user: User
}

export interface VerificationToken {
  identifier: string
  token: string
  expires: Date
}

export interface Post {
  id: string
  title: string
  content: string | null
  published: boolean
  status: PostStatus
  views: number
  authorId: string
  author: User
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  createdById: string
  revokedAt: Date | null
  revokedById: string | null
  createdBy: User
  revokedBy: User | null
  recipients: MessageRecipient[]
}

export interface MessageRecipient {
  messageId: string
  userId: string
  readAt: Date | null
  createdAt: Date
  message: Message
  user: User
}

export interface PreApplication {
  id: string
  userId: string
  essay: string
  source: PreApplicationSource | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: PreApplicationGroup
  status: PreApplicationStatus
  guidance: string | null
  reviewedAt: Date | null
  reviewedById: string | null
  resubmitCount: number
  version: number
  inviteCodeId: string | null
  createdAt: Date
  updatedAt: Date
  user: User
  reviewedBy: User | null
  inviteCode: InviteCode | null
  versions: PreApplicationVersion[]
}

export interface PreApplicationVersion {
  id: string
  preApplicationId: string
  version: number
  essay: string
  source: PreApplicationSource | null
  sourceDetail: string | null
  registerEmail: string
  group: PreApplicationGroup
  status: PreApplicationStatus
  guidance: string | null
  reviewedAt: Date | null
  reviewedById: string | null
  createdAt: Date
  preApplication: PreApplication
  reviewedBy: User | null
}

export interface InviteCode {
  id: string
  code: string
  expiresAt: Date | null
  assignedAt: Date | null
  assignedById: string | null
  usedAt: Date | null
  usedById: string | null
  createdById: string | null
  issuedToUserId: string | null
  issuedToEmail: string | null
  issuedAt: Date | null
  queryTokenId: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  assignedBy: User | null
  usedBy: User | null
  createdBy: User | null
  issuedToUser: User | null
  preApplication: PreApplication | null
  queryToken: InviteCodeQueryToken | null
}

export interface InviteCodeQueryToken {
  id: string
  token: string
  expiresAt: Date | null
  queriedAt: Date | null
  createdById: string
  createdAt: Date
  createdBy: User
  inviteCodes: InviteCode[]
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string | null
  action: string
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  actorRole: Role | null
  ip: string | null
  userAgent: string | null
  before: Prisma.JsonValue | null
  after: Prisma.JsonValue | null
  metadata: Prisma.JsonValue | null
  createdAt: Date
  actor: User | null
}

export interface SiteSettings {
  id: string
  siteName: string
  siteDescription: string
  contactEmail: string
  userRegistration: boolean
  oauthLogin: boolean
  emailNotifications: boolean
  postModeration: boolean
  maintenanceMode: boolean
  auditLogEnabled: boolean
  preApplicationEssayHint: string
  allowedEmailDomains: Prisma.JsonValue
  reviewTemplatesApprove: Prisma.JsonValue
  reviewTemplatesReject: Prisma.JsonValue
  reviewTemplatesDispute: Prisma.JsonValue
  qqGroups: Prisma.JsonValue
  emailProvider: string
  selectedEmailApiConfigId: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpSecure: boolean
  createdAt: Date
  updatedAt: Date
  selectedEmailApiConfig: EmailApiConfig | null
}

export interface EmailApiConfig {
  id: string
  name: string
  host: string
  port: number
  user: string
  pass: string
  createdAt: Date
  updatedAt: Date
  siteSettings: SiteSettings[]
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  status: EmailLogStatus
  provider: string | null
  errorMessage: string | null
  metadata: Prisma.JsonValue | null
  createdAt: Date
}
