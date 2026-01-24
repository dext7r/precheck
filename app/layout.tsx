import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "linux.do 预申请系统",
  description: "linux.do 社区预申请与邀请码管理系统",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Script
          id="LA_COLLECT"
          strategy="afterInteractive"
          src="//sdk.51.la/js-sdk-pro.min.js?id=L501OCykxVLJmw8n&ck=L501OCykxVLJmw8n&autoTrack=true&hashMode=true&screenRecord=true"
        />
        {children}
      </body>
    </html>
  )
}
