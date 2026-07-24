import { Router } from "express";
import {
  applyCoupon,
  applyCouponOnEvent,
  checkSubscribedService,
  claimFreeTrial,
  getAllDocuments,
  getAllSPServices,
  getAllSharewithSPServices,
  getServicesByProvider,
  getSpSubscription,
  getSubscribedCourses,
  getSubscribedServices,
} from "../controllers/ServicesController";

const router = Router();

router.get("/subscribedservices", getSubscribedServices);

router.get("/subscribedcourses", getSubscribedCourses);

router.get("/allservices", getAllSPServices);

router.get("/allservices/sharewith", getAllSharewithSPServices);

router.get("/getdocuments", getAllDocuments);

router.get("/checksubscribedservice", checkSubscribedService);

router.get("/check-subscription", getSpSubscription);

router.get("/getbyprovider/:id", getServicesByProvider);

router.post('/applyCoupon', applyCoupon)

router.post('/applycouponforevent', applyCouponOnEvent)

router.post("/claimfreetrial", claimFreeTrial);


export default {
  routes: router,
};
