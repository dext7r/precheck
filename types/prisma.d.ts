import type { Prisma } from "@prisma/client"

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN"

export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED" | "DELETED"

export type PostStatus = "DRAFT" | "PUBLISHED" | "PENDING" | "REJECTED"

export type PreApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED" | "ARCHIVED" | "PENDING_REVIEW" | "ON_HOLD"

export type PreApplicationSource = "TIEBA" | "BILIBILI" | "DOUYIN" | "XIAOHONGSHU" | "OTHER"

export type EmailLogStatus = "PENDING" | "SUCCESS" | "FAILED"

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"

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
  tickets: Ticket[]
  ticketMessages: TicketMessage[]
  chatMessages: ChatMessage[]
  privateChatsAsUser: PrivateChat[]
  privateChatsAsAdmin: PrivateChat[]
  privateChatMessages: PrivateChatMessage[]
  apiTokens: ApiToken[]
  resetToken: string | null
  resetTokenExpiry: Date | null
  reactivationToken: string | null
  reactivationTokenExpiry: Date | null
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
  trustLevel: number | null
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
  deletedAt: Date | null
  createdAt: Date
  message: Message
  user: User
}

export interface PreApplication {
  id: string
  userId: string | null
  qqNumber: string | null
  essay: string
  source: PreApplicationSource | null
  sourceDetail: string | null
  registerEmail: string
  queryToken: string | null
  group: string
  status: PreApplicationStatus
  guidance: string | null
  reviewedAt: Date | null
  reviewedById: string | null
  resubmitCount: number
  version: number
  inviteCodeId: string | null
  createdAt: Date
  updatedAt: Date
  holdUntil: Date | null
  user: User | null
  reviewedBy: User | null
  inviteCode: InviteCode | null
  versions: PreApplicationVersion[]
  tickets: Ticket[]
}

export interface PreApplicationVersion {
  id: string
  preApplicationId: string
  version: number
  essay: string
  source: PreApplicationSource | null
  sourceDetail: string | null
  registerEmail: string
  group: string
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
  checkValid: boolean | null
  checkMessage: string | null
  checkedAt: Date | null
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
  adminApplicationEnabled: boolean
  auditLogEnabled: boolean
  preApplicationEssayHint: string
  allowedEmailDomains: Prisma.JsonValue
  reviewTemplatesApprove: Prisma.JsonValue
  reviewTemplatesApproveNoCode: Prisma.JsonValue
  reviewTemplatesReject: Prisma.JsonValue
  reviewTemplatesDispute: Prisma.JsonValue
  qqGroups: Prisma.JsonValue
  inviteCodeUrlPrefix: string
  emailProvider: string
  selectedEmailApiConfigId: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpSecure: boolean
  maxResubmitCount: number
  inviteCodeCheckApiUrl: string | null
  inviteCodeCheckApiKey: string | null
  analyticsEnabled: boolean
  linuxdoAutoAdmin: boolean
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

export interface Ticket {
  id: string
  preApplicationId: string
  userId: string
  subject: string
  status: TicketStatus
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  preApplication: PreApplication
  user: User
  messages: TicketMessage[]
}

export interface TicketMessage {
  id: string
  ticketId: string
  authorId: string
  content: string
  createdAt: Date
  ticket: Ticket
  author: User
}

export interface ChatMessage {
  id: string
  content: string
  senderId: string
  replyToId: string | null
  createdAt: Date
  deletedAt: Date | null
  sender: User
  replyTo: ChatMessage | null
  replies: ChatMessage[]
}

export interface PrivateChat {
  id: string
  userId: string
  adminId: string
  createdAt: Date
  updatedAt: Date
  user: User
  admin: User
  messages: PrivateChatMessage[]
}

export interface PrivateChatMessage {
  id: string
  chatId: string
  senderId: string
  content: string
  createdAt: Date
  readAt: Date | null
  chat: PrivateChat
  sender: User
}

export interface ApiToken {
  id: string
  name: string
  tokenHash: string
  prefix: string
  userId: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  createdAt: Date
  revokedAt: Date | null
  user: User
}
