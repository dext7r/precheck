# Feature Configuration Guide

This template uses a **feature detection system** that automatically enables/disables features based on configured environment variables. No code changes required!

## Feature Detection

| Feature        | Required Environment Variables             | Fallback Behavior             |
| -------------- | ------------------------------------------ | ----------------------------- |
| Database/Auth  | `DATABASE_URL`                             | Login/Register buttons hidden |
| GitHub OAuth   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub button hidden          |
| Google OAuth   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google button hidden          |
| Password Reset | `SMTP_HOST`, `SMTP_USER`                   | Reset email not sent          |
| File Upload    | `BLOB_READ_WRITE_TOKEN`                    | Upload features disabled      |
| Redis Cache    | `KV_REST_API_URL`                          | Falls back to memory          |

## Quick Start

### Minimal Setup (Static Site)

No environment variables needed! The site works as a static template.

### With Authentication

```bash
DATABASE_URL="postgresql://..."
```

### With OAuth

```bash
DATABASE_URL="postgresql://..."
GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"
```

### Full Setup

Copy `.env.example` to `.env.local` and fill in all values.

## How It Works

The `lib/features.ts` module checks environment variables at runtime:

```typescript
export const features = {
  oauth: {
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },
  database: !!process.env.DATABASE_URL,
  email: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
}
```

Components check these flags and conditionally render UI elements.
