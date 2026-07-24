import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";
import uniqid from "uniqid";

// Initialize S3 client
const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// Helper function to generate S3 key
const generateS3Key = (req: Request, file: Express.Multer.File, folder: string) => {
  try {
    // Parse the JSON data from the correct location
    let bodyData;
    
    // Try different possible locations for the data
    if (req.body.data) {
      bodyData = typeof req.body.data === 'string' 
        ? JSON.parse(req.body.data) 
        : req.body.data;
    } else if (req.body) {
      bodyData = req.body;
    }
    
    const email = bodyData?.authorData?.email || bodyData?.email || "unknown";
    const regName = bodyData?.authorData?.name || bodyData?.name || "unknown";
    const id = uniqid();

    return `${folder}/${regName}-(${email})/${id}-(${file.fieldname})-${file.originalname}`;
  } catch (error) {
    console.error("Error generating S3 key:", error);
    throw error;
  }
};

// Multer configuration for both TnC PDF and banner image uploads
export const uploadPortfolioFiles = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      try {
        // Determine folder based on file type
        let folder;
        if (file.fieldname === 'tncFile') {
          folder = 'TermsAndConditions';
        } else if (file.fieldname === 'bannerImage') {
          folder = 'BannerImages';
        } else {
          folder = 'OtherFiles';
        }

        const key = generateS3Key(req, file, folder);
        cb(null, key);
      } catch (error) {
        console.error("Error saving file:", error);
        cb(error as Error);
      }
    }
  }),
  fileFilter: function (req, file, cb) {
    // Validate file types
    if (file.fieldname === 'tncFile') {
      // Only allow PDF for TnC files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for TnC'));
      }
    } else if (file.fieldname === 'bannerImage') {
      // Only allow images for banner
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for banner'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for both files
  }
});

// Alternative: Separate upload configurations if needed
export const uploadTnc = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      const key = generateS3Key(req, file, 'TermsAndConditions');
      cb(null, key);
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

export const uploadBanner = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      const key = generateS3Key(req, file, 'BannerImages');
      cb(null, key);
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

// Marketplace banner upload (up to 10 images)
export const uploadMarketplaceBanners = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      try {
        const marketplaceId = req.params.marketplaceId || "unknown";
        const id = uniqid();
        const key = `MarketplaceBanners/${marketplaceId}/${id}-${file.originalname}`;
        cb(null, key);
      } catch (error) {
        console.error("Error saving marketplace banner:", error);
        cb(error as Error);
      }
    },
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for banners"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
  },
});