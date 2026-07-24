import { ServiceModel } from "../models/PostModels";

/**
 * Returns true if `userId` is allowed to read the article's PDF.
 *
 *   - The article's author always has access.
 *   - If the article has no `shareWithPlans` restriction, any authenticated
 *     user has access (matches existing public-article behavior).
 *   - Otherwise the user must appear in `subscribedBy` or `trailAvailedBy`
 *     of at least one plan in `shareWithPlans`.
 */
export async function userCanAccessArticlePdf(
  userId: string,
  article: { authorData?: { id?: string }; shareWithPlans?: string[] }
): Promise<boolean> {
  if (!userId) return false;

  if (article.authorData?.id && article.authorData.id === userId) {
    return true;
  }

  const planIds = (article.shareWithPlans || []).filter(Boolean);
  if (planIds.length === 0) return true;

  const plans = await ServiceModel.find(
    { _id: { $in: planIds } },
    { subscribedBy: 1, trailAvailedBy: 1 }
  ).lean();

  return plans.some(
    (plan: any) =>
      plan.subscribedBy?.includes(userId) ||
      plan.trailAvailedBy?.includes(userId)
  );
}
