import Razorpay from "razorpay";

export default function () {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY as string,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  return instance;
}
