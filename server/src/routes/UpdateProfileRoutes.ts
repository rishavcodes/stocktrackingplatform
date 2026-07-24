import { Router } from "express";
import {
  updateBrokerProfileDetails,
  updateSPprofileDetails,
  updateUserProfileDetails,
  updateUserKycDetails,
  uploadSPDocument,
} from "../controllers/UpdateProfileController";
import {
  
  updateProfileUser,
  uploadServiceProviderFiles,
} from "../helpers/updateProfileFileHelper";
import { uploadDocuments } from "../helpers/uploadDocument";

const router = Router();

router.post(
  "/serviceprovider",
  uploadServiceProviderFiles.fields([
    { name: "newPfp", maxCount: 1 },
    { name: "investorCharter", maxCount: 1 },
     { name: "signature", maxCount: 1 },
  ]),
  updateSPprofileDetails
);

router.post(
  "/serviceprovider/document",
  uploadDocuments.single("document"),
  uploadSPDocument
);

router.post(
  "/user",
  updateProfileUser.single("newPfp"),
  updateUserProfileDetails
);

router.patch(
  "/user/kyc",
  updateUserKycDetails
);

router.post(
  "/broker",
  uploadServiceProviderFiles.fields([
    { name: "newPfp", maxCount: 1 },
    { name: "companyLogo", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "CompanyCertificate", maxCount: 1 },
    { name: "investorCharter", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateBrokerProfileDetails
);
export default {
  routes: router,
};
