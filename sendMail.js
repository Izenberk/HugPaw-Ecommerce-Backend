import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER, //From Local .env
    pass: process.env.SMTP_PASS, //From Local .env
  },
  tls: {
    rejectUnauthorized:
      process.env.SMTP_REJECT_UNAUTHORIZED === "false" ? false : true,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

export default async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || '"HugPaw" <no-reply@hugpaw.com>';
  const info = await transporter.sendMail({ from, to, subject, html, text });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log("Mail preview URL:", preview);
  } else {
    console.log("Mail sent:", info.messageId);
  }

  return info;
}
