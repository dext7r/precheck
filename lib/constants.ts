export const APP_NAME = "Next Starter"
export const APP_DESCRIPTION = "A production-ready Next.js starter template"

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  DOCS: "/docs",
  API: {
    HEALTH: "/api/health",
    USERS: "/api/users",
  },
} as const

export const DEPLOY_PLATFORMS = [
  { name: "Vercel", url: "https://vercel.com/new", icon: "vercel" },
  { name: "Cloudflare Pages", url: "https://pages.cloudflare.com", icon: "cloudflare" },
  { name: "Netlify", url: "https://app.netlify.com/start", icon: "netlify" },
  { name: "Railway", url: "https://railway.app/new", icon: "railway" },
  { name: "Fly.io", url: "https://fly.io", icon: "fly" },
  { name: "Deno Deploy", url: "https://deno.com/deploy", icon: "deno" },
  { name: "Heroku", url: "https://heroku.com", icon: "heroku" },
] as const
