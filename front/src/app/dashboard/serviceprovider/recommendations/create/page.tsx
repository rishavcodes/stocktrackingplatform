"use client";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Square,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input, PlansListSelect } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";
import { KeyboardFormProvider, useKeyboardField, useKeyboardForm } from "@/lib/keyboardForm";
import EntryTypeInput from "@/components/Inputs/EntryTypeInput";
import ExchangeInput from "@/components/Inputs/ExchangeInput";
import ExpiryInputFnoInput from "@/components/Inputs/ExpiryInputFnoInput";
import InstrumentInput from "@/components/Inputs/InstrumentInput";
import OptionTypeInput from "@/components/Inputs/OptionTypeInput";
import SegmentInput from "@/components/Inputs/SegmentsInput";
import StrikeInput from "@/components/Inputs/StrikeInput";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import ScriptNameInput from "@/components/Inputs/ScriptNameInput";
import PdfIcon from "@/icons/PdfIcon";
import {
  calculateRatio,
  calculateRiskRewardInNumbers,
} from "@/lib/functions/RiskRewardScoreCard";
import { parseExpiry, expiryToInputMax } from "@/lib/parseExpiry";
import type { RootState } from "@/store/rootReducer";
import { setDropDownState } from "@/store/slices/ScoreCardData";
import QuickMessageBroadcast from "@/components/ServiceProvider/QuickMessageBroadcast";

type TargetItem = {
  price: number;
  quantityPercent?: number; // optional
};


export type TradeDataProps = {
  exchange: string;
  segment: string;
  instrument: string;
  symbol: string;
  expiry: string;
  scriptname: string;
  option: string;
  strike: string;
  entryPrice: number;
  entryType: string;
  isIntraday: string;
  isRateRange: string;
  rate?: number;
  targets: TargetItem[];
  token: string;
  stoploss: number;
  ltp?: number;
  validity: string;
  upperRange?: number;
  lowerRange?: number;
  riskRewardRatio: string;
  notes: string;
  link: string;
  recommendationPDF: File | null;
  lotsize: string;
};

type ExchangeMap = {
  [key: string]: {
    [key: string]: string;
  };
};

type TradeFormErrors = {
  target?: string;
  stoploss?: string;
  upperRange?: string;
  lowerRange?: string;
  targetOrder?: string;
};

const exchangesData: ExchangeMap = {
  NSE: { Equity: "NSE", FnO: "NFO", Currency: "CDS" },
  BSE: { Equity: "BSE", FnO: "BFO", Currency: "CDS" },
  MCX: { MCX: "MCX" },
};

// Market hours configuration
const MARKET_HOURS = {
  NSE: {
    start: { hour: 9, minute: 15 },
    end: { hour: 15, minute: 15 }
  },
  BSE: {
    start: { hour: 9, minute: 15 },
    end: { hour: 15, minute: 15 }
  },
  MCX: {
    start: { hour: 9, minute: 0 },
    end: { hour: 23, minute: 15 } // MCX closes at 11:15 PM
  }
} as const;

// Helper functions for weekday validation
const isWeekday = (dateString: string): boolean => {
  if (!dateString) return true;
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  // return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
  return dayOfWeek !== 6; // changed for budget sunday only, will get fixed later on
};

// commented termporarily just for budget week
// const getNextWeekday = (): string => {
//   const today = new Date();
//   const nextDay = new Date(today);

//   // Start from tomorrow
//   nextDay.setDate(nextDay.getDate() + 1);

//   // Skip weekends
//   while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
//     nextDay.setDate(nextDay.getDate() + 1);
//   }

//   return nextDay.toISOString().split("T")[0];
// };

// to be removed after budget week
const getNextWeekday = (): string => {
  const today = new Date();
  const nextDay = new Date(today);

  // Start from tomorrow
  nextDay.setDate(nextDay.getDate() + 1);

  // Skip only Saturdays (not Sundays)
  while (nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay.toISOString().split("T")[0];
};
// to be removed after budget week

// Next working day for BTST (Buy Today Sell Tomorrow): the next calendar day
// that is not a weekend. Skips BOTH Saturday and Sunday (unlike getNextWeekday
// above, which only skips Saturday for the temporary budget-week behaviour).
const getNextWorkingDay = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split("T")[0];
};

// Helper function to check if market is open commented just for budget week
// const isMarketOpen = (exchange: string): boolean => {
//   if (!exchange || !MARKET_HOURS[exchange as keyof typeof MARKET_HOURS]) {
//     return true; // If exchange not defined, allow creation
//   }

//   const now = new Date();
//   const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
//   const currentHour = nowIST.getHours();
//   const currentMinute = nowIST.getMinutes();

//   const market = MARKET_HOURS[exchange as keyof typeof MARKET_HOURS];
//   const currentTimeInMinutes = currentHour * 60 + currentMinute,
//   const marketStartInMinutes = market.start.hour * 60 + market.start.minute;
//   const marketEndInMinutes = market.end.hour * 60 + market.end.minute;

//   return currentTimeInMinutes >= marketStartInMinutes &&
//     currentTimeInMinutes <= marketEndInMinutes;
// };

// just for budget week
const isMarketOpen = (exchange: string): boolean => {
  if (!exchange || !MARKET_HOURS[exchange as keyof typeof MARKET_HOURS]) {
    return true;
  }

  const now = new Date();
  const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // Check if it's Saturday - market closed all day
  if (nowIST.getDay() === 6) {
    return false;
  }

  const currentHour = nowIST.getHours();
  const currentMinute = nowIST.getMinutes();

  const market = MARKET_HOURS[exchange as keyof typeof MARKET_HOURS];
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const marketStartInMinutes = market.start.hour * 60 + market.start.minute;
  const marketEndInMinutes = market.end.hour * 60 + market.end.minute;

  return currentTimeInMinutes >= marketStartInMinutes &&
    currentTimeInMinutes <= marketEndInMinutes;
};
// just for budget week

// Helper function to get market status message just for budget week commented
// const getMarketStatusMessage = (exchange: string): string => {
//   if (!exchange || !MARKET_HOURS[exchange as keyof typeof MARKET_HOURS]) {
//     return "";
//   }

//   const market = MARKET_HOURS[exchange as keyof typeof MARKET_HOURS];
//   const isOpen = isMarketOpen(exchange);

//   if (isOpen) {
//     return " ";
//   } else {
//     return `MARKET IS CLOSED (Trading hours: ${market.start.hour}:${market.start.minute.toString().padStart(2, '0')} - ${market.end.hour}:${market.end.minute.toString().padStart(2, '0')} IST)`;
//   }
// };

