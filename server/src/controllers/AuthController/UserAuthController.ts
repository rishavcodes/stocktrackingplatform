import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../../models/AuthModels";
import { ServiceModel } from "../../models/PostModels";
import { LeadModel } from "../../models/TransactionModels";

export const userSignUp = async (req: Request, res: Response) => {
  try {
    const parsedBody = req.body;

    // Only number is strictly required
    if (!parsedBody.number) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const {
      email,
      name,
      number,
      mode,
      telegram,
      dob,
      pannumber,
      gender,
      aadhaarLast4,
      callbackUrl,
    } = req.body;

    // Create user with only provided fields
    const userData: any = {
      number,
    };

    // Add optional fields only if they exist
    if (name) userData.name = name;
    if (email) userData.email = email;

    // Add optional fields only if they exist
    if (telegram) userData.telegram = telegram;
    if (dob) userData.dob = dob;
    if (pannumber) userData.pannumber = pannumber;
    if (gender) userData.gender = gender;
    if (aadhaarLast4) userData.aadhaarLast4 = aadhaarLast4;

    const newUser = new UserModel(userData);
    await newUser.save();

    // Handle callbackUrl if provided
    if (callbackUrl) {
      try {
        // Decode the URL-encoded callbackUrl first
        const decodedCallbackUrl = decodeURIComponent(callbackUrl);
        const serviceId = decodedCallbackUrl.substring(decodedCallbackUrl.lastIndexOf("/") + 1);
        
        // Only proceed if serviceId is a valid MongoDB ObjectId format
        if (serviceId && serviceId.match(/^[0-9a-fA-F]{24}$/)) {
          const service = await ServiceModel.findById(serviceId);

          if (service) {
            const lead = new LeadModel({
              subscribedToId: serviceId,
              serviceName: service?.title,
              serviceProviderId: service?.authorData?.id,
              user: {
                name: name,
                id: newUser._id,
                email: email,
                number: number,
              },
              failureStep: "Sign Up Completed",
            });

            await lead.save();
          }
        }
      } catch (leadError) {
        // Log lead creation error but don't fail the user registration
        console.error("Lead creation failed:", leadError);
        // Continue with user registration even if lead creation fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "User Signed Up Successfully",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("User signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add user",
      
    });
  }
};


export default async function digilockerDocDownload(
  req: Request,
  res: Response
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const { clientId, fileId } = req.query;

    if (!clientId || !fileId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters" });
    }

    const key = process.env.NEXT_PUBLIC_SUREPASS_API_KEY;

    // Call third-party API to fetch the document
    const response = await fetch(
      `https://kyc-api.surepass.io/api/v1/digilocker/download-document/${clientId}/${fileId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        success: false,
        message: errorData.message || "Failed to download document",
      });
    }

    const data = await response.json();

    // Fetch the actual document file
    const fileResponse = await fetch(data.data.download_url);
    const fileBlob = await fileResponse.blob();
    const buffer = await fileBlob.arrayBuffer();

    // Set response headers to allow file download
    res.setHeader("Content-Type", data.data.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="document.pdf"`);

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error downloading document:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}
