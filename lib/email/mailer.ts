import nodemailer from "nodemailer"

type EmailPayload = {
  to: string
  subject: string
  html: string
  text: string
}

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || "587")
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === "true"
const smtpFrom = process.env.SMTP_FROM || smtpUser

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null

export async function sendEmail(payload: EmailPayload) {
  if (!transporter || !smtpFrom) {
    throw new Error("SMTP not configured")
  }

  await transporter.sendMail({
    from: smtpFrom,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  })
}
