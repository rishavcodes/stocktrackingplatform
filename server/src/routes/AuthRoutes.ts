import { Router } from "express";
import {
  ProviderSignUp,
  // adminLoginHandler,
  adminLogout,
  checkForUser,
  forgotPassword,
  getUserData,
  loginHandler,
  logoutHandler,
} from "../controllers/AuthController/ProviderAuthController";

import {
  checkOTP,
  checkOTPNumber,
  checkPageRefreshOtp,
  requestForOTP,
  requestForOTPForPassReset,
  requestMobileOTP,
} from "../controllers/AuthController/OTPController";
import { upload } from "../helpers/providerRegFileHelper";
import digilockerDocDownload, { userSignUp } from "../controllers/AuthController/UserAuthController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";
import { linkBrokerController } from "../controllers/AuthController/LinkBrokerController";

const router = Router();

router.post("/signin", loginHandler);
// router.post("/admin-login", adminLoginHandler)

router.post(
  "/provider/signup",
  upload.fields([
    { name: "certificate" },
    { name: "CompanyCertificate" },
    { name: "profilePic" },
    { name: "companyLogo" },
    { name: "aadhar" },
    { name: "PAN" },
  ]),
  ProviderSignUp
);

router.post("/user/signup", userSignUp);

router.get("/checkforuser", checkForUser);

router.post("/resetpassword", forgotPassword);

router.post("/requestotp", requestForOTP);

router.post("/requestoptformobile", requestMobileOTP);

router.post("/requestpassresetotp", requestForOTPForPassReset);

router.post("/checkotp", checkOTP);

router.post("/checkotpnumber", checkOTPNumber);

router.post("/checkrefreshotp", checkPageRefreshOtp);

router.get("/getuserdata", getUserData);

router.get("/getdocuments", digilockerDocDownload)

router.post("/link-broker", verifyUserRATokenMiddleware, linkBrokerController);

router.post("/logout", verifyUserRATokenMiddleware, logoutHandler);

export default {
  routes: router,
};
