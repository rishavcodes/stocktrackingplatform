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
  checkOTPNumber,
  checkPageRefreshOtp,
  requestMobileOTP,
} from "../controllers/AuthController/OTPController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

router.post("/signin", loginHandler);
// router.post("/admin-login", adminLoginHandler)

router.post("/provider/signup", ProviderSignUp);


router.get("/checkforuser", checkForUser);

router.post("/resetpassword", forgotPassword);


router.post("/requestoptformobile", requestMobileOTP);



router.post("/checkotpnumber", checkOTPNumber);

router.post("/checkrefreshotp", checkPageRefreshOtp);

router.get("/getuserdata", getUserData);



router.post("/logout", verifyUserRATokenMiddleware, logoutHandler);

export default {
  routes: router,
};
