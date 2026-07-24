import { Request, Response } from "express";
import {
  AdminModel,
  ServiceProviderRegModel,
  UserModel,
  userOTPModel,
} from "../../models/AuthModels";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { mailQueue } from "../../queues/MailQueues";
import { notificationModel } from "../../models/NotificationModel";
import { adminNotify } from "../../helpers/Notify";
import { SessionModel } from "../../models/Session";
import { LoginActivityModel } from "../../models/LoginActivity";
import getDeviceInfo from "../../helpers/getDeviceInfo";
import mongoose from "mongoose";

export const ProviderSignUp = async (req: Request, res: Response) => {
  if (!req.body.data) {
    return res
      .status(400)
      .json({ success: false, message: "No Data provided" });
  }

  const parsedBody = JSON.parse(req.body.data);

  const {
    RegName,
    name,
    email,
    number,
    city,
    state,
    regNumber,

    // sub profile fields
    isSubProfile,
    masterID,
    companyName,
  } = parsedBody;

  const files = req.files as {
    [fieldname: string]: Express.MulterS3.File[];
  };

  try {
    /* ---------------- DUPLICATE CHECKS ---------------- */

    const providerWithNumber = await ServiceProviderRegModel.findOne({
      number,
    });

    const userWithNumber = await UserModel.findOne({ number });

    if (userWithNumber) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    if (providerWithNumber) {
      return res.status(409).json({
        success: false,
        message: "Provider already exists",
      });
    }

    /* ---------------- MASTER PROFILE CHECK ---------------- */

    let masterProvider = null;

    if (isSubProfile) {
      if (!masterID) {
        return res.status(400).json({
          success: false,
          message: "Master ID required for sub profile",
        });
      }

      masterProvider = await ServiceProviderRegModel.findById(masterID);

      if (!masterProvider) {
        return res.status(404).json({
          success: false,
          message: "Master provider not found",
        });
      }
    }

    /* ---------------- CREATE PROVIDER ---------------- */

    const newProvider = new ServiceProviderRegModel({
      RegName,
      name,
      email,
      number,
      city,
      state,
      regNumber,

      // FILES
      certificate: files?.certificate ? files.certificate[0].location : "",

      CompanyCertificate: files?.CompanyCertificate
        ? files.CompanyCertificate[0].location
        : "",

      profileUrl: files?.profilePic ? files.profilePic[0].location : "",

      // SYSTEM FIELDS
      role: "provider",
      // type: isSubProfile ? "sub profile" : "provider",

      // SUB PROFILE META
      addedby: {
        isSubProfile: Boolean(isSubProfile),
        id: isSubProfile ? masterID : "",
        companyName: isSubProfile ? companyName || masterProvider?.RegName : "",
      },
    });

    await newProvider.save();

    /* ---------------- EMAIL ---------------- */

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Welcome aboard, ${RegName}!`,
      html: `
        <p>
          Congratulations on successfully registering with us.
          Step into your dashboard and unlock opportunities.
        </p>
        <br/>
        Best wishes,<br/><br/>
        Trade Box Fintech Solutions
      `,
    };

    /* ---------------- ADMIN NOTIFY ---------------- */

    await adminNotify(
      `New ${newProvider.RegName} registered as ${
        newProvider?.addedby?.isSubProfile ? "sub profile" : "provider"
      }`
    );

    await mailQueue.add(
      email,
      { mailOptions },
      { removeOnComplete: true, removeOnFail: true }
    );

    return res.status(200).json({
      success: true,
      message: "Provider SignedUp Successfully",
      data: newProvider,
    });
  } catch (error) {
    console.error("Provider signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to Signup",
      error,
    });
  }
};

const JWT_EXPIRES_IN = "1d";

export const loginHandler = async (req: Request, res: Response) => {
  const { number, loginAs, brokerType, clientCode, accessToken, expiresAt: brokerExpiresAt } = req.body;

  const isBrokerSignIn =
    brokerType && clientCode && loginAs === "user";
  if (!loginAs) {
    return res.status(400).json({
      success: false,
      message: "loginAs is required",
    });
  }
  if (!isBrokerSignIn && !number) {
    return res.status(400).json({
      success: false,
      message: "Number and loginAs are required",
    });
  }

  try {
    let userData: any = null;
    let userType: "user" | "provider" | "admin";
    let userId = null;
    let serviceProviderId = null;
    let adminId = null;

    let brokerSessionResponse: { brokerType: string; clientCode: string; accessToken: string; expiresAt: number } | undefined;
    if (isBrokerSignIn) {
      const user = await UserModel.findOne({
        "linkedBrokers.brokerType": brokerType,
        "linkedBrokers.clientCode": clientCode,
      });
      if (!user) {
        return res.status(403).json({
          success: false,
          userExists: false,
          message: "No Tradebox account linked to this broker",
        });
      }
      userType = "user";
      userId = user._id;
      userData = {
        _id: user._id,
        RegName: user.name,
        email: user.email,
        number: user.number,
        role: user.role,
        profileUrl: user.profileUrl,
        pannumber: user.pannumber,
      };
      if (accessToken != null && brokerExpiresAt != null) {
        brokerSessionResponse = {
          brokerType,
          clientCode,
          accessToken,
          expiresAt: Number(brokerExpiresAt),
        };
      }
    } else {
    switch (loginAs) {
      case "provider": {
        const sp = await ServiceProviderRegModel.findOne({ number });

        if (!sp) {
          return res.status(403).json({
            success: false,
            userExists: false,
            message: "Service provider not found",
          });
        }

        userType = "provider";
        serviceProviderId = sp._id;

        userData = {
          _id: sp._id,
          RegName: sp.RegName,
          role: sp.role,
          email: sp.email,
          verified: sp.verified,
          type: sp.type,
          category: sp.category,
          profileUrl: sp.profileUrl,
          number: sp.number,
          addedby: sp.addedby,
          customSubdomain: sp.customSubdomain ?? null,
          customSubdomainStatus: sp.customSubdomainStatus ?? null,
        };
        break;
      }

      case "user": {
        const user = await UserModel.findOne({ number });

        if (!user) {
          return res.status(403).json({
            success: false,
            userExists: false,
            message: "User not found",
          });
        }

        userType = "user";
        userId = user._id;

        userData = {
          _id: user._id,
          RegName: user.name,
          email: user.email,
          number: user.number,
          role: user.role,
          profileUrl: user.profileUrl,
          pannumber: user.pannumber,
        };
        break;
      }

      case "admin": {
        const admin = await AdminModel.findOne({ number });

        if (!admin) {
          return res.status(403).json({
            success: false,
            userExists: false,
            message: "Admin not found",
          });
        }

        if (admin.role === "sub_admin" && !admin.isActive) {
          return res.status(403).json({
            success: false,
            message: "Your account is disabled. Contact super admin.",
          });
        }

        userType = "admin";
        adminId = admin._id;

        userData = {
          _id: admin._id,
          RegName: admin.name,
          email: admin.email,
          number: admin.number,
          role: admin.role,
          profileUrl: admin.profileUrl,
          permissions: admin.permissions || [],
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid loginAs value",
        });
    }
    }
    // console.log("data found", user)

    // console.log("data found", userData);

    if (!userData) {
      // User doesn't exist yet
      return res.status(200).json({
        success: true,
        message: "User not found, proceed to registration",
        user: null,
        userExists: false,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userData._id,
        number: userData.number,
        role: userData.role,
        type: userType,
      },
      process.env.JWTSECRET as string,
      { expiresIn: "1d" }
    );

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 7 days from now

    const sessionData: any = {
      token,
      userType,
      deviceInfo: getDeviceInfo(req),
      ipAddress: req.ip,
      expiresAt,
      isActive: true,
    };

    // 🔥 attach ownership
    if (userType === "user") {
      sessionData.user = userId;
      sessionData.serviceProvider = null;
      sessionData.admin = null;

      await SessionModel.deleteMany({ user: userId });
    }

    if (userType === "provider") {
      sessionData.serviceProvider = serviceProviderId;
      sessionData.user = null;
      sessionData.admin = null;

      await SessionModel.deleteMany({ serviceProvider: serviceProviderId });
    }

    if (userType === "admin") {
      sessionData.admin = adminId;
      sessionData.user = null;
      sessionData.serviceProvider = null;

      await SessionModel.deleteMany({ admin: adminId });
    }
    userData.backendToken = token;
    // console.log("session data after addition", sessionData);
    // Create session record
    const session = new SessionModel(sessionData);

    await session.save();
    console.log("session saved");

    // Append an append-only audit record for the admin "recent logins" feed.
    // Fire-and-forget + swallow errors: an audit write must NEVER break login.
    void LoginActivityModel.create({
      subjectId: userId || serviceProviderId || adminId,
      subjectType: userType,
      name: userData.RegName || "",
      email: userData.email || "",
      number: userData.number || "",
      category: userData.category || "",
      event: "login_success",
      ipAddress: req.ip,
      deviceInfo: getDeviceInfo(req),
    }).catch((err) => {
      console.error("Failed to write LoginActivity:", err);
    });

    const json: any = {
      success: true,
      message: "Login successful",
      user: userData,
      token: token,
      userExists: true,
      expiresAt: expiresAt.toISOString(),
    };
    if (brokerSessionResponse) json.brokerSession = brokerSessionResponse;
    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Signin",
      error: error,
    });
  }
};

// export const adminLoginHandler = async (req: Request, res: Response) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({
//       success: false,
//       message: "Email and password required",
//     });
//   }

//   try {
//     const admin = await AdminModel.findOne({ email });

//     if (!admin) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     // Verify password (assuming you're using bcrypt)
//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const _backendToken = admin.backendToken;

//     // Generate JWT token
//     const backendToken = jwt.sign(
//       {
//         _id: admin._id,
//         RegName: admin.name,
//         email: admin.email,
//         role: admin.role,
//       },
//       process.env.JWTSECRET as string,
//       { expiresIn: "1d" }
//     );

//     _backendToken.push(backendToken);

//     if (_backendToken.length > 4) {
//       _backendToken.splice(0, 1);
//     }

//     // Update admin with new token
//     await AdminModel.findByIdAndUpdate(admin._id, {
//       $set: { backendToken: _backendToken },
//     });

//     const adminData = {
//       _id: admin._id,
//       RegName: admin.name,
//       email: admin.email,
//       role: admin.role,
//       profileUrl: admin.profileUrl,
//       backendToken,
//     };

//     return res.status(200).json({
//       success: true,
//       message: "Admin login successful",
//       user: adminData,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to login",
//       error: error,
//     });
//   }
// };

// This works with your existing middleware setup
export const adminLogout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Decode token to get user ID
    const decoded = jwt.decode(token) as any;

    if (!decoded?._id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Remove the token from backendToken array
    await AdminModel.findByIdAndUpdate(decoded._id, {
      $pull: { backendToken: token },
    });

    return res.status(200).json({
      success: true,
      message: "Token invalidated successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const session = await SessionModel.findOneAndDelete({ token });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserData = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "No id provided",
    });
  }

  try {
    // `type=user` is set by the customer-impersonation flow so we look up
    // the UserModel collection. Default stays "provider" for back-compat
    // with the many SP-only callers of this endpoint.
    const isUser = req.query.type === "user";
    const user = isUser
      ? await UserModel.findById(req.query.id).select("-password")
      : await ServiceProviderRegModel.findById(req.query.id).select(
          "-password"
        );

    if (!user)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user",
      });

    return res.status(200).json({
      success: true,
      message: "User Found",
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error,
    });
  }
};

export const getSPDataForSubProfile = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(400).json({
      success: false,
      message: "Failed to Fetch no id provided",
    });
  }

  try {
    const serviceProviderData = await ServiceProviderRegModel.findById(
      req.query.id
    ).select("RegName");
    return res.status(200).json({ success: true, serviceProviderData });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Fetch",
      error: error,
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "No Email provided" });
  }

  if (!newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "No pass provided" });
  }

  try {
    const isVerified = await userOTPModel.findOne({ email });

    if (!isVerified || !isVerified.verified) {
      return res.status(500).json({
        success: false,
        message: "OTP Not Verified",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check in ServiceProviderRegModel and UserModel
    const serviceProvider = await ServiceProviderRegModel.findOne({ email });
    const user = await UserModel.findOne({ email });

    if (!serviceProvider && !user) {
      return res.status(404).json({
        success: false,
        message: "User not found in any database",
      });
    }

    let updatedUser;

    // Update the password based on user type
    if (serviceProvider) {
      updatedUser = await ServiceProviderRegModel.findOneAndUpdate(
        { email },
        { $set: { password: hashedPassword } },
        { new: true }
      );
    } else if (user) {
      updatedUser = await UserModel.findOneAndUpdate(
        { email },
        { $set: { password: hashedPassword } },
        { new: true }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    // Check if the update was successful
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or failed to update password",
      });
    }

    await userOTPModel.deleteMany({ email });

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfull" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Reset Password",
      error: error,
    });
  }
};

export const checkForUser = async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "No Data provided" });
  }

  try {
    const user = await UserModel.find({ email });

    const sp = await ServiceProviderRegModel.find({ email });

    const isUser = Boolean(user.length);
    const isSP = Boolean(sp.length);

    if (isUser || isSP) {
      return res.status(200).json({ success: true, message: "User Found" });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to Get User",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Get User",
      error: error,
    });
  }
};
