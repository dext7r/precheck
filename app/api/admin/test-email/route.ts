import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth/session"
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer"

const testEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
})

/**
 * 测试邮件发送功能（ADMIN 和 SUPER_ADMIN 可用）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Email service not configured. Please check environment variables." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const data = testEmailSchema.parse(body)

    // 发送测试邮件
    await sendEmail({
      to: data.to,
      subject: "【linux.do】邮件服务测试",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ 邮件服务测试成功</h2>
          <p>这是一封测试邮件。</p>
          <p>如果您收到此邮件，说明邮件服务配置正确。</p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>收件人：</strong>${data.to}</p>
            <p style="margin: 5px 0;"><strong>发送时间：</strong>${new Date().toLocaleString("zh-CN")}</p>
            <p style="margin: 5px 0;"><strong>邮件提供商：</strong>${process.env.EMAIL_PROVIDER || "smtp"}</p>
          </div>

          <p style="color: #6b7280; font-size: 12px;">
            此邮件由 ${user.name || user.email} 通过系统后台发送的测试邮件。
          </p>
        </div>
      `,
      text: `
邮件服务测试成功

这是一封测试邮件。
如果您收到此邮件，说明邮件服务配置正确。

收件人：${data.to}
发送时间：${new Date().toLocaleString("zh-CN")}
邮件提供商：${process.env.EMAIL_PROVIDER || "smtp"}

此邮件由 ${user.name || user.email} 通过系统后台发送的测试邮件。
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${data.to}`,
      provider: process.env.EMAIL_PROVIDER || "smtp",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error("Test email error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: 500 },
    )
  }
}
