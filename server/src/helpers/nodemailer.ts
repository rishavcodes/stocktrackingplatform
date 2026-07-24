import { createTransport } from "nodemailer";

const apiKey = process.env.RESEND_API_KEY;

export const transporter = createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: apiKey,
  },
});
