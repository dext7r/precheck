import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/seo"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    dir: "auto",
    lang: "zh-CN",
    categories: ["productivity", "social", "utilities"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "预申请",
        short_name: "预申请",
        description: "提交 linux.do 社区预申请",
        url: "/zh/pre-application",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "查询邀请码",
        short_name: "查询",
        description: "查询邀请码状态",
        url: "/zh/query-invite-codes",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "登录",
        short_name: "登录",
        description: "登录用户控制台",
        url: "/zh/login",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "桌面端预申请界面",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "移动端预申请界面",
      },
    ],
  }
}
