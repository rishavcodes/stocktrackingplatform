import { Request, Response } from "express";
import mongoose from "mongoose";
import { EmailSettingModel } from "../models/AuthModels";
import { ServiceProviderRegModel } from "../models/AuthModels";
import bcrypt from "bcrypt";

export const getEmailSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.query.id as string;

    // Validate query parameter
    if (!userId) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    // Find service provider
    const serviceProvider = await ServiceProviderRegModel.findById(userId);

    if (!serviceProvider) {
      return res.status(404).json({ error: "Service provider not found" });
    }

    // Check if email settings reference exists
    if (!serviceProvider.emailSettings) {
      return res.json({ data: null });
    }

    // Find email settings using the reference ID
    const emailSettings = await EmailSettingModel.findById(
      serviceProvider.emailSettings
    );

    if (!emailSettings) {
      return res.status(404).json({ error: "Email settings not found" });
    }

    return res.json({
      data: {
        _id: emailSettings._id,
        whitelabelEmail: emailSettings.whitelabelEmail,
        whitelabelPassword: emailSettings.whitelabelPassword,
      },
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateEmailSettings = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { whitelabelEmail, whitelabelPassword, id } = req.body;

    // Validation
    if (!whitelabelEmail || !whitelabelPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(whitelabelEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Find user
    const user = await ServiceProviderRegModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let emailSettings = user.emailSettings;

    if (emailSettings) {
      // Update existing settings
      await EmailSettingModel.findByIdAndUpdate(
        emailSettings,
        { whitelabelEmail, whitelabelPassword },
        { new: true, session }
      );
    } else {
      // Create new settings
      const newSettings = new EmailSettingModel({
        whitelabelEmail,
        whitelabelPassword,
      });

      const savedSettings = await newSettings.save();

      // Link to user
      user.emailSettings = savedSettings._id;
      await user.save({ session });
    }

    await session.commitTransaction();
    return res.json({
      success: true,
      message: "Email settings saved successfully",
    });
  } catch (error: any) {
    await session.abortTransaction();

    console.error("Error saving email settings:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: "This email is already registered to another account",
      });
    }

    return res.status(500).json({ error: "Server error" });
  } finally {
    session.endSession();
  }
};
