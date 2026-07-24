import { Request, Response } from "express";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { deleteObject } from "../helpers/providerRegFileHelper";

export const updateSPprofileDetails = async (req: Request, res: Response) => {
  try {
    const parsedBody = JSON.parse(req.body.data);

    const files = req.files as {
      [fieldname: string]: Express.MulterS3.File[];
    };

    const newPfpFile = files?.newPfp?.[0];
    const investorCharterFile = files?.investorCharter?.[0];
    const signatureFile = files?.signature?.[0]; // Signature file

    const {
      id,
      RegName,
      description,
      email,
      gst,
      hsnCode,
      website,
      instagram,
      youtube,
      twitter,
      linkedin,
      facebook,
      disclaimer,
      refundPolicy,
      privacyPolicy,
      number,
      complianceOfficerName,
      complianceOfficerEmail,
      complianceOfficerNumber,
    } = parsedBody;

    const profile = await ServiceProviderRegModel.findById(id);

    // UPDATE PROFILE
    const newData = await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      {
        $set: {
          RegName,
          description,
          gst,
          hsnCode,
          email,
          website,

          // CORRECTED: Use newPfpFile instead of file
          profileUrl: newPfpFile
            ? newPfpFile.location
            : profile?.profileUrl,

          investorCharter: investorCharterFile
            ? investorCharterFile.location
            : profile?.investorCharter,

          signature: signatureFile
            ? signatureFile.location
            : profile?.signature,

          disclaimer,
          refundPolicy,
          privacyPolicy,
          number,
          socials: { instagram, twitter, youtube, linkedin,facebook },
          complianceOfficerName,
          complianceOfficerEmail,
          complianceOfficerNumber,
        },
      },
      { new: true }
    );

    // DELETE OLD PROFILE PICTURE
    if (profile?.profileUrl && newPfpFile) {
      const decodedURL = decodeURIComponent(profile.profileUrl);
      const key = decodedURL.substring(decodedURL.indexOf("ServiceProviderProfile"));
      if (key) await deleteObject(key);
    }

    // DELETE OLD INVESTOR CHARTER
    if (profile?.investorCharter && investorCharterFile) {
      const decodedURL = decodeURIComponent(profile.investorCharter);
      const key = decodedURL.substring(decodedURL.indexOf("InvestorCharter"));
      if (key) await deleteObject(key);
    }

    // DELETE OLD SIGNATURE
    if (profile?.signature && signatureFile) {
      const decodedURL = decodeURIComponent(profile.signature);
      const key = decodedURL.substring(decodedURL.indexOf("ServiceProviderSignatures"));
      if (key) await deleteObject(key);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      newData,
    });

  } catch (error) {
    console.error("Update failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update",
      error,
    });
  }
};


