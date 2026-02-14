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
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-dark-32x32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "预申请",
        short_name: "预申请",
        description: "提交 社区预申请",
        url: "/zh/pre-application",
      },
      {
        name: "登录",
        short_name: "登录",
        description: "登录用户控制台",
        url: "/zh/login",
      },
    ],
  }
}
