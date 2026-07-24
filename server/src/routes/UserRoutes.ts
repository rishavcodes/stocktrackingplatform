import { Router } from "express";
import {
	checkRegistration,
	checkTelegram,
	FollowUser,
	getActiveSubscribers,
	getAllServiceProviders,
	getEnrolledEvents,
	sendEmailVerificationOTP,
	verifyEmailOTP,
	getFollowers,
	getFollowingDetails,
	getfollowinglist,
	getInactiveSubscribers,
	getLeadsNormal,
	getPreviousOrderDetails,
	getSPContactDetails,
	getSubscribers,
	getUserDetails,
	pdfParseDocument,
	registerForEvent,
	savaAadhaar,
	UnFollowUser,
	// uploadEsignDocument,
	uploadPanManuallyandGenerateLink,
} from "../controllers/UserController";
import { uploadPanDocumentsManually } from "../helpers/uploadDocument";

const router = Router();

router.get("/userdetails", getUserDetails);

router.post("/follow", FollowUser);

router.post("/unfollow", UnFollowUser);

router.get("/getfollowing/list", getfollowinglist);

router.get("/getfollowing/details", getFollowingDetails);

router.get("/getfollowers", getFollowers);

router.get("/getallsubscribers", getSubscribers);

router.get("/getactivesubscribers", getActiveSubscribers);

router.get("/getinactivesubscribers", getInactiveSubscribers);

router.get("/getleads/normal", getLeadsNormal);
// router.get("/getleads/fund", getLeadsFund);

router.get("/spcontactdetails", getSPContactDetails);
// router.post("/servicepage/contact", contactedViaServicePage);

router.post("/registerforevent", registerForEvent);
router.post("/checkregistration", checkRegistration);
router.post("/like");
router.post("/checktelegram", checkTelegram);
router.post("/save-aadhaar", savaAadhaar);
// router.post("/uploadkycdocuments", uploadKycDocuments);
// router.post("/upload-esign-document", uploadEsignDocument);
router.post("/extract-pdf-text", pdfParseDocument);
router.post(
	"/uploadpandocumentmanually",
	uploadPanDocumentsManually.single("pan"),
	uploadPanManuallyandGenerateLink,
);
router.post("/getpreviousorderdetails", getPreviousOrderDetails);
router.get("/serviceproviders", getAllServiceProviders);

router.get("/events/enrolled", getEnrolledEvents);

router.post("/send-email-otp", sendEmailVerificationOTP);
router.post("/verify-email-otp", verifyEmailOTP);

export default {
	routes: router,
};
