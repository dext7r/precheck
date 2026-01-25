import { getBaseUrl, siteConfig } from "@/lib/seo"

export const revalidate = 86400

export async function GET() {
  const baseUrl = getBaseUrl()

  const llmsTxt = `# ${siteConfig.name}

> ${siteConfig.description}

## About

This is the official pre-application system for linux.do community. Users can submit pre-applications to join the community and receive invite codes after approval.

## Main Features

- Pre-application submission
- Application status tracking via query token
- Invite code management
- Multi-language support (English, Chinese)

## Important URLs

- Homepage: ${baseUrl}
- Pre-application: ${baseUrl}/en/pre-application
- Query Status: ${baseUrl}/en/query-invite-codes
- Documentation: ${baseUrl}/en/docs
- Privacy Policy: ${baseUrl}/en/privacy
- Terms of Service: ${baseUrl}/en/terms

## API Endpoints

This system provides REST APIs for:
- User authentication (login, register, logout)
- Pre-application submission and management
- Invite code queries
- User dashboard data

## Contact

- Community: ${siteConfig.links.community}
- GitHub: ${siteConfig.links.github}
- Email: ${siteConfig.contact.email}

## Technical Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL

## Sitemap

${baseUrl}/sitemap.xml

## RSS Feed

${baseUrl}/feed.xml

## Atom Feed

${baseUrl}/atom.xml
`

  return new Response(llmsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
