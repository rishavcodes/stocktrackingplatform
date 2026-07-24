import { CourseOrderModel } from "../models/CourseOrder";

export async function checkUserPurchase(
  userId: string,
  courseId: string
): Promise<boolean> {
  const order = await CourseOrderModel.findOne({
    buyerId: userId,
    courseId,
    status: "paid",
  }).lean();

  return !!order;
}
