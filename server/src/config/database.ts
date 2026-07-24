import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGOOSE_URL as string, {
      bufferCommands: false,
    });
    console.log("Connected to database");
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
};
