import { Request, Response } from "express";
import {
  AdminModel,
  ServiceProviderRegModel,
  UserModel,
  userOTPModel,
} from "../../models/AuthModels";
import bcrypt from "bcrypt";
import { transporter } from "../../helpers/nodemailer";
import otpRateLimitStore from "../../utils/otpRateLimiter";
import jwt from "jsonwebtoken";

export const requestForOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(500).json({
      success: false,
      message: "Email  required",
    });
  }

  try {
    const user = await UserModel.find({ email });

    const sp = await ServiceProviderRegModel.find({ email });

    const isUser = Boolean(user.length);
    const isSP = Boolean(sp.length);

    if (isUser || isSP) {
      return res
        .status(500)
        .json({ success: true, message: "User already Exist" });
    }

    const otpsList = await userOTPModel.find({ email: email });

    if (otpsList.length !== 0) {
      return res.status(500).json({
        success: false,
        message: `otp already exist please check your mailbox or try again in 10 minutes`,
      });
    }

    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // console.log(otp)

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "TradeBox OTP",
      html: `<p>Your TradeBox verification code is: ${otp}. This code is valid for the next 10 minutes. Please enter it to verify yourself.</p>`,
    };

    const hashedOtp = await bcrypt.hash(otp, 10);
    const newUserOtp = new userOTPModel({
      email,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiredAt: Date.now() + 600000,
    });

    // console.log("new user saved")

    await transporter.sendMail(mailOptions);
    // console.log("mail sent")
    await newUserOtp.save();

    return res.status(200).json({
      success: true,
      message: "OTP sent",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error,
    });
  }
};

export const requestMobileOTP = async (req: Request, res: Response) => {
  const { number, loginAs } = req.body;

  if (!number) {
    return res.status(400).json({
      success: false,
      message: "Mobile number is required",
    });
  }

  try {
    const [user, sp, existingOtp] = await Promise.all([
      UserModel.findOne({ number }),
      ServiceProviderRegModel.findOne({ number }),
      userOTPModel.findOne({ number }),
    ]);

    // Check if number is registered under a different role
    let existsAs: string | null = null;
    if (user) existsAs = "user";
    else if (sp) existsAs = "provider";

    // If loginAs is provided and number belongs to a different role, return early without sending OTP
    if (loginAs && existsAs && existsAs !== loginAs) {
      return res.status(200).json({
        success: true,
        existsAs,
        otpSent: false,
        message: `This number is already registered as a ${existsAs === "provider" ? "Service Provider" : "User"}`,
      });
    }

    if (
      existingOtp &&
      Date.now() - existingOtp.createdAt.getTime() < 60 * 1000
    ) {
      return res.status(429).json({
        success: false,
        message: "OTP already sent recently. Try again after a minute.",
      });
    }

    // Delete any existing OTP records for this number before creating a new one
    if (existingOtp) {
      await userOTPModel.deleteMany({ number });
    }

    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(otp)
    const hashedOtp = await bcrypt.hash(otp, 10);

    const smsMessage = `Your Mobile no verification code is ${otp}. This is valid for 10 minutes. - Tradebox RA`;

    const proactiveUrl = `https://www.proactivesms.in/sendsms.jsp?user=tradebox&password=473e552191XX&senderid=TradRA&mobiles=${number}&sms=${smsMessage}&tempid=1107174488161693644`;

    const smsResponse = await fetch(proactiveUrl);

    // if (!smsResponse.data || !smsResponse.data.includes("success")) {
    //   return res.status(500).json({
    //     success: false,
    //     message: "Failed to send OTP via SMS",
    //   });
    // }

    // console.log(smsResponse);

    if (!smsResponse) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP via SMS",
      });
    }

    const resultText = await smsResponse.text();
    // console.log("SMS API Response:", resultText);

    const newOtp = new userOTPModel({
      number,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiredAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await newOtp.save();

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your mobile number",
      existsAs,
      otpSent: true,
    });
  } catch (error) {
    console.error("OTP SMS Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending OTP",
    });
  }
};

