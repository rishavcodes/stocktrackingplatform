import { Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { OrderModel, TradeboxPlansModel } from "../models/TransactionModels";
import { ServiceModel } from "../models/PostModels";

export function UpdatePlanValidityWorker() {
  const updatePlanValidityStatus = new Worker(
    "ValidityStatusQueue",
    async (job) => {
      try {
        const { order } = job.data;

        if (!order) return;

        const orderdByuser = await UserModel.findById(order.orderdBy?.id);
        const orderdBySp = await ServiceProviderRegModel.findById(
          order.orderdBy?.id
        );

        await OrderModel.findByIdAndUpdate(order._id, {
          $set: { isExpired: true },
        });

        await ServiceModel.findByIdAndUpdate(order.subscribedToId, {
          $pull: {
            subscribedBy: order.orderdBy.id,
          },
        });

        if (orderdByuser) {
          await UserModel.findByIdAndUpdate(order.orderdBy?.id, {
            $pull: {
              "ServicesAndOrders.services": order.subscribedToId,
            },
          });
        } else if (orderdBySp) {
          await ServiceProviderRegModel.findByIdAndUpdate(order.orderdBy?.id, {
            $pull: {
              "ServicesAndOrders.services": order.subscribedToId,
            },
          });
        }
      } catch (error) {
        console.log("Error updating status");
      }
    },
    {
      connection,
      autorun: true,
    }
  );
  return updatePlanValidityStatus;
}

export function UpdateFreeTrialValidityWorker() {
  const updateFreeTrialValidityStatus = new Worker(
    "FreeTrialValidityStatusQueue", // Name of the queue
    async (job) => {
      try {
        const { freeTrialOrder } = job.data;

        if (!freeTrialOrder) return;

        // Fetch user associated with the free trial
        const user = await UserModel.findById(freeTrialOrder.orderdBy?.id);
        const serviceProvider = await ServiceProviderRegModel.findById(
          freeTrialOrder.orderdBy?.id
        );

        // Mark the free trial as expired
        await OrderModel.findByIdAndUpdate(freeTrialOrder._id, {
          $set: { isExpired: true },
        });

        // Remove the user from the associated service's subscriber list
        await ServiceModel.findByIdAndUpdate(freeTrialOrder.subscribedToId, {
          $pull: { subscribedBy: freeTrialOrder.orderdBy.id },
        });

        // Update the user's or service provider's service list
        if (user) {
          await UserModel.findByIdAndUpdate(freeTrialOrder.orderdBy?.id, {
            $pull: { "ServicesAndOrders.services": freeTrialOrder.subscribedToId },
          });
        } else if (serviceProvider) {
          await ServiceProviderRegModel.findByIdAndUpdate(
            freeTrialOrder.orderdBy?.id,
            {
              $pull: { "ServicesAndOrders.services": freeTrialOrder.subscribedToId },
            }
          );
        }
      } catch (error) {
        console.error("Error updating free trial status:", error);
      }
    },
    {
      connection,
      autorun: true,
    }
  );

  return updateFreeTrialValidityStatus;
}

export function UpdateTradeboxPlanValidityWorker() {
  const UpdateTradeboxPlanValidityStatus = new Worker(
    "TradeboxPlansValidityStatusQueue",
    async (job) => {
      const { planorder } = job.data;

      if (!planorder) return;

      const tradeboxPlan = await TradeboxPlansModel.findByIdAndUpdate(
        planorder._id,
        { $set: { isExpired: true } }
      );

      await ServiceModel.findByIdAndUpdate(tradeboxPlan?.serviceId, {
        $set: { activated: false },
      });
    },
    { connection, autorun: true }
  );
  return UpdateTradeboxPlanValidityStatus;
}
