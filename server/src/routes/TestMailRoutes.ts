import { Router, Request, Response } from "express";
import { transporter } from "../helpers/nodemailer";

const router = Router();

// GET /api/test-mail?to=foo@bar.com&subject=Hi&html=<p>hello</p>&verify=1
router.get("/", async (req: Request, res: Response) => {
  const to = (req.query.to as string) || process.env.EMAIL;
  const subject = (req.query.subject as string) || "Tradebox mailer test";
  const html =
    (req.query.html as string) ||
    `<p>Mailer test at ${new Date().toISOString()}</p>`;

  const result: Record<string, unknown> = { to, subject };

  try {
    if (req.query.verify === "1") {
      result.verify = await transporter.verify();
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      html,
    });

    return res.status(200).json({
      success: true,
      ...result,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      ...result,
      error: {
        message: err?.message,
        code: err?.code,
        command: err?.command,
        responseCode: err?.responseCode,
        response: err?.response,
        stack: err?.stack,
      },
    });
  }
});

export default { routes: router };
