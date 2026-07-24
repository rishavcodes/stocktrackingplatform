// validators/packageValidator.ts
import { ServiceModel } from "../models/PostModels";

export const validatePackagePayload = async (
  serviceIds: string[],
  userId: string,
  pricingPlans: { price: number; validity: number }[]
) => {
  if (!serviceIds || serviceIds.length < 2) {
    throw "Package must contain at least 2 services";
  }

  if (!Array.isArray(pricingPlans) || pricingPlans.length === 0) {
    throw "At least one pricing tier is required";
  }

  for (const tier of pricingPlans) {
    if (tier.price <= 0) {
      throw "Every tier price must be greater than 0";
    }
    if (tier.validity <= 0 || tier.validity > 365) {
      throw "Validity must be between 1 and 365 days";
    }
  }

  const services = await ServiceModel.find({
    _id: { $in: serviceIds },
  });

  if (services.length !== serviceIds.length) {
    throw "Some services do not exist";
  }

  // ownership validation
  const invalid = services.find((s) => s?.authorData?.id?.toString() !== userId);

  if (invalid) {
    throw "You can only package your own services";
  }

  return services;
};