export const updateUserProfileDetails = async (req: Request, res: Response) => {
  try {
    const parsedBody = JSON.parse(req.body.data);

    const file = req.file as Express.MulterS3.File;

    const { id, name, number, telegram, address, city, state, pincode } = parsedBody;

    // 🚫 Validate presence of required fields
    if (!id || !name || !number) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: id, name, or number",
      });
    }

    // 🚫 Validate data types
    if (
      typeof name !== "string" ||
      typeof number !== "string" ||
      (telegram && typeof telegram !== "string") ||
      (address && typeof address !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid input types",
      });
    }

    // 🚫 Reject unknown/tampered fields like 'role', 'email', etc.
    const allowedKeys = ["id", "name", "number", "telegram", "address", "city", "state", "pincode"];
    for (const key of Object.keys(parsedBody)) {
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field '${key}' is not allowed to be updated.`,
        });
      }
    }

    // ✅ Sanitize values
    const cleanName = name.trim();
    const cleanTelegram = telegram?.trim() || "";
    const cleanAddress = address?.trim() || "";
    const numberPattern = /^\d{10}$/;

    if (!numberPattern.test(number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid number. It should be a 10-digit string.",
      });
    }

     if (cleanName.length > 50) {
       return res.status(400).json({
         success: false,
         message: "Name too long (max 50 characters).",
       });
     }

     if (cleanTelegram.length > 50) {
       return res.status(400).json({
         success: false,
         message: "Telegram handle too long (max 50 characters).",
       });
     }

     if (cleanAddress.length > 300) {
       return res.status(400).json({
         success: false,
         message: "Address too long (max 300 characters).",
       });
     }

    const profile = await UserModel.findById(id);

    const newUserData = await UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          name: cleanName,
          number,
          telegram: cleanTelegram,
          address: cleanAddress,
          city: city?.trim() || "",
          state: state?.trim() || "",
          pincode: pincode?.trim() || "",
          profileUrl: file ? file.location : profile?.profileUrl,
        },
      },
      { new: true }
    );

    const newData = {
      name: newUserData?.name,
      number: newUserData?.number,
      telegram: newUserData?.telegram,
      address: newUserData?.address,
      city: newUserData?.city,
      state: newUserData?.state,
      pincode: newUserData?.pincode,
      profileUrl: file ? file.location : profile?.profileUrl,
    };

    if (profile?.profileUrl?.includes("Users")) {
      const decodedURL = decodeURIComponent(profile.profileUrl);
      const key = decodedURL.substring(decodedURL.indexOf("Users"));

      await deleteObject(key);
    }

    return res.status(200).json({
      success: true,
      message: "Info updated",
      newData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Update",
      error: error,
    });
  }
};



export const updateBrokerProfileDetails = async (req: Request, res: Response) => {
  try {
    const parsedBody = JSON.parse(req.body.data);

    const files = req.files as {
      [fieldname: string]: Express.MulterS3.File[];
    };

    const newPfpFile = files?.newPfp?.[0];
    const companyLogoFile = files?.companyLogo?.[0];
    const certificateFile = files?.certificate?.[0];
    const companyCertificateFile = files?.CompanyCertificate?.[0];
    const investorCharterFile = files?.investorCharter?.[0];
    const signatureFile = files?.signature?.[0];

    const {
      id,
      RegName,
      companyName,
      description,
      email,
      gst,
      hsnCode,
      website,
      instagram,
      youtube,
      twitter,
      linkedin,
      facebook,
      disclaimer,
      refundPolicy,
      privacyPolicy,
      number,
      complianceOfficerName,
      complianceOfficerEmail,
      complianceOfficerNumber,
      lmsCommercial,
      razorpayKey,
      category, // Added this line to match RA structure
    } = parsedBody;

    const profile = await ServiceProviderRegModel.findById(id);

    // Prepare update data - keep the same structure as RA controller
    const updateData: any = {
      RegName,
      companyName,
      description,
      gst,
      hsnCode,
      email,
      website,
      disclaimer,
      refundPolicy,
      privacyPolicy,
      number,
      complianceOfficerName,
      complianceOfficerEmail,
      complianceOfficerNumber,
      socials: { instagram, twitter, youtube, linkedin,facebook },
    };

    // Handle file uploads
    if (newPfpFile) {
      updateData.profileUrl = newPfpFile.location;
    } else if (profile?.profileUrl) {
      updateData.profileUrl = profile.profileUrl;
    }
    
    if (companyLogoFile) {
      updateData.companyLogo = companyLogoFile.location;
    } else if (profile?.companyLogo) {
      updateData.companyLogo = profile.companyLogo;
    }
    
    if (certificateFile) {
      updateData.certificate = certificateFile.location;
    } else if (profile?.certificate) {
      updateData.certificate = profile.certificate;
    }
    
    if (companyCertificateFile) {
      updateData.CompanyCertificate = companyCertificateFile.location;
    } else if (profile?.CompanyCertificate) {
      updateData.CompanyCertificate = profile.CompanyCertificate;
    }
    
    if (investorCharterFile) {
      updateData.investorCharter = investorCharterFile.location;
    } else if (profile?.investorCharter) {
      updateData.investorCharter = profile.investorCharter;
    }
    
    if (signatureFile) {
      updateData.signature = signatureFile.location;
    } else if (profile?.signature) {
      updateData.signature = profile.signature;
    }

    // Handle category - this is important for compatibility
    if (category) {
      updateData.category = category;
    } else if (profile?.category) {
      updateData.category = profile.category;
    }

    // Handle LMS commercial settings
    if (lmsCommercial) {
      updateData.lmsCommercial = {
        enabled: lmsCommercial.enabled,
        commissionPercentage: lmsCommercial.commissionPercentage,
        updatedAt: new Date()
      };
    } else if (profile?.lmsCommercial) {
      // Preserve existing LMS settings if not provided
      updateData.lmsCommercial = profile.lmsCommercial;
    }

    // Handle Razorpay keys
    if (razorpayKey) {
      // Check if we have both key ID and secret
      if (razorpayKey.razorpayKeyId || razorpayKey.razorpayKeySecret) {
        updateData.razorpayKey = {
          razorpayKeyId: razorpayKey.razorpayKeyId || profile?.razorpayKey || "",
          razorpayKeySecret: razorpayKey.razorpayKeySecret || profile?.razorpayKey || ""
        };
      }
    } else if (profile?.razorpayKey) {
      updateData.razorpayKey = profile.razorpayKey;
    }

    console.log("Update Data:", JSON.stringify(updateData, null, 2));

    // Update profile
    const newData = await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    // Delete old files if new ones uploaded
    const deleteOldFile = async (oldUrl: string | undefined, prefix: string) => {
      if (oldUrl) {
        const decodedURL = decodeURIComponent(oldUrl);
        const key = decodedURL.substring(decodedURL.indexOf(prefix));
        if (key) await deleteObject(key);
      }
    };

    if (profile?.profileUrl && newPfpFile) {
      await deleteOldFile(profile.profileUrl, "ServiceProviderProfile");
    }
    
    if (profile?.companyLogo && companyLogoFile) {
      await deleteOldFile(profile.companyLogo, "CompanyLogos");
    }
    
    if (profile?.certificate && certificateFile) {
      await deleteOldFile(profile.certificate, "Certificates");
    }
    
    if (profile?.CompanyCertificate && companyCertificateFile) {
      await deleteOldFile(profile.CompanyCertificate, "CompanyCertificates");
    }
    
    if (profile?.investorCharter && investorCharterFile) {
      await deleteOldFile(profile.investorCharter, "InvestorCharter");
    }
    
    if (profile?.signature && signatureFile) {
      await deleteOldFile(profile.signature, "ServiceProviderSignatures");
    }

    return res.status(200).json({
      success: true,
      message: "Broker profile updated successfully",
      newData,
    });

  } catch (error) {
    console.error("Broker update failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update broker profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const updateUserKycDetails = async (req: Request, res: Response) => {
  try {
    const { id, name, email, pannumber, dob, gender, aadhaarLast4 } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim();
    if (pannumber) updateData.pannumber = pannumber;
    if (dob) updateData.dob = dob;
    if (gender) updateData.gender = gender;
    if (aadhaarLast4) updateData.aadhaarLast4 = aadhaarLast4;

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("KYC update failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const uploadSPDocument = async (req: Request, res: Response) => {
  try {
    const parsedBody = JSON.parse(req.body.data);

    const { name, index } = parsedBody;

    if (!name || index === undefined || index === null) {
      return res.status(500).json({
        success: false,
        message: "Failed to Upload",
      });
    }

    const file = req.file as Express.MulterS3.File;

    const documentData = {
      name,
      link: file.location,
    };

    await ServiceProviderRegModel.findByIdAndUpdate(
      parsedBody.id,
      { $set: { [`Documents.${index}`]: documentData } },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Info updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Upload",
      error: error,
    });
  }
};