// to be removed after budget week
const getMarketStatusMessage = (exchange: string): string => {
  if (!exchange || !MARKET_HOURS[exchange as keyof typeof MARKET_HOURS]) {
    return "";
  }

  const now = new Date();
  const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  if (nowIST.getDay() === 6) {
    return "MARKET IS CLOSED (Saturday)";
  }

  const market = MARKET_HOURS[exchange as keyof typeof MARKET_HOURS];
  const isOpen = isMarketOpen(exchange);

  if (isOpen) {
    return " ";
  } else {
    return `MARKET IS CLOSED (Trading hours: ${market.start.hour}:${market.start.minute.toString().padStart(2, '0')} - ${market.end.hour}:${market.end.minute.toString().padStart(2, '0')} IST)`;
  }
};

const getTodayDateString = (): string => {
  // Returns today's date as "YYYY-MM-DD" in the user's local time.
  // The backend is responsible for appending the correct IST market-close time.
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function CreateData() {
  const { toast } = useToast();
  const session = useSession();
  const router = useRouter();

  // View-only admin sub profiles can't post recommendations. Bounce them to the
  // read-only list if they reach this form via the sidebar or a direct URL (the
  // backend also rejects the create call). No early return — that would skip the
  // hooks declared below and break the Rules of Hooks.
  const readOnly = isReadOnlySubProfile(session?.data);
  useEffect(() => {
    if (readOnly) {
      router.replace(
        "/dashboard/serviceprovider/recommendations/myrecommendations",
      );
    }
  }, [readOnly, router]);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCMP, setIsFetchingCMP] = useState(false);
  const [marketStatus, setMarketStatus] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: true, message: "" });

  const [tradeData, setTradeData] = useState<TradeDataProps>({
    exchange: "",
    segment: "",
    instrument: "",
    symbol: "",
    expiry: "",
    scriptname: "",
    option: "",
    strike: "",
    entryType: "",
    targets: [{ price: 0 }, { price: 0 }, { price: 0 }],
    isIntraday: "intraday",
    isRateRange: "rate",
    entryPrice: 0,
    stoploss: 0,
    token: "",
    validity: "",
    riskRewardRatio: "",
    notes: "",
    link: "",
    recommendationPDF: null,
    lotsize: "",
  });

  const [errors, setErrors] = useState<TradeFormErrors>({});
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [shareWith, setShareWith] = useState<string[]>(["subscribers"]);
  const [shareWithPlans, setShareWithPlans] = useState<string[]>([]);
  const [isCMPChecked, setIsCMPChecked] = useState(false);
  const [plansListKey, setPlansListKey] = useState(0);
  const [validityOption, setValidityOption] = useState("intraday");
  const [isValidityDropdownOpen, setIsValidityDropdownOpen] = useState(false);
  const validityDropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();


  const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(
    [],
  );

  const isDropdownOpen = useSelector((state: RootState) => state.ScoreCardData);
  const [isCustomDate, setIsCustomDate] = useState(false);

  /* -------------------------------------------------
     Keyboard-form field order — STATIC (broker-terminal flow)
     Every field is always rendered; `disabled` predicates below
     control which are interactive. focusNext walks past disabled.
  -------------------------------------------------- */
  const FIELD_ORDER = useMemo(
    () =>
      [
        "entryType",
        "exchange",
        "segment",
        "instrument",
        "symbol",
        "strike",
        "option",
        "expiry",
        "isRateRange",
        "rate",
        "lowerRange",
        "upperRange",
        "stoploss",
        "target_0",
        "target_1",
        "target_2",
        "validity",
        "validityCustom",
        "notes",
        "submit",
      ] as const,
    []
  );

  const isFnO = tradeData.segment === "FnO";
  const isOptions =
    tradeData.instrument === "OPTSTK" ||
    tradeData.instrument === "OPTIDX" ||
    tradeData.instrument === "OPTFUT";
  const isEquityExch =
    tradeData.exchange === "NSE" || tradeData.exchange === "BSE";

  // For FnO / MCX trades, the contract has a fixed expiry — validity must
  // not outlive it. `expiryMaxStr` is "YYYY-MM-DD" suitable for an
  // <input type="date"> max attribute; null when no expiry applies.
  const expiryDate = useMemo(
    () => parseExpiry(tradeData.expiry),
    [tradeData.expiry]
  );
  const expiryMaxStr = useMemo(
    () => expiryToInputMax(tradeData.expiry),
    [tradeData.expiry]
  );

  const disabled: Record<string, boolean> = {
    entryType: false,
    exchange: false,
    segment: !isEquityExch,
    instrument: !(tradeData.exchange === "MCX" || isFnO),
    symbol: !(
      tradeData.exchange === "MCX" ||
      tradeData.segment === "Equity" ||
      isFnO
    ),
    strike: !isOptions,
    option: !isOptions,
    expiry: !(tradeData.exchange === "MCX" || isFnO),
    isRateRange: false,
    rate: tradeData.isRateRange !== "rate" || isCMPChecked,
    lowerRange: tradeData.isRateRange !== "range",
    upperRange: tradeData.isRateRange !== "range",
    stoploss: false,
    // Targets 2 and 3 stay editable; only Target 1 is required for submit.
    target_0: false,
    target_1: false,
    target_2: false,
    validity: false,
    validityCustom: validityOption !== "custom",
    notes: false,
    submit: false,
  };

  /* -------------------------------------------------
     Required map — `required[fieldId]` controls the red `*` next to
     each label. A field is required only if it's currently enabled AND
     the form actually needs a value there. Targets 2 & 3, notes, and
     PDF stay optional.
  -------------------------------------------------- */
  const required: Record<string, boolean> = {
    entryType: !disabled.entryType,
    exchange: !disabled.exchange,
    segment: !disabled.segment,
    instrument: !disabled.instrument,
    symbol: !disabled.symbol,
    strike: !disabled.strike,
    option: !disabled.option,
    expiry: !disabled.expiry,
    isRateRange: !disabled.isRateRange,
    rate: !disabled.rate,
    lowerRange: !disabled.lowerRange,
    upperRange: !disabled.upperRange,
    stoploss: !disabled.stoploss,
    target_0: !disabled.target_0,
    target_1: false,
    target_2: false,
    validity: !disabled.validity,
    validityCustom: !disabled.validityCustom,
    notes: false,
    submit: false,
  };

  /* -------------------------------------------------
     Cascading dropdown reset. The script picker is a
     chain (exchange → segment → instrument → symbol →
     strike → option → expiry). Changing any field in
     the chain must clear every field that depends on
     it. Keep the order in one place so the rule can't
     drift between fields.
  -------------------------------------------------- */
  const CASCADE_FIELDS = [
    "exchange",
    "segment",
    "instrument",
    "symbol",
    "strike",
    "option",
    "expiry",
  ] as const;
  type CascadeField = (typeof CASCADE_FIELDS)[number];

  const cascadePrevRef = useRef<Record<CascadeField, string>>({
    exchange: tradeData.exchange,
    segment: tradeData.segment,
    instrument: tradeData.instrument,
    symbol: tradeData.symbol,
    strike: tradeData.strike,
    option: tradeData.option,
    expiry: tradeData.expiry,
  });

  useEffect(() => {
    for (const field of CASCADE_FIELDS) {
      const current = tradeData[field] as string;
      if (cascadePrevRef.current[field] === current) continue;

      cascadePrevRef.current[field] = current;
      const idx = CASCADE_FIELDS.indexOf(field);
      const downstream = CASCADE_FIELDS.slice(idx + 1);
      if (downstream.length === 0) break;

      setTradeData((prev) => {
        const next = { ...prev };
        let touched = false;
        for (const f of downstream) {
          if ((next as any)[f] !== "") {
            (next as any)[f] = "";
            cascadePrevRef.current[f] = "";
            touched = true;
          }
        }
        return touched ? next : prev;
      });
      break; // only act on the field that actually moved
    }
  }, [
    tradeData.exchange,
    tradeData.segment,
    tradeData.instrument,
    tradeData.symbol,
    tradeData.strike,
    tradeData.option,
    tradeData.expiry,
  ]);

  useEffect(() => {
    if (tradeData.isIntraday === "intraday") {
      setTradeData((prev) => ({
        ...prev,
        validity: getTodayDateString(),
      }));
    }
  }, [tradeData.isIntraday]);

  // Update market status when exchange changes
  useEffect(() => {
    if (tradeData.exchange && (tradeData.exchange === "NSE" || tradeData.exchange === "BSE" || tradeData.exchange === "MCX")) {
      const isOpen = isMarketOpen(tradeData.exchange);
      const message = getMarketStatusMessage(tradeData.exchange);
      setMarketStatus({ isOpen, message });

      // If market is closed and intraday is currently selected, auto-switch to 1-week forward
      if (!isOpen && tradeData.isIntraday === "intraday") {
        setValidityOption("1week");
        setIsCustomDate(false);
        setTradeData(prev => ({ ...prev, isIntraday: "forward" }));
        handleDropdownChange("1week");
      }
    } else {
      setMarketStatus({ isOpen: true, message: "" });
    }
  }, [tradeData.exchange]);

  // Close validity dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (validityDropdownRef.current && !validityDropdownRef.current.contains(event.target as Node)) {
        setIsValidityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDropdownChange = (value: string) => {
    let selectedDate: Date | null = null;
    const currentDate = new Date();

    const addDaysSkipWeekends = (date: Date, days: number): Date => {
      const result = new Date(date);
      let daysToAdd = days;

      while (daysToAdd > 0) {
        result.setDate(result.getDate() + 1);
        // Only count weekdays (Monday to Friday)
        // if (result.getDay() !== 0 && result.getDay() !== 6) {
        if (result.getDay() !== 6) {
          daysToAdd--;
        }
      }
      return result;
    };

    switch (value) {
      case "1week":
        selectedDate = addDaysSkipWeekends(currentDate, 5);
        break;
      case "1month":
        selectedDate = addDaysSkipWeekends(currentDate, 22);
        break;
      case "3months":
        selectedDate = addDaysSkipWeekends(currentDate, 66);
        break;
      case "6months":
        selectedDate = addDaysSkipWeekends(currentDate, 132);
        break;
      case "1year":
        selectedDate = addDaysSkipWeekends(currentDate, 260);
        break;
      default:
        selectedDate = null;
    }

    if (selectedDate) {
      const event = {
        target: {
          name: "validity",
          value: selectedDate.toISOString().split("T")[0],
        },
      } as React.ChangeEvent<HTMLInputElement>;

      handleChange(event);
    }
  };

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;

    let inputValue: string | number | boolean =
      type === "checkbox" ? checked : value;

    // Numeric fields (removed "target")
    if (
      ["entryPrice", "stoploss", "rate", "upperRange", "lowerRange"].includes(name)
    ) {
      if (value.startsWith("-")) return;
      if (!/^\d*\.?\d*$/.test(value)) return;

      // Store raw string to preserve intermediate states like "11.0"
      setRawValues(prev => ({ ...prev, [name]: value }));

      const numericValue = value === "" || value === "." ? 0 : parseFloat(value) || 0;

      setTradeData((prev) => {
        const updated = {
          ...prev,
          [name]: numericValue,
        };

        /* ---- CORE VALUES ---- */
        const actualEntryPrice =
          updated.isRateRange === "rate"
            ? isCMPChecked
              ? updated.entryPrice
              : updated.rate || updated.entryPrice
            : updated.entryType === "buy"
              ? updated.upperRange || updated.entryPrice
              : updated.lowerRange || updated.entryPrice;

        const primaryTarget = updated.targets?.[0]?.price || 0;
        const stoploss = updated.stoploss || 0;
        const upperRange = updated.upperRange || 0;
        const lowerRange = updated.lowerRange || 0;

        const newErrors: TradeFormErrors = {};

        /* ---- RATE VALIDATION ---- */
        if (updated.isRateRange === "rate") {
          if (updated.entryType === "buy") {
            if (primaryTarget && primaryTarget <= actualEntryPrice) {
              newErrors.target =
                "For BUY, Target 1 must be higher than entry price.";
            }
            if (stoploss && stoploss >= actualEntryPrice) {
              newErrors.stoploss =
                "For BUY, stoploss must be lower than entry price.";
            }
          }

          if (updated.entryType === "sell") {
            if (primaryTarget && primaryTarget >= actualEntryPrice) {
              newErrors.target =
                "For SELL, Target 1 must be lower than entry price.";
            }
            if (stoploss && stoploss <= actualEntryPrice) {
              newErrors.stoploss =
                "For SELL, stoploss must be higher than entry price.";
            }
          }
        }

        /* ---- RANGE VALIDATION ---- */
        if (updated.isRateRange === "range") {
          if (upperRange > 0 && lowerRange > 0 && upperRange <= lowerRange) {
            newErrors.upperRange =
              "Upper range must be greater than lower range.";
          }

          if (updated.entryType === "buy" && upperRange > 0) {
            if (primaryTarget && primaryTarget <= upperRange) {
              newErrors.target =
                "For BUY range, Target 1 must be higher than upper range.";
            }
            if (stoploss && stoploss >= lowerRange) {
              newErrors.stoploss =
                "For BUY range, stoploss must be lower than lower range.";
            }
          }

          if (updated.entryType === "sell" && lowerRange > 0) {
            if (primaryTarget && primaryTarget >= lowerRange) {
              newErrors.target =
                "For SELL range, Target 1 must be lower than lower range.";
            }
            if (stoploss && stoploss <= upperRange) {
              newErrors.stoploss =
                "For SELL range, stoploss must be higher than upper range.";
            }
          }
        }

        setErrors(newErrors);
        return updated;
      });

      return;
    }

    /* ---- DATE VALIDATION ---- */
    if (name === "validity" && value) {
      if (!isWeekday(value)) {
        toast({
          title: "Invalid Date",
          description: "Please select a weekday (Monday to Friday).",
          variant: "destructive",
        });
        return;
      }
      // Store only the "YYYY-MM-DD" date string — backend sets the IST market-close time
      setTradeData((prev) => ({ ...prev, validity: value }));
      return;
    }

    setTradeData((prev) => ({ ...prev, [name]: inputValue }));
  }

  const handleCMPChange = () => {
    setIsCMPChecked((prev) => {
      const newState = !prev;

      setTradeData((prevData) => {
        const newRate = newState ? prevData.entryPrice : 0;
        setRawValues((rv) => ({ ...rv, rate: newRate ? String(newRate) : "" }));
        return { ...prevData, rate: newRate };
      });

      return newState;
    });
  };

  useEffect(() => {
    if (tradeData.scriptname !== "" && tradeData.entryPrice === 0) {
      dispatch(setDropDownState(true));
    }

    if (tradeData.scriptname === "") {
      dispatch(setDropDownState(false));
      setTradeData((prev) => ({ ...prev, entryPrice: 0 }));
    }
  }, [tradeData.scriptname, tradeData.entryPrice, dispatch]);

  function recommendationPDFChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;

    if (files && files.length > 0) {
      const file = files[0];
      setTradeData((prev) => ({ ...prev, recommendationPDF: file }));
    } else {
      console.log("file not found");
    }
  }

  /* ---------------- TARGET HANDLERS ---------------- */

  const addTarget = () => {
    if (tradeData.targets.length >= 3) return;
    setTradeData(prev => ({
      ...prev,
      targets: [...prev.targets, { price: 0 }]
    }));
  };

  const removeTarget = (index: number) => {
    setTradeData(prev => {
      const updated = prev.targets.filter((_, i) => i !== index);

      // Rebuild raw values for targets with corrected indices
      setRawValues(prev => {
        const newRaw = { ...prev };
        // Remove all target raw values and re-index
        for (const key of Object.keys(newRaw)) {
          if (key.startsWith("target_")) delete newRaw[key];
        }
        updated.forEach((t, i) => {
          newRaw[`target_${i}_price`] = String(t.price || "");
        });
        return newRaw;
      });

      // Re-validate target ordering after removal
      let orderError = "";
      if (updated.length > 1) {
        const isSell = prev.entryType === "sell";
        for (let i = 1; i < updated.length; i++) {
          if (updated[i].price > 0 && updated[i - 1].price > 0) {
            if (isSell && updated[i].price >= updated[i - 1].price) {
              orderError = `Target ${i + 1} must be less than Target ${i}.`;
              break;
            }
            if (!isSell && updated[i].price <= updated[i - 1].price) {
              orderError = `Target ${i + 1} must be greater than Target ${i}.`;
              break;
            }
          }
        }
      }
      setErrors(prev => ({ ...prev, targetOrder: orderError || undefined }));

      return { ...prev, targets: updated };
    });
  };

  const updateTarget = (
    index: number,
    field: "price" | "quantityPercent",
    rawValue: string
  ) => {
    if (!/^\d*\.?\d*$/.test(rawValue)) return;

    // Store raw string to preserve intermediate states like "11.0"
    setRawValues(prev => ({ ...prev, [`target_${index}_${field}`]: rawValue }));

    const value = rawValue === "" || rawValue === "." ? 0 : parseFloat(rawValue) || 0;

    setTradeData(prev => {
      const updated = [...prev.targets];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "price") {
        // Validate Target 1 against entry price
        const actualEntryPrice =
          prev.isRateRange === "rate"
            ? isCMPChecked
              ? prev.entryPrice
              : prev.rate || prev.entryPrice
            : prev.entryType === "buy"
              ? prev.upperRange || prev.entryPrice
              : prev.lowerRange || prev.entryPrice;

        const primaryTarget = updated[0]?.price || 0;
        let targetError: string | undefined;

        if (prev.isRateRange === "rate") {
          if (prev.entryType === "buy" && primaryTarget > 0 && actualEntryPrice > 0 && primaryTarget <= actualEntryPrice) {
            targetError = "For BUY, Target 1 must be higher than entry price.";
          }
          if (prev.entryType === "sell" && primaryTarget > 0 && actualEntryPrice > 0 && primaryTarget >= actualEntryPrice) {
            targetError = "For SELL, Target 1 must be lower than entry price.";
          }
        }

        if (prev.isRateRange === "range") {
          if (prev.entryType === "buy" && (prev.upperRange || 0) > 0 && primaryTarget > 0 && primaryTarget <= (prev.upperRange || 0)) {
            targetError = "For BUY range, Target 1 must be higher than upper range.";
          }
          if (prev.entryType === "sell" && (prev.lowerRange || 0) > 0 && primaryTarget > 0 && primaryTarget >= (prev.lowerRange || 0)) {
            targetError = "For SELL range, Target 1 must be lower than lower range.";
          }
        }

        // Validate target ordering based on entry type
        let orderError: string | undefined;
        if (updated.length > 1) {
          const isSell = prev.entryType === "sell";
          for (let i = 1; i < updated.length; i++) {
            if (updated[i].price > 0 && updated[i - 1].price > 0) {
              if (isSell && updated[i].price >= updated[i - 1].price) {
                orderError = `Target ${i + 1} must be less than Target ${i}.`;
                break;
              }
              if (!isSell && updated[i].price <= updated[i - 1].price) {
                orderError = `Target ${i + 1} must be greater than Target ${i}.`;
                break;
              }
            }
          }
        }

        setErrors(prevErrors => ({ ...prevErrors, target: targetError, targetOrder: orderError }));
      }

      return { ...prev, targets: updated };
    });
  };

  // CORRECTED handleSubmit function
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Block intraday trades when market is closed; forward trades are always allowed
    if (tradeData.isIntraday === "intraday" && !marketStatus.isOpen) {
      toast({
        title: "Intraday Unavailable",
        description: "Market is closed. Please select a forward validity (1 Week, 1 Month, etc.)",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Validate weekend date before submission
    if (tradeData.isIntraday === "forward" && tradeData.validity && !isWeekday(tradeData.validity)) {
      toast({
        title: "Invalid Date",
        description: "Please select a weekday (Monday to Friday) for validity.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validity must not outlive the contract expiry on FnO / MCX trades.
    if (
      expiryDate &&
      tradeData.validity &&
      new Date(tradeData.validity) > expiryDate
    ) {
      toast({
        title: "Invalid Validity",
        description: "Validity cannot exceed contract expiry.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (tradeData.recommendationPDF && tradeData.recommendationPDF.size > 6291456) {
      toast({
        title: "Max File Size Exceeds",
        description: "Please select files under 5mb",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (tradeData.entryType === "") {
      toast({
        title: "Error",
        description: "Please select entry type",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (tradeData.isIntraday === "") {
      toast({
        title: "Error",
        description: "Please select entry validity",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (shareWith.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one value for share with",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate range trades
    if (tradeData.isRateRange === "range") {
      if (!tradeData.upperRange || !tradeData.lowerRange) {
        toast({
          title: "Error",
          description: "Please enter both upper and lower range values",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (tradeData.upperRange <= tradeData.lowerRange) {
        toast({
          title: "Error",
          description: "Upper range must be greater than lower range",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    if (!tradeData.targets[0]?.price) {
      toast({
        title: "Error",
        description: "At least one target is required",
        variant: "destructive",
      });
      return;
    }

    // Validate target ordering for multiple targets
    if (tradeData.targets.length > 1) {
      const isSell = tradeData.entryType === "sell";
      for (let i = 1; i < tradeData.targets.length; i++) {
        if (tradeData.targets[i].price > 0 && tradeData.targets[i - 1].price > 0) {
          if (isSell && tradeData.targets[i].price >= tradeData.targets[i - 1].price) {
            toast({
              title: "Invalid Targets",
              description: `Target ${i + 1} must be less than Target ${i}.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          if (!isSell && tradeData.targets[i].price <= tradeData.targets[i - 1].price) {
            toast({
              title: "Invalid Targets",
              description: `Target ${i + 1} must be greater than Target ${i}.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }
    }

    const exch =
      exchangesData[tradeData.exchange]?.[tradeData.segment] ||
      exchangesData[tradeData.exchange]?.[tradeData.exchange] ||
      null;

    const primaryTarget = tradeData.targets[0].price;

    const entryPriceForCalculation =
      tradeData.isRateRange === "rate"
        ? isCMPChecked
          ? tradeData.entryPrice
          : tradeData.rate || tradeData.entryPrice
        : tradeData.entryType === "buy"
          ? tradeData.upperRange || tradeData.entryPrice
          : tradeData.lowerRange || tradeData.entryPrice;

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user.id,
      // Sub-profiles are auto-created without a profile picture, so profileUrl
      // (and occasionally category) can be undefined. Default to "" so these
      // keys are ALWAYS present in the JSON — the backend's createScoreCard
      // requires every key via hasOwnProperty, and JSON.stringify drops
      // undefined values, which otherwise triggers a false "All fields are
      // required" error for user sub-profiles.
      type: session.data?.user.category ?? "",
      authorImage: session.data?.user.profileUrl ?? "",
      ...tradeData,
      // Targets 2 and 3 are optional — drop any slot the provider left blank
      // so the backend doesn't see phantom 0-price targets.
      targets: tradeData.targets.filter((t) => Number(t?.price) > 0),
      exchange: exch,
      shareWith,
      shareWithPlans,
      ltp: tradeData.entryPrice, // Current market price (CMP)
      rate: isCMPChecked ? tradeData.entryPrice : tradeData.rate, // Manual entry rate
      validity: tradeData.validity, // "YYYY-MM-DD"; backend sets the IST market-close time
      // CORRECTED: Use the proper entry price for risk-reward calculation
      riskRewardRatio: calculateRatio(
        primaryTarget,
        entryPriceForCalculation,
        tradeData.stoploss,
        tradeData.entryType.toLowerCase()
      ),
      notes: tradeData.notes,
      link: tradeData.link,
      shareWithMarketplaces: shareWithMarketplaces,
      isCMPChecked: isCMPChecked,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (tradeData.recommendationPDF) {
      formData.append("recommendationPDF", tradeData.recommendationPDF);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/create`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (response.status === 200) {
        toast({
          title: "Trade Created Successfully",
          description: "Your trade recommendation has been published",
          variant: "default",
        });
        resetForm();
      } else {
        toast({
          title: "Error!",
          description: result.message || "There was an error creating trade please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error creating trade please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const primaryTarget = tradeData.targets[0]?.price || 0;

  // CORRECTED riskRewardNumbers calculation
  const riskRewardNumbers = calculateRiskRewardInNumbers(
    // For rate trades: use manual rate or CMP, for range trades: use appropriate range
    tradeData.isRateRange === "rate"
      ? (isCMPChecked ? tradeData.entryPrice : (tradeData.rate || tradeData.entryPrice))
      : (tradeData.entryType === "buy"
        ? (tradeData.upperRange || tradeData.entryPrice)
        : (tradeData.lowerRange || tradeData.entryPrice)),
    primaryTarget,
    tradeData.stoploss,
    tradeData.entryType.toLowerCase(),
    1, // quantity
    parseInt(tradeData.lotsize) || 1 // lot size
  );

  async function getCMP(token: string, exchange: string, name: string) {
    setIsFetchingCMP(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getcmp`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ token: [token], exchange }),
      });

      if (res.status !== 200) {
        setTradeData((prev) => ({ ...prev, entryPrice: 0 }));
        toast({
          title: "Error",
          description: "Failed to fetch current market price",
          variant: "destructive",
        });
        return;
      }
      const rawRes = await res.json();
      setTradeData((prev) => ({
        ...prev,
        entryPrice: rawRes.data,
        scriptname: name,
        token,
      }));
    } catch (error) {
      setTradeData((prev) => ({ ...prev, entryPrice: 0 }));
      toast({
        title: "Error",
        description: "Failed to fetch current market price",
        variant: "destructive",
      });
    } finally {
      setIsFetchingCMP(false);
    }
  }

  const handleUpdate = async () => {
    const { exchange, segment, symbol, instrument, expiry, strike, option } = tradeData;

    const isNSEOrBSE = (exchange + segment) === "NSEEquity" || (exchange + segment) === "BSEEquity";
    const isMCX = exchange === "MCX";
    const isFnO =
      exchange &&
      segment &&
      symbol &&
      expiry &&
      ((strike && option) || instrument?.startsWith("FUT"));

    if (isFnO || (isMCX && exchange && symbol && expiry && instrument) || (isNSEOrBSE && symbol)) {
      // Determine exch_seg for the API call
      let exchSeg = "";
      if ((exchange + segment) === "NSEEquity") exchSeg = "NSE";
      else if ((exchange + segment) === "BSEEquity") exchSeg = "BSE";
      else if ((exchange + segment) === "NSEFnO") exchSeg = "NFO";
      else if ((exchange + segment) === "BSEFnO") exchSeg = "BFO";
      else if (exchange === "MCX") exchSeg = "MCX";

      if (!exchSeg) return;

      // Determine the exchange code for CMP API (same as exchangesData mapping)
      const cmpExchange =
        exchangesData[exchange]?.[segment] ||
        exchangesData[exchange]?.[exchange] ||
        exchSeg;

      try {
        const params = new URLSearchParams({ exch_seg: exchSeg, name: symbol });
        if (expiry) params.set("expiry", expiry);
        if (strike) params.set("strike", strike);
        if (option) params.set("option", option);
        if (instrument) params.set("instrumenttype", instrument);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/token?${params}`
        );

        if (res.status !== 200) {
          toast({
            title: "Token Not Found!",
            description: "Token item not found in the list.",
            variant: "destructive",
          });
          return;
        }

        const { data: tokenItem } = await res.json();

        if (tokenItem) {
          if (tokenItem.lotsize) {
            setTradeData((prev) => ({ ...prev, lotsize: tokenItem.lotsize }));
          }
          await getCMP(tokenItem.token, cmpExchange, tokenItem.symbol || symbol);
        }
      } catch (error) {
        toast({
          title: "Token Not Found!",
          description: "Failed to look up token.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    handleUpdate();
  }, [
    tradeData.exchange,
    tradeData.segment,
    tradeData.symbol,
    tradeData.expiry,
    tradeData.strike,
    tradeData.option,
    tradeData.instrument,
  ]);

  // CORRECTED resetForm function
  function resetForm() {
    console.log("Resetting form...");
    setShareWithPlans([]);
    setTradeData({
      exchange: "",
      segment: "",
      instrument: "",
      symbol: "",
      expiry: "",
      scriptname: "",
      option: "",
      strike: "",
      entryType: "",
      targets: [{ price: 0 }, { price: 0 }, { price: 0 }],
      isIntraday: "intraday",
      isRateRange: "rate",
      entryPrice: 0,
      stoploss: 0,
      token: "",
      validity: "",
      riskRewardRatio: "",
      notes: "",
      link: "",
      recommendationPDF: null,
      lotsize: "",
    });

    setShareWith(["subscribers"]);
    setShareWithPlans([]);
    setShareWithMarketplaces([]);
    setIsCMPChecked(false);
    setIsCustomDate(false);
    setValidityOption("intraday");
    setIsLoading(false);
    setErrors({});
    setRawValues({});
    setMarketStatus({ isOpen: true, message: "" });

    dispatch(setDropDownState(false));
    setPlansListKey(prev => prev + 1);
  }

  const handleRefreshCMP = async () => {
    if (tradeData.token && tradeData.exchange) {
      // Transform exchange to the correct format for API (same as in handleSubmit)
      const exch =
        exchangesData[tradeData.exchange]?.[tradeData.segment] ||
        exchangesData[tradeData.exchange]?.[tradeData.exchange] ||
        tradeData.exchange;

      await getCMP(tradeData.token, exch, tradeData.scriptname);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster />
      <KeyboardFormProvider order={FIELD_ORDER as unknown as string[]}>
      <AutoFocusFirst firstField="entryType" />
      <form
        method="POST"
        className="mx-auto max-w-8xl space-y-4"
        onSubmit={handleSubmit}
        autoComplete="off"
      >

        {/* Market Status Banner — shown when market is closed; intraday is disabled, forward trades are still allowed */}
        {tradeData.exchange && (tradeData.exchange === "NSE" || tradeData.exchange === "BSE" || tradeData.exchange === "MCX") && !marketStatus.isOpen && (
          <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Intraday trades unavailable — {marketStatus.message.replace("MARKET IS CLOSED", "market closed")}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Forward trades (1 Week, 1 Month, etc.) can still be created.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Trade Setup */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3">
            {/* Static layout — every field always rendered, disabled toggles
                interactivity. Predicates computed in `disabled` map above. */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              <EntryTypeInput
                onChange={setTradeData}
                value={tradeData.entryType}
                title={"Entry Type"}
                name={"entryType"}
                fieldId="entryType"
                disabled={disabled.entryType}
                required={required.entryType}
              />

              <ExchangeInput
                onChange={setTradeData}
                value={tradeData.exchange}
                title={"Exchange"}
                name={"exchange"}
                fieldId="exchange"
                disabled={disabled.exchange}
                required={required.exchange}
              />

              <SegmentInput
                onChange={setTradeData}
                value={tradeData.segment}
                title={"Segment"}
                name={"segment"}
                fieldId="segment"
                disabled={disabled.segment}
                required={required.segment}
              />

              <InstrumentInput
                onChange={setTradeData}
                value={tradeData.instrument}
                title={"Instrument"}
                name={"instrument"}
                exchange={tradeData.exchange}
                segment={tradeData.segment}
                fieldId="instrument"
                disabled={disabled.instrument}
                required={required.instrument}
              />

              <ScriptNameInput
                onChange={setTradeData}
                value={tradeData.symbol}
                title={"Symbol"}
                name={"symbol"}
                exchange={tradeData.exchange}
                segment={tradeData.segment}
                instrument={tradeData.instrument}
                fieldId="symbol"
                disabled={disabled.symbol}
                required={required.symbol}
              />

              <StrikeInput
                onChange={setTradeData}
                value={tradeData.strike}
                title={"Strike"}
                name={"strike"}
                symbol={tradeData.symbol}
                exchange={tradeData.exchange}
                segment={tradeData.segment}
                instrument={tradeData.instrument}
                fieldId="strike"
                disabled={disabled.strike}
                required={required.strike}
              />

              <OptionTypeInput
                onChange={setTradeData}
                value={tradeData.option}
                title={"CE/PE"}
                name={"option"}
                fieldId="option"
                disabled={disabled.option}
                required={required.option}
              />

              <ExpiryInputFnoInput
                onChange={setTradeData}
                value={tradeData.expiry}
                title={"Expiry"}
                name={"expiry"}
                exchange={tradeData.exchange}
                segment={tradeData.segment}
                instrument={tradeData.instrument}
                strike={tradeData.strike}
                symbol={tradeData.symbol}
                fieldId="expiry"
                disabled={disabled.expiry}
                required={required.expiry}
              />
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
          {/* Entry & Exit Parameters */}
          <div className="px-4 py-3 space-y-3">
            {/* Row 1: Script Info + Rate/Range Toggle + CMP Checkbox */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Script Info */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Script:</span>
                  <span className="text-md font-semibold text-gray-900 dark:text-gray-100">
                    {tradeData.scriptname || "--"}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">CMP:</span>
                  <span className="text-md font-semibold text-gray-900 dark:text-gray-100">
                    {tradeData.entryPrice > 0 ? `₹${tradeData.entryPrice.toLocaleString()}` : "--"}
                  </span>
                  {isFetchingCMP && <Loader2 className="w-3 h-3 animate-spin text-green-600" />}
                  {tradeData.entryPrice > 0 && (
                    <button
                      type="button"
                      onClick={handleRefreshCMP}
                      disabled={isFetchingCMP}
                      className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      {isFetchingCMP ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                {tradeData.lotsize && tradeData.segment !== "Equity" && (
                  <>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Lot:</span>
                      <span className="text-md font-semibold text-gray-900 dark:text-gray-100">{tradeData.lotsize}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

              {/* Rate/Range Toggle — keyboard: Left/Right cycles, Enter advances */}
              <RateRangeToggle
                value={tradeData.isRateRange}
                onChange={(v) => {
                  handleChange({
                    target: { name: "isRateRange", value: v, type: "radio" },
                  } as unknown as ChangeEvent<HTMLInputElement>);
                }}
              />

              {/* CMP Checkbox */}
              {tradeData.isRateRange === "rate" && (
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <div className="transition-colors">
                    {isCMPChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 group-hover:text-gray-500" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Use CMP as Entry</span>
                  <input type="checkbox" name="useCmp" checked={isCMPChecked} onChange={handleCMPChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Row 2: Price inputs — all rendered, `disabled` toggles which are active */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-28">
                <Input
                  title={"Entry Rate"}
                  type={"text"}
                  name={"rate"}
                  value={isCMPChecked ? tradeData.entryPrice : (rawValues["rate"] ?? (tradeData.rate || ""))}
                  onChange={handleChange}
                  paddingRight="pr-1"
                  disabled={disabled.rate}
                  required={required.rate}
                  fieldId="rate"
                />
              </div>
              <div className="w-28">
                <Input
                  title={"Lower Range"}
                  type={"text"}
                  name={"lowerRange"}
                  onChange={handleChange}
                  value={rawValues["lowerRange"] ?? (tradeData.lowerRange || "")}
                  paddingRight="pr-1"
                  disabled={disabled.lowerRange}
                  required={required.lowerRange}
                  fieldId="lowerRange"
                />
                {errors.lowerRange && <p className="text-red-500 text-[10px]">{errors.lowerRange}</p>}
              </div>
              <div className="w-28">
                <Input
                  title={"Upper Range"}
                  type={"text"}
                  name={"upperRange"}
                  onChange={handleChange}
                  value={rawValues["upperRange"] ?? (tradeData.upperRange || "")}
                  paddingRight="pr-1"
                  disabled={disabled.upperRange}
                  required={required.upperRange}
                  fieldId="upperRange"
                />
                {errors.upperRange && <p className="text-red-500 text-[10px]">{errors.upperRange}</p>}
              </div>

              {/* Stop Loss */}
              <div className="w-28">
                <Input
                  title={"Stop Loss"}
                  type={"text"}
                  name={"stoploss"}
                  onChange={handleChange}
                  value={rawValues["stoploss"] ?? (tradeData.stoploss || "")}
                  paddingRight="pr-1"
                  required={required.stoploss}
                  fieldId="stoploss"
                />
                {errors.stoploss && <p className="text-red-500 text-[10px]">{errors.stoploss}</p>}
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

              {/* Targets — three always-editable slots. Only Target 1 is
                  required; Target 2 and Target 3 are optional and get filtered
                  out of the submit payload if left empty. */}
              {[0, 1, 2].map((index) => {
                const t = tradeData.targets[index];
                return (
                  <div key={index} className="w-28">
                    <Input
                      title={`Target ${index + 1}`}
                      type="text"
                      name="Target Index"
                      value={
                        rawValues[`target_${index}_price`] ??
                        (t?.price || "")
                      }
                      paddingRight="pr-1"
                      onChange={(e) => updateTarget(index, "price", e.target.value)}
                      required={required[`target_${index}`]}
                      fieldId={`target_${index}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Validation errors */}
            {errors.target && (
              <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.target}</p>
            )}
            {errors.targetOrder && (
              <p className="text-red-500 dark:text-red-400 text-xs font-medium">{errors.targetOrder}</p>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
          {/* Trade Configuration */}
          <div className="px-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Validity */}
              <div className="relative" ref={validityDropdownRef}>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Validity
                  {required.validity && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </label>
                <ValidityButton
                  isOpen={isValidityDropdownOpen}
                  setIsOpen={setIsValidityDropdownOpen}
                  value={validityOption}
                />
                {isValidityDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {[
                      { value: "intraday", label: "Intraday", days: 0 },
                      { value: "btst", label: "BTST", days: 1 },
                      { value: "1week", label: "1 Week", days: 7 },
                      { value: "1month", label: "1 Month", days: 30 },
                      { value: "3months", label: "3 Months", days: 90 },
                      { value: "6months", label: "6 Months", days: 180 },
                      { value: "1year", label: "1 Year", days: 365 },
                      { value: "custom", label: "Custom Date", days: -1 },
                    ].map((opt) => {
                      const isIntradayDisabled = opt.value === "intraday" && !marketStatus.isOpen;
                      // For preset options, project the validity date and
                      // disable any preset that would land past the contract
                      // expiry. Custom and Intraday are exempt.
                      let isExpiryDisabled = false;
                      if (
                        expiryDate &&
                        opt.value !== "custom" &&
                        opt.value !== "intraday"
                      ) {
                        const projected = new Date();
                        projected.setDate(projected.getDate() + opt.days);
                        isExpiryDisabled = projected > expiryDate;
                      }
                      const isDisabled = isIntradayDisabled || isExpiryDisabled;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            if (isDisabled) return;
                            setValidityOption(opt.value);
                            setIsValidityDropdownOpen(false);
                            if (opt.value === "intraday") {
                              setIsCustomDate(false);
                              setTradeData(prev => ({
                                ...prev,
                                isIntraday: "intraday",
                                validity: getTodayDateString(),
                              }));
                            } else if (opt.value === "btst") {
                              // BTST = Buy Today Sell Tomorrow → validity is the
                              // next working day (skips weekends). Stored with
                              // its own holdingPeriod so it's labelled distinctly.
                              setIsCustomDate(false);
                              setTradeData(prev => ({
                                ...prev,
                                isIntraday: "btst",
                                validity: getNextWorkingDay(),
                              }));
                            } else if (opt.value === "custom") {
                              setIsCustomDate(true);
                              const nextWeekday = getNextWeekday();
                              setTradeData(prev => ({
                                ...prev,
                                isIntraday: "forward",
                                validity: nextWeekday,
                              }));
                            } else {
                              setIsCustomDate(false);
                              setTradeData(prev => ({ ...prev, isIntraday: "forward" }));
                              handleDropdownChange(opt.value);
                            }
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 text-sm ${isDisabled ? "opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500" : `cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 ${validityOption === opt.value ? "bg-blue-50 dark:bg-blue-900/30 font-medium" : ""}`}`}
                        >
                          <span>{opt.label}</span>
                          {isIntradayDisabled && <span className="text-[10px] text-red-400">market closed</span>}
                          {!isIntradayDisabled && isExpiryDisabled && <span className="text-[10px] text-red-400">past expiry</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCustomDate && (
                  <div className="pt-1">
                    <Input
                      title="Custom Date"
                      type="date"
                      name="validity"
                      onChange={handleChange}
                      value={tradeData.validity || ""}
                      min={getNextWeekday()}
                      max={expiryMaxStr ?? undefined}
                      required={required.validityCustom}
                      fieldId="validityCustom"
                    />
                    {tradeData.validity && !isWeekday(tradeData.validity) && (
                      <p className="text-red-500 text-xs mt-1">
                        Saturday is not allowed
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Share with Plans */}
              <div className="">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Share with Plans
                </label>
                <PlansListSelect
                  key={plansListKey}
                  onChange={setShareWithPlans}
                  id={session.data?.user.id!}
                />
              </div>

              {/* Marketplaces */}
              <div className="">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Select Marketplaces
                </label>
                <MarketPlaceSelect key={plansListKey} onChange={setShareWithMarketplaces} />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
          {/* Additional Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notes */}
              <div className="">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trade Notes
                </label>
                <textarea
                  name="notes"
                  value={tradeData.notes}
                  onChange={(e) => setTradeData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes or rationale for this trade..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={1}
                />
              </div>

              {/* PDF */}
              <div className="space-y-4">

                {/* PDF Upload */}
                <div className="">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Recommendation File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={recommendationPDFChangeHandler}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all"
                    >
                      {tradeData.recommendationPDF ? (
                        <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <FileText className="w-4 h-4" />
                          {tradeData.recommendationPDF.name}
                        </span>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload file (PDF, Image, Doc - max 5MB)
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Risk-Reward Analysis */}
          {tradeData.targets?.[0]?.price !== 0 &&
            ((tradeData.isRateRange === "rate" &&
              (tradeData.rate !== 0 || tradeData.entryPrice !== 0)) ||
              (tradeData.isRateRange === "range" &&
                tradeData.upperRange !== 0 &&
                tradeData.lowerRange !== 0)) && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                    R:R
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Ratio</span>
                    <span className="font-semibold">
                      {calculateRatio(
                        tradeData.targets[0].price,
                        tradeData.isRateRange === "rate"
                          ? isCMPChecked
                            ? tradeData.entryPrice
                            : tradeData.rate || tradeData.entryPrice
                          : tradeData.entryType === "buy"
                            ? tradeData.upperRange || tradeData.entryPrice
                            : tradeData.lowerRange || tradeData.entryPrice,
                        tradeData.stoploss,
                        tradeData.entryType.toLowerCase()
                      )}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Risk</span>
                    <span className="font-semibold">
                      {riskRewardNumbers.risk.toLocaleString()}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Reward</span>
                    <span className="font-semibold">
                      {riskRewardNumbers.reward.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-auto">
                    {tradeData.targets.length > 1
                      ? "Based on Target 1"
                      : null}
                    {tradeData.isRateRange === "range" && (
                      <>
                        {tradeData.targets.length > 1 ? " · " : ""}
                        Using {tradeData.entryType === "buy" ? "upper" : "lower"} range
                      </>
                    )}
                  </span>
                </div>
              </>
            )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
          <div className="flex justify-between items-center px-4 py-4">
            <button
              type="button"
              onClick={resetForm}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium bg-gray-200 hover:bg-gray-500 dark:hover:bg-gray-800 transition-all ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Form
            </button>

            <button
              type="submit"
              disabled={isLoading || !!(errors.target || errors.stoploss || errors.upperRange || errors.lowerRange || errors.targetOrder) || !!(tradeData.isIntraday === "intraday" && !marketStatus.isOpen)}
              className={`flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all ${isLoading || (errors.target || errors.stoploss || errors.upperRange || errors.lowerRange || errors.targetOrder) || (tradeData.isIntraday === "intraday" && !marketStatus.isOpen) ? "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400" : ""}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Create Trade
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </KeyboardFormProvider>

      {/* Quick Message broadcast — sits inline below the create-recommendation
          form so the RA can send a companion note to subscribers' Telegram
          channels right after posting a trade. */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <QuickMessageBroadcast />
      </div>
    </div>
  );
}

/**
 * Rate/Range segmented toggle. Registered with the surrounding KeyboardFormProvider
 * under fieldId="isRateRange". Left/Right arrows cycle the option (commits live);
 * Enter or Tab advances to the next field.
 */
function RateRangeToggle({
  value,
  onChange,
}: {
  value: "rate" | "range" | string;
  onChange: (next: "rate" | "range") => void;
}) {
  const { ref, onKeyDown } = useKeyboardField("isRateRange", {
    type: "horizontal",
    onPrev: () => onChange(value === "rate" ? "range" : "rate"),
    onNext: () => onChange(value === "rate" ? "range" : "rate"),
  });

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      tabIndex={0}
      role="radiogroup"
      aria-label="Entry mode"
      onKeyDown={onKeyDown}
      className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md px-1"
    >
      <button
        type="button"
        onClick={() => onChange("rate")}
        className="flex items-center gap-1.5 cursor-pointer group"
        tabIndex={-1}
      >
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            value === "rate"
              ? "border-blue-500 bg-blue-500 shadow-sm shadow-blue-500/30"
              : "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"
          }`}
        >
          {value === "rate" && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Rate
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange("range")}
        className="flex items-center gap-1.5 cursor-pointer group"
        tabIndex={-1}
      >
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            value === "range"
              ? "border-blue-500 bg-blue-500 shadow-sm shadow-blue-500/30"
              : "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"
          }`}
        >
          {value === "range" && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Range
        </span>
      </button>
    </div>
  );
}

/**
 * The validity dropdown's trigger button. Registered under fieldId="validity"
 * so Tab / Enter from the previous field land here. Enter on closed → opens
 * the dropdown. Enter on open → no-op (option list is mouse-driven for the
 * actual selection in v1; pressing Esc closes it).
 */
function ValidityButton({
  isOpen,
  setIsOpen,
  value,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: string;
}) {
  const { ref } = useKeyboardField("validity", {
    type: "dropdown",
    enterHandledByHost: true,
    onEscape: () => setIsOpen(false),
  });
  const { focusNext } = useKeyboardForm();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        // Close + advance — let the user click an option with mouse, or
        // press Esc to dismiss without choosing.
        setIsOpen(false);
        focusNext("validity");
      }
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const label =
    ({
      intraday: "Intraday",
      btst: "BTST",
      "1week": "1 Week",
      "1month": "1 Month",
      "3months": "3 Months",
      "6months": "6 Months",
      "1year": "1 Year",
      custom: "Custom Date",
    } as Record<string, string>)[value] || "Select";

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      onKeyDown={handleKeyDown}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-all flex items-center justify-between gap-1 focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <span>{label}</span>
      <ChevronDown
        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

/**
 * Auto-focuses the first field in the keyboard-form order on mount.
 * Place inside the KeyboardFormProvider as a sibling to the form.
 */
function AutoFocusFirst({ firstField }: { firstField: string }) {
  const { focusField } = useKeyboardForm();
  useEffect(() => {
    // Wait one tick so all field refs have registered.
    const id = window.setTimeout(() => focusField(firstField), 0);
    return () => window.clearTimeout(id);
  }, [firstField, focusField]);
  return null;
}