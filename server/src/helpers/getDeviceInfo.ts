import { Request, Response } from "express";

const getDeviceInfo = (req: Request): string => {
  const userAgent = req.get("User-Agent") || "";
  return userAgent.substring(0, 100); // Limit length
};

export default getDeviceInfo;