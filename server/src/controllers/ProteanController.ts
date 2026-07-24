// controllers/ProteanController.ts
import { Request, Response } from "express";
import axios from "axios";
import { getOAuthToken, encryptProteanPayload, decryptProteanResponse } from "../utils/ProteanUtils";

const PROTEAN_BASE = "https://uat.risewithprotean.io/api";
const HEADERS = {
  "Api-Key": process.env.PROTEAN_API_KEY!,
  Authorization: `Bearer ${process.env.PROTEAN_SECRET_KEY!}`,
};

// Set headers for every request
const createHeaders = (token: string) => ({
  "Api-Key": process.env.PROTEAN_API_KEY!,
  Authorization: `Bearer ${token}`,
});

export const getProteanTemplates = async (req: Request, res: Response) => {
  try {
     const token = await getOAuthToken();

     const encryptedPayload = encryptProteanPayload({
       emailOrMobile: process.env.PROTEAN_AUTH_EMAIL,
       password: process.env.PROTEAN_AUTH_PASSWORD,
       documentName: "test-template",
       page: "1",
       limit: "10",
       search: "",
       template_status: "Published",
     });

      const response = await axios.post(
        `${PROTEAN_BASE}/v1/esign/template`,
        encryptedPayload,
        {
          headers: createHeaders(token),
        }
      );
     const decrypted = decryptProteanResponse(response.data);

     return res.status(200).json({
       success: true,
       data: decrypted,
     });
  } catch (error: any) {
    console.error("Protean Template API error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Protean templates",
      error: error?.response?.data || error.message,
    });
  }
};

export const createConfig = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${PROTEAN_BASE}/v1/esign/config`,
      req.body,
      { headers: HEADERS }
    );
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ message: err?.response?.data || err.message });
  }
};

export const checkStampAvailability = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${PROTEAN_BASE}/v1/digi/stamp/availability`,
      req.body,
      { headers: HEADERS }
    );
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ message: err?.response?.data || err.message });
  }
};

export const addRecipient = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${PROTEAN_BASE}/v1/esign/recipient/add`,
      req.body,
      { headers: HEADERS }
    );
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ message: err?.response?.data || err.message });
  }
};

export const submitDocument = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `${PROTEAN_BASE}/v1/esign/submitdoc`,
      req.body,
      { headers: HEADERS }
    );
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ message: err?.response?.data || err.message });
  }
};

export const getRedirectURL = async (req: Request, res: Response) => {
  try {
    const { docid } = req.query;
    const response = await axios.get(
      `${PROTEAN_BASE}/v1/esign/redirect-url?docid=${docid}`,
      {
        headers: HEADERS,
      }
    );
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ message: err?.response?.data || err.message });
  }
};