export const requestForOTPForPassReset = async (
  req: Request,
  res: Response
) => {
  const { email } = req.body;

  if (!email) {
    return res.status(500).json({
      success: false,
      message: "Email  required",
    });
  }

  try {
    const otpsList = await userOTPModel.find({ email: email });

    if (otpsList.length !== 0) {
      return res.status(500).json({
        success: false,
        message: `otp already exist please check your mailbox or try again in 10 minutes`,
      });
    }

    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "TradeBox Password Reset OTP",
      html: `<p>Your TradeBox password reset verification code is: ${otp}. This code is valid for the next 10 minutes. Please enter it to verify yourself.</p>`,
    };

    const hashedOtp = await bcrypt.hash(otp, 10);
    const newUserOtp = new userOTPModel({
      email,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiredAt: Date.now() + 600000,
    });

    await transporter.sendMail(mailOptions);
    await newUserOtp.save();

    return res.status(200).json({
      success: true,
      message: "OTP sent",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error,
    });
  }
};

export const checkOTP = async (req: Request, res: Response) => {
  const { otp, email, key } = req.body;
  if (!otp) {
    return res.status(500).json({
      success: false,
      message: "NO OTP provided",
    });
  }
  try {
    const otpData = await userOTPModel.find({ email });

    if (!otpData[0].otp) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired",
        user: null,
      });
    }

    if (await bcrypt.compare(otp, otpData[0].otp)) {
      await userOTPModel.findOneAndUpdate(
        { email },
        { $set: { verified: true, key } }
      );

      return res.status(200).json({
        success: true,
        message: "OTP Verified",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "OTP not correct",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Verify",
      error: error,
    });
  }
};

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000;

export const checkOTPNumber = async (req: Request, res: Response) => {
  const { otp, number, key } = req.body;

  if (!otp) {
    return res.status(500).json({
      success: false,
      message: "No OTP provided",
    });
  }

  const now = Date.now();
  const limit = otpRateLimitStore[number] || {
    attempts: 0,
    lockUntil: 0,
    lastAttempt: 0,
  };

  // 🚫 Check lockout
  if (limit.lockUntil > now) {
    const waitTime = Math.ceil((limit.lockUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many incorrect attempts. Try again in ${waitTime}s`,
    });
  }

  try {
    const otpData = await userOTPModel.find({ number });

    if (!otpData[0]?.otp) {
      return res.status(400).json({
        success: false,
        message: "OTP Expired",
        user: null,
      });
    }

    const isMatch = await bcrypt.compare(otp, otpData[0].otp);

    if (!isMatch) {
      const newAttempts = limit.attempts + 1;
      otpRateLimitStore[number] = {
        attempts: newAttempts,
        lastAttempt: now,
        lockUntil: newAttempts >= MAX_ATTEMPTS ? now + LOCK_DURATION : 0,
      };
      return res.status(500).json({
        success: false,
        message: "OTP not correct",
      });
    }

    // ✅ Update OTP verification
    await userOTPModel.findOneAndUpdate(
      { number },
      { $set: { verified: true, key } }
    );

    // ✅ Valid OTP: clean up rate limit
    delete otpRateLimitStore[number];
    await userOTPModel.deleteMany({ number });

    // ✅ Check if user already exists
    const [user, sp, admin] = await Promise.all([
      UserModel.findOne({ number }),
      ServiceProviderRegModel.findOne({ number }),
      AdminModel.findOne({ number }),
    ]);

    let role = "guest";
    let userExists = false;
    let category;
    let customSubdomain: string | null = null;
    let customSubdomainStatus: "pending" | "active" | "disabled" | null = null;

    if (user) {
      role = "user";
      userExists = true;
    } else if (sp) {

      role = sp.role || "provider"; // Default to "provider" if role is not set
      userExists = true;
      category = sp.category;
      customSubdomain = sp.customSubdomain ?? null;
      customSubdomainStatus = sp.customSubdomainStatus ?? null;
    } else if (admin) {
      role = "admin";
      userExists = true;
    }

    const payload = { number, verified: true, role };
    const token = jwt.sign(payload, process.env.JWTSECRET!, {
      expiresIn: "10m",
    });

    return res.status(200).json({
      token,
      userExists,
      role,
      category,
      customSubdomain,
      customSubdomainStatus,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Verify",
      error: error,
    });
  }
};

export const checkPageRefreshOtp = async (req: Request, res: Response) => {
  const { key } = req.body;

  try {
    const record = await userOTPModel.find({ key });

    if (!record[0]) {
      return res.status(500).json({
        success: false,
        message: "Failed to Verify",
      });
    }

    if (record[0].verified !== true) {
      return res.status(500).json({
        success: false,
        message: "Failed to Verify",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP Verified",
      email: record[0].email,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Verify",
      error: error,
    });
  }
};
