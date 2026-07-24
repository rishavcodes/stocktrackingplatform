import { ObjectId } from "mongoose";
import { Types } from "mongoose";

type GroupedByExchange = {
  [key: string]: string[];
};

export type dataQueryType = {
  mode?: string;
  exchangeTokens?: {
    NSE?: string[];
    BSE?: string[];
    MCX?: string[];
    NFO?: string[];
    CDS?: string[];
    BFO?: string[];
    [key: string]: string[] | undefined;
  };
};

export type ScoreCardTypes = {
  _id: Types.ObjectId;

  authorData: {
    id: string;
    name: string;
    email: string;
    isVerified?: boolean;
    authorImage?: string;
    type?: string;
    aboutAuthor?: string;
  };

  exchange: string;
  scriptname: string;
  token: string;

  entryType: "buy" | "sell";

  entryPrice: number;
  rate?: number;

  targets?: {
    price: number;
    isHit?: boolean;
    hitAt?: Date;
  }[];

  target?: number;
  stoploss: number;

  upperRange?: number;
  lowerRange?: number;

  ltp?: number;

  validity: Date; // ✅ FIXED
  createdAt: Date;
  updatedAt: Date;

  status: "open" | "closed"; // ✅ FIXED
  result?: "tp" | "sl" | "timeout" | "manual";

  pnl?: number;
  pnlpercentage?: number;

  istriggered: "triggered" | "not triggered"; // ✅ FIXED

  triggerType: "above" | "below" | "immediate";

  exitRate?: number;
  exitDate?: Date;

  holdingPeriod?: "intraday" | "btst" | "forward";

  lotsize?: number | null;

  shareWith: string[]; // ✅ FIXED
  shareWithPlans: string[]; // ✅ FIXED

  riskRewardRatio?: string;
  link?: string;
  notes?: string;
  recommendationPDF?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument | ServiceProviderDocument;
    }
  }
}


// types/ScoreCardTelegram.ts
export type ScoreCardTelegram = Pick<
  ScoreCardTypes,
  | "scriptname"
  | "entryType"
  | "entryPrice"
  | "rate"
  | "upperRange"
  | "lowerRange"
  | "target"
  | "stoploss"
  | "validity"
  | "notes"
  | "lotsize"
>;
