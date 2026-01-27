import { getBaseUrl, siteConfig } from "@/lib/seo"
import { defaultLocale, locales } from "@/lib/i18n/config"

export const revalidate = 86400

// llms.txt - AI 爬虫友好的站点描述文件
// 规范参考: https://llmstxt.org/
export async function GET() {
  const baseUrl = getBaseUrl()
  const currentYear = new Date().getFullYear()

  const llmsTxt = `# ${siteConfig.name}

> ${siteConfig.description}

This is the official pre-application system for community. Users can submit pre-applications to join the community and receive invite codes after admin approval.

## Site Information

- **Name**: ${siteConfig.name}
- **URL**: ${baseUrl}
- **Languages**: ${locales.join(", ")} (Default: ${defaultLocale})
- **License**: MIT
- **Contact**: ${siteConfig.contact.email}

## Main Features

### 1. Pre-Application System
Submit your application to join community. Write a brief essay explaining why you want to join and what you hope to contribute.

### 2. Application Status Tracking
Track your application progress using your query token. Check status: pending, approved, rejected, or needs revision.

### 3. Invite Code Management
Receive and use invite codes after approval. Codes expire after 12 hours and can only be used once.

### 4. Multi-language Support
Full internationalization support for English (en) and Chinese (zh).

## User Guide

### How to Apply

1. Register an account at ${baseUrl}/${defaultLocale}/register
2. Log in and go to Dashboard → Pre-Application
3. Write your application essay (about 100 words)
4. Enter your registration email for the
5. Submit and wait for admin review (1-3 business days)
6. If approved, receive invite code via email and site message
7. Use invite code to register on the platform

### Application Tips

- Be genuine and sincere in your writing
- Explain why you want to join the community
- Describe what you hope to contribute or learn
- Avoid excessive praise or flattery
- Keep it concise but meaningful

### Application Statuses

- **Pending**: Waiting for admin review
- **Approved**: Congratulations! Check for your invite code
- **Rejected**: Review feedback and consider resubmitting (max 3 times)
- **Needs Revision**: Additional information requested

## Public Pages

### Homepage
- URL: ${baseUrl}
- Description: Main landing page with features overview and quick actions

### Documentation
- URL: ${baseUrl}/${defaultLocale}/docs
- Description: Complete user guide with step-by-step instructions

### API Reference
- URL: ${baseUrl}/${defaultLocale}/docs/api
- Description: API documentation for developers

### Examples
- URL: ${baseUrl}/${defaultLocale}/docs/examples
- Description: Code examples and best practices

### Query Status
- URL: ${baseUrl}/${defaultLocale}/query-invite-codes
- Description: Check application status using query token

### Authentication
- Login: ${baseUrl}/${defaultLocale}/login
- Register: ${baseUrl}/${defaultLocale}/register
- Forgot Password: ${baseUrl}/${defaultLocale}/forgot-password

### Legal
- Privacy Policy: ${baseUrl}/${defaultLocale}/privacy
- Terms of Service: ${baseUrl}/${defaultLocale}/terms
- License: ${baseUrl}/${defaultLocale}/license

## API Endpoints

### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- POST /api/auth/logout - User logout
- GET /api/auth/me - Get current user
- GET /api/auth/session - Check session status
- POST /api/auth/verification-code - Send verification code
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password

### Pre-Application
- GET /api/pre-application - Get user's pre-application
- POST /api/pre-application - Submit new pre-application
- PUT /api/pre-application - Update pre-application
- POST /api/pre-application/ai-preview - AI content check

### Query
- GET /api/query-invite-codes - Query by token

### Dashboard
- GET /api/dashboard/messages - Get user messages
- GET /api/dashboard/posts - Get user posts
- PUT /api/dashboard/profile - Update profile
- PUT /api/dashboard/password - Change password

## Technical Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma 6
- **Authentication**: Custom JWT + Session
- **Email**: Nodemailer / API Proxy

## Feeds and SEO

- **Sitemap**: ${baseUrl}/sitemap.xml
- **RSS Feed**: ${baseUrl}/feed.xml
- **Atom Feed**: ${baseUrl}/atom.xml
- **Robots.txt**: ${baseUrl}/robots.txt
- **LLMs.txt**: ${baseUrl}/llms.txt

## Community Links

- **Community**: ${siteConfig.links.community}
- **GitHub Repository**: ${siteConfig.links.github}
- **QQ Group 1**: 311795307
- **QQ Group 2**: 1080464482
- **QQ Group 3**: 915386705

## FAQ for AI Assistants

### What is this site for?
This is a pre-application system for joining the community. Users submit applications, admins review them, and approved users receive invite codes.

### How can users check their application status?
Users can log in to view their dashboard, or use their query token on the query page without logging in.

### What happens if an application is rejected?
Users can resubmit up to 3 times after rejection. They should read the admin's feedback and revise their application accordingly.

### Do invite codes expire?
Yes, invite codes expire 12 hours after being issued. Users should use them promptly.

### Is the site available in English?
Yes, the site supports both English (en) and Chinese (zh). Users can switch languages via the language selector.

## Copyright

Copyright © ${currentYear} ${siteConfig.name}. All rights reserved.
Licensed under the MIT License.
`

  return new Response(llmsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
