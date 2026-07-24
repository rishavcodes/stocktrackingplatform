// utils/convertScorecard.ts
import { Document } from "mongoose";
import { ScoreCardTypes } from "../types";

export function convertScorecardToType(
  doc: Document & Record<string, any>
): ScoreCardTypes {
  return {
    _id: doc._id,
    authorData: {
      id: doc.authorData.id,
      name: doc.authorData.name,
      email: doc.authorData.email,
      isVerified: doc.authorData.isVerified,
      authorImage: doc.authorData.authorImage,
      type: doc.authorData.type,
      aboutAuthor: doc.authorData.aboutAuthor,
    },
    exchange: doc.exchange,
    scriptname: doc.scriptname,
    token: doc.token,
    entryPrice: doc.entryPrice,
    entryType: doc.entryType,
    rate: doc.rate,
    riskRewardRatio: doc.riskRewardRatio,
    upperRange: doc.upperRange,
    lowerRange: doc.lowerRange,
    target: doc.target,
    stoploss: doc.stoploss,
    validity: doc.validity,
    status: doc.status,
    result: doc.result,
    pnl: doc.pnl,
    ltp: doc.ltp,
    pnlpercentage: doc.pnlpercentage,
    istriggered: doc.istriggered,
    exitRate: doc.exitRate,
    shareWith: doc.shareWith,
    shareWithPlans: doc.shareWithPlans,
    holdingPeriod: doc.holdingPeriod,
    exitDate: doc.exitDate,
    link: doc.link,
    notes: doc.notes,
    recommendationPDF: doc.recommendationPDF,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    triggerType: doc.triggerType,
  };
}
