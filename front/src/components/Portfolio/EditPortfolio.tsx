"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { indices } from "@/lib/idices";
import { useCallback } from "react";
import { Loader2, AlertTriangle, ArrowLeftIcon, Info, Plus, X, IndianRupee } from "lucide-react";
import { feeValidityToDays } from "@/lib/portfolioPricing";
import { useToast } from "../ui/use-toast";
// import { useParams, useNavigate } from "@tanstack/react-router";
import { fetchCMP } from "@/lib/cmp";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Add this import at the top with other imports
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "../ui/toaster";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import PictureIcon from "@/icons/PictureIcon";

// Define the asset type
interface Asset {
    slNo: number;
    exchangeType: string;
    segmentType: string;
    scriptName: {
        exchange: string;
        token: string;
        name: string;
    };
    cmp: number | null;
    quantity: number | null;
    weightage: number | null;
    value: number | null;
    target?: number | null;
    profitLoss: number | null;
    profitLossPercentage: number | null;
    currentValue: number | null;
    initialValue: number | null;
    currentCMP: number | null;
    buyRate: number | null;
}

// Define the closed position type
interface ClosedPosition {
    slNo: number;
    exchangeType: string;
    segmentType: string;
    scriptName: {
        exchange: string;
        token: string;
        name: string;
    };
    cmp: number | null;
    quantity: number | null;
    weightage: number | null;
    value: number | null;
    investedValue: number | null;
    profitLoss: number | null;
    profitLossPercentage: number | null;
    closedAt: string;
    remarks?: string;
}

// Define the portfolio data type
interface PortfolioData {
    portfolioName: string;
    theme: string;
    methodology: string;
    rationale: string;
    disclosure: string;
    benchmarkIndex: string;
    investmentHorizon: number;
    reviewFrequency: number;
    minInvestmentAmount: number;
    riskLevel: number;
    pricingPlans?: { validity: number; price: number }[]; // validity in days
    fees?: number;
    feeValidity?: string; // legacy back-compat mirror, e.g. "12 months"
    scripts: Asset[];
    closedPositions?: ClosedPosition[];
    riskMetrics?: {
        standardDeviation?: string;
        sharpeRatio?: string;
        maximumDrawdown?: string;
    };
    shareWithMarketplaces?: string[];
    _id: string;
    bannerImageURL?: string;
}

// Hardcoded dropdown data. Segment is fixed to Equity (the only supported
// segment today) — the asset row goes straight from Exchange to Script.
const EXCHANGES = ["NSE", "BSE"];

// Updated asset schema with validation
const assetSchema = z
    .object({
        slNo: z.number(),
        exchangeType: z.string().min(1, "Exchange is required"),
        segmentType: z.string().min(1, "Segment is required"),
        scriptName: z.object({
            exchange: z.string().min(1, "Exchange is required"),
            token: z.string().min(1, "Token is required"),
            name: z.string().min(1, "Name is required"),
        }),
        cmp: z.number().nullable(),
        quantity: z.coerce.number().nullable(),
        weightage: z.coerce.number().nullable(),
        value: z.coerce.number().nullable(),
        profitLoss: z.coerce.number().nullable(),
        profitLossPercentage: z.coerce.number().nullable(),
        currentValue: z.coerce.number().nullable(),
        initialValue: z.coerce.number().nullable(),
        currentCMP: z.coerce.number().nullable(),
        buyRate: z.coerce.number().nullable(),
        target: z.coerce.number().nullable().optional(),
    })
    .refine((data) => data.quantity !== null || data.weightage !== null, {
        message: "Enter QTY or Weightage",
        path: ["quantity"],
    });

const formSchema = z.object({
    portfolioName: z.string().min(2, {
        message: "Portfolio name must be at least 2 characters.",
    }),
    theme: z.string().min(2, {
        message: "Theme must be at least 2 characters.",
    }),
    methodology: z.string().min(10, {
        message: "Methodology must be at least 10 characters.",
    }),
    rationale: z.string().min(10, {
        message: "Rationale must be at least 10 characters.",
    }),
    disclosure: z.string().min(10, {
        message: "Disclosure must be at least 10 characters.",
    }),
    benchmarkIndex: z.string().min(1, {
        message: "Benchmark index is required.",
    }),
    investmentHorizon: z.coerce.number().min(1, {
        message: "Investment horizon must be at least 1 month.",
    }),
    reviewFrequency: z.coerce.number().min(1, {
        message: "Review frequency must be at least 1 month.",
    }),
    minInvestmentAmount: z.coerce.number().min(0, {
        message: "Minimum investment amount must be positive.",
    }),
    shareWithMarketplaces: z.array(z.string()).optional(),
    riskLevel: z.coerce
        .number()
        .min(1, { message: "Risk level must be at least 1%." })
        .max(100, { message: "Risk level cannot exceed 100%." }),
    pricingPlans: z
        .array(
            z.object({
                validity: z.coerce
                    .number()
                    .int({ message: "Validity must be a whole number of days." })
                    .min(1, { message: "Validity must be at least 1 day." })
                    .max(365, { message: "Validity cannot exceed 365 days." }),
                price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
            }),
        )
        .min(1, { message: "At least one pricing plan is required." })
        .max(5, { message: "You can add up to 5 pricing plans." }),
    riskMetrics: z.object({
        standardDeviation: z.string().optional(),
        sharpeRatio: z.string().optional(),
        maximumDrawdown: z.string().optional(),
    }),
    assets: z
        .array(assetSchema)
        .min(1, { message: "At least one asset is required." })
        .superRefine((assets, ctx) => {
            // @ts-expect-error Accessing parent form data in Zod superRefine context
            const minInvestmentAmount = ctx?.options?.data?.minInvestmentAmount;
            if (typeof minInvestmentAmount !== "number") return;
            // Check if any asset value exceeds minInvestmentAmount
            assets.forEach((a, i) => {
                if ((a.value ?? 0) > minInvestmentAmount) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Asset value cannot exceed minimum investment amount",
                        path: [i, "value"],
                    });
                }
            });
            // Check if total value exceeds minInvestmentAmount
            const total = assets.reduce((sum, a) => sum + (a.value ?? 0), 0);
            if (total > minInvestmentAmount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Total value of all assets cannot exceed minimum investment amount",
                    path: ["value"],
                });
            }
        }),
});

const EditPortfolio = ({ data }: { data: PortfolioData }) => {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [editMode, setEditMode] = useState<"rebalancing" | "modify">("rebalancing");
    const [scriptToDelete, setScriptToDelete] = useState<{ index: number; name: string; value: number } | null>(null);
    const [reducingScript, setReducingScript] = useState<number | null>(null);
    const [originalQuantities, setOriginalQuantities] = useState<{ [key: number]: number }>({});
    const [originalWeightages, setOriginalWeightages] = useState<{ [key: number]: number }>({});
    const [previousQuantities, setPreviousQuantities] = useState<{ [key: number]: number }>({});
    const [previousWeightages, setPreviousWeightages] = useState<{ [key: number]: number }>({});
    const [newlyAddedRows, setNewlyAddedRows] = useState<Set<number>>(new Set());
    const [fetchingCMP, setFetchingCMP] = useState(false);
    const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>(data.closedPositions || []);
    const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(data.shareWithMarketplaces || []);
    // const { portfolioId: id } = useParams({ from: "/edit/$portfolioId" });
    // const navigate = useNavigate();
    const [remarksDialog, setRemarksDialog] = useState<{ open: boolean; idx: number | null; value: string }>({
        open: false,
        idx: null,
        value: "",
    });
    const [openScriptActionOpen, setOpenScriptActionOpen] = useState<number | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerRemoved, setBannerRemoved] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Debug useEffect to monitor closedPositions changes
    useEffect(() => {
        console.log("CLOSED POSITIONS CHANGED:", closedPositions);
    }, [closedPositions]);

    // Initialize the form with the provided data
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            portfolioName: data.portfolioName,
            theme: data.theme,
            methodology: data.methodology,
            rationale: data.rationale || "",
            disclosure: data.disclosure || "",
            benchmarkIndex: data.benchmarkIndex,
            investmentHorizon: data.investmentHorizon,
            reviewFrequency: data.reviewFrequency,
            minInvestmentAmount: data.minInvestmentAmount,
            riskLevel: data.riskLevel || 1,
            
            pricingPlans:
                Array.isArray(data.pricingPlans) && data.pricingPlans.length > 0
                    ? data.pricingPlans.map((p) => ({
                          validity: Number(p.validity) || 0,
                          price: Number(p.price) || 0,
                      }))
                    : [
                          {
                              validity: feeValidityToDays(data.feeValidity) || 30,
                              price: data.fees || 0,
                          },
                      ],
            riskMetrics: {
                standardDeviation: data.riskMetrics?.standardDeviation || "",
                sharpeRatio: data.riskMetrics?.sharpeRatio || "",
                maximumDrawdown: data.riskMetrics?.maximumDrawdown || "",
            },
             shareWithMarketplaces: data.shareWithMarketplaces || [],
            assets:
                data.scripts?.map((asset, index) => ({
                    ...asset,
                    slNo: index + 1,
                })) || [],
        },
        
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "assets",
    });
    const {
        fields: pricingFields,
        append: appendPricing,
        remove: removePricing,
    } = useFieldArray({
        control: form.control,
        name: "pricingPlans",
    });

    // Calculation logic for asset values
    const minInvestmentAmount = form.watch("minInvestmentAmount") ?? 0;
    const assets = form.watch("assets");
    let totalInitialValue = 0;
    const calculatedAssets = assets.map((asset) => {
        const cmp = asset.cmp ?? null; // original entry price
        const currentCMP = asset.currentCMP ?? cmp; // live price for display
        const effectiveBuyRate = asset.buyRate ?? cmp ?? 0;
        let quantity = asset.quantity ?? null;
        let weightage = asset.weightage ?? null;
        let value: number | null = null;
        let initialValue = asset.initialValue ?? null;

        // For new scripts (no initialValue), calculate based on min investment amount
        // New scripts use cmp (entry price) since they're being added now
        if (!initialValue) {
            if (quantity && cmp) {
                value = quantity * cmp;
                const availableBalance = minInvestmentAmount - totalInitialValue;
                if (value > availableBalance) {
                    value = availableBalance;
                    quantity = Math.round(value / cmp);
                }
                weightage = Math.round((value / minInvestmentAmount) * 100);
                initialValue = value;
            } else if (weightage && cmp) {
                const availableBalance = minInvestmentAmount - totalInitialValue;
                value = Math.min((minInvestmentAmount * weightage) / 100, availableBalance);
                quantity = Math.round(value / cmp);
                initialValue = value;
            }
        } else {
            // For existing scripts, recalculate invested value using buyRate
            if (quantity && currentCMP) {
                value = quantity * currentCMP; // current value uses live price
                weightage = Math.floor((value / minInvestmentAmount) * 100);
                initialValue = quantity * (asset.buyRate ?? cmp ?? 0); // invested uses entry price
            } else if (weightage && currentCMP) {
                value = (minInvestmentAmount * weightage) / 100;
                quantity = Math.round(value / currentCMP);
                initialValue = quantity * (asset.buyRate ?? cmp ?? 0);
            }
        }

        // Calculate P&L for existing scripts
        let profitLoss: number | null = 0;
        let profitLossPercentage: number | null = 0;
        if (currentCMP && quantity && initialValue) {
            const currentValue = currentCMP * quantity;
            profitLoss = currentValue - initialValue;
            profitLossPercentage = initialValue !== 0 ? (profitLoss / initialValue) * 100 : 0;
        }

        totalInitialValue += initialValue || 0;
        return { ...asset, cmp, quantity, weightage, value, initialValue, buyRate: effectiveBuyRate, profitLoss, profitLossPercentage };
    });
    const cashValue = Math.max(minInvestmentAmount - totalInitialValue, 0);
    const totalQty = calculatedAssets.reduce((s, a) => s + (a.quantity ?? 0), 0);
    const totalWeightage = calculatedAssets.reduce((s, a) => s + (a.weightage ?? 0), 0);
    const totalValue = calculatedAssets.reduce((s, a) => s + (a.value ?? 0), 0);
    const totalTarget = calculatedAssets.reduce((s, a) => s + (a.target ?? 0), 0);
    const totalProfitLoss = calculatedAssets.reduce((s, a) => s + (a.profitLoss ?? 0), 0);

    // Calculate P&L for existing scripts
    const calculatePnL = (asset: Asset) => {
        if (!asset.currentCMP || !asset.quantity || !asset.initialValue) return { profitLoss: 0, profitLossPercentage: 0 };

        const currentValue = asset.currentCMP * asset.quantity;
        console.log("CURRENT VALUE", currentValue);
        console.log("ASSET INITIAL VALUE", asset.initialValue);
        const profitLoss = currentValue - asset.initialValue;
        const profitLossPercentage = (profitLoss / asset.initialValue) * 100;

        return { profitLoss, profitLossPercentage };
    };

    // Add to closed positions when quantity is reduced
    const addToClosedPositions = (asset: Asset, reducedQuantity: number, originalQuantity: number) => {
        // Use currentCMP if available, otherwise fall back to cmp
        const currentCMP = asset.currentCMP || asset.cmp;
        const buyRate = asset.buyRate || currentCMP;

        console.log("ADDING TO CLOSED POSITIONS:", {
            scriptName: asset.scriptName?.name,
            reducedQuantity,
            originalQuantity,
            currentCMP,
            buyRate,
            asset,
        });

        if (!currentCMP || !buyRate) {
            console.error("Missing CMP or buy rate for asset:", asset);
            return;
        }

        // Check if there's already a closed position for this script
        const existingPositionIndex = closedPositions.findIndex(
            (pos) => pos.scriptName.token === asset.scriptName.token && pos.scriptName.exchange === asset.scriptName.exchange
        );

        console.log("EXISTING POSITION INDEX:", existingPositionIndex);
        console.log("CURRENT CLOSED POSITIONS:", closedPositions);

        if (existingPositionIndex !== -1) {
            // Update existing position by adding to it
            const existingPosition = closedPositions[existingPositionIndex];
            console.log("EXISTING POSITION", existingPosition);
            console.log("REDUCED QUANTITY", reducedQuantity);
            console.log("ORIGINAL QUANTITY", originalQuantity);
            console.log("ASSET", asset);

            // Add the reduced quantity to existing closed position
            const newQuantity = (existingPosition.quantity || 0) + reducedQuantity;

            // Calculate proportional values for the reduced quantity
            const reducedValue = currentCMP * reducedQuantity;
            const reducedInvestedValue = buyRate * reducedQuantity;
            const reducedProfitLoss = reducedValue - reducedInvestedValue;

            // Add the reduced values to existing closed position
            const newValue = (existingPosition.value || 0) + reducedValue;
            const newInvestedValue = (existingPosition.investedValue || 0) + reducedInvestedValue;
            const newProfitLoss = (existingPosition.profitLoss || 0) + reducedProfitLoss;
            const newWeightage = Math.floor((newInvestedValue / minInvestmentAmount) * 100);

            console.log("UPDATING EXISTING POSITION:", {
                oldQuantity: existingPosition.quantity,
                newQuantity,
                oldValue: existingPosition.value,
                newValue,
                oldInvestedValue: existingPosition.investedValue,
                newInvestedValue,
            });

            setClosedPositions((prev) => {
                const newPositions = [...prev];
                newPositions[existingPositionIndex] = {
                    ...existingPosition,
                    quantity: newQuantity,
                    weightage: newWeightage,
                    value: newValue,
                    investedValue: newInvestedValue,
                    profitLoss: newProfitLoss,
                    profitLossPercentage: (newProfitLoss / newInvestedValue) * 100,
                    closedAt: new Date().toISOString(),
                };
                console.log("UPDATED CLOSED POSITIONS:", newPositions);
                return newPositions;
            });
        } else {
            // Create new position
            console.log("CREATING NEW CLOSED POSITION:", {
                scriptName: asset.scriptName?.name,
                reducedQuantity,
                originalQuantity,
            });

            const value = currentCMP * reducedQuantity;
            const investedValue = buyRate * reducedQuantity;
            const profitLoss = value - investedValue;
            const profitLossPercentage = (profitLoss / investedValue) * 100;
            const newWeightage = Math.floor((investedValue / minInvestmentAmount) * 100);

            const closedPosition: ClosedPosition = {
                slNo: closedPositions.length + 1,
                exchangeType: asset.exchangeType,
                segmentType: asset.segmentType,
                scriptName: asset.scriptName,
                cmp: currentCMP,
                quantity: reducedQuantity,
                weightage: newWeightage,
                value: value,
                investedValue: investedValue,
                profitLoss: profitLoss,
                profitLossPercentage: profitLossPercentage,
                closedAt: new Date().toISOString(),
            };

            console.log("NEW CLOSED POSITION:", closedPosition);

            setClosedPositions((prev) => {
                const newPositions = [...prev, closedPosition];
                console.log("ADDED NEW CLOSED POSITION:", newPositions);
                return newPositions;
            });
        }
    };

    // Remove from closed positions when quantity is increased back
    const removeFromClosedPositions = (asset: Asset, increasedQuantity: number) => {
        // Use currentCMP if available, otherwise fall back to cmp
        const currentCMP = asset.currentCMP || asset.cmp;
        const buyRate = asset.buyRate || currentCMP;

        if (!currentCMP || !buyRate) {
            console.error("Missing CMP or buy rate for asset:", asset);
            return;
        }

        // Check if there's a closed position for this script
        const existingPositionIndex = closedPositions.findIndex(
            (pos) => pos.scriptName.token === asset.scriptName.token && pos.scriptName.exchange === asset.scriptName.exchange
        );

        if (existingPositionIndex !== -1) {
            const existingPosition = closedPositions[existingPositionIndex];
            const currentClosedQuantity = existingPosition.quantity || 0;

            // If the increased quantity is greater than or equal to the closed quantity, remove the entire position
            if (increasedQuantity >= currentClosedQuantity) {
                setClosedPositions((prev) => prev.filter((_, index) => index !== existingPositionIndex));
            } else {
                // Reduce the closed position by the increased quantity
                const remainingQuantity = currentClosedQuantity - increasedQuantity;
                const remainingValue = currentCMP * remainingQuantity;
                const remainingInvestedValue = buyRate * remainingQuantity;
                const remainingProfitLoss = remainingValue - remainingInvestedValue;
                const remainingWeightage = Math.floor((remainingInvestedValue / minInvestmentAmount) * 100);

                setClosedPositions((prev) => {
                    const newPositions = [...prev];
                    newPositions[existingPositionIndex] = {
                        ...existingPosition,
                        quantity: remainingQuantity,
                        weightage: remainingWeightage,
                        value: remainingValue,
                        investedValue: remainingInvestedValue,
                        profitLoss: remainingProfitLoss,
                        profitLossPercentage: (remainingProfitLoss / remainingInvestedValue) * 100,
                        closedAt: new Date().toISOString(),
                    };
                    return newPositions;
                });
            }
        }
    };

    // Handle script deletion
    const handleRemoveScript = (index: number) => {
        const scriptToRemove = calculatedAssets[index];
        const scriptValue = scriptToRemove.value || 0;

        // Set the script to delete in state
        setScriptToDelete({
            index,
            name: scriptToRemove.scriptName.name,
            value: scriptValue,
        });
    };

    // Confirm script deletion
    const confirmDeleteScript = () => {
        if (!scriptToDelete) return;

        const { index, name, value } = scriptToDelete;

        // Remove the script
        remove(index);

        // Show toast with information about the removed script
        toast({
            title: "Script removed",
            description: `${name} (₹${value.toFixed(2)}) has been moved to uninvested balance.`,
        });

        // Reset the script to delete
        setScriptToDelete(null);
    };

    // Cancel script deletion
    const cancelDeleteScript = () => {
        setScriptToDelete(null);
    };

    // Handle script reduction
    const handleReduceScript = (index: number) => {
        if (reducingScript === index) {
            // If clicking reduce again, cancel reduction
            setReducingScript(null);
            setOriginalQuantities((prev) => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
            setOriginalWeightages((prev) => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
            setPreviousQuantities((prev) => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
            setPreviousWeightages((prev) => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
        } else {
            // Start reduction and store original values
            setReducingScript(index);
            const currentQuantity = calculatedAssets[index]?.quantity ?? 0;
            const currentWeightage = calculatedAssets[index]?.weightage ?? 0;
            setOriginalQuantities((prev) => ({ ...prev, [index]: currentQuantity }));
            setOriginalWeightages((prev) => ({ ...prev, [index]: currentWeightage }));
            setPreviousQuantities((prev) => ({ ...prev, [index]: currentQuantity }));
            setPreviousWeightages((prev) => ({ ...prev, [index]: currentWeightage }));
        }
    };

    // Form submission handler
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const assetsWithNullBuyRates = calculatedAssets.filter(asset =>
                asset.buyRate === null && asset.cmp !== null
            );

            if (assetsWithNullBuyRates.length > 0) {
                toast({
                    title: "Missing buy rates",
                    description: `Some assets have missing buy rates. Please refresh the page and try adding scripts again.`,
                    variant: "default",
                });
                setIsLoading(false);
                return;
            }
            // Calculate total initial value of all scripts
            const totalInitialValue = calculatedAssets.reduce((sum, asset) => sum + (asset.initialValue || 0), 0);

            // Check if total initial value exceeds min investment amount
            if (totalInitialValue > values.minInvestmentAmount) {
                toast({
                    title: "Invalid portfolio value",
                    description: "Total initial value of all scripts cannot exceed minimum investment amount",
                    variant: "default",
                });
                setIsLoading(false);
                return;
            }

            // Prepare the data to be sent to the backend
            const submitValues = {
                ...values,
                assets: calculatedAssets,
                closedPositions: closedPositions.length > 0 ? closedPositions : undefined,
            };

            console.log("SUBMIT VALUES", submitValues);

            const payload = {
                portfolioName: values.portfolioName,
                theme: values.theme,
                methodology: values.methodology,
                benchmarkIndex: values.benchmarkIndex,
                investmentHorizon: values.investmentHorizon,
                reviewFrequency: values.reviewFrequency,
                minInvestmentAmount: values.minInvestmentAmount,
                riskLevel: values.riskLevel,
                pricingPlans: values.pricingPlans,
                shareWithMarketplaces: shareWithMarketplaces,
                rationale: values.rationale,
                disclosure: values.disclosure,
                riskMetrics: {
                    standardDeviation: values.riskMetrics.standardDeviation,
                    sharpeRatio: values.riskMetrics.sharpeRatio,
                    maximumDrawdown: values.riskMetrics.maximumDrawdown,
                },
                scripts: calculatedAssets.map((asset) => ({
                    slNo: asset.slNo,
                    exchangeType: asset.exchangeType,
                    segmentType: asset.segmentType,
                    scriptName: asset.scriptName,
                    cmp: asset.currentCMP ?? asset.cmp ?? 0,
                    buyRate: asset.buyRate ?? asset.cmp ?? 0,
                    quantity: asset.quantity,
                    weightage: asset.weightage,
                    value: asset.value,
                    target: asset.target ?? null,
                })),
                closedPositions:
                    closedPositions.length > 0
                        ? closedPositions?.map((item) => ({
                            exchangeType: item.exchangeType,
                            segmentType: item.segmentType,
                            scriptName: item.scriptName,
                            cmp: item.cmp ?? 0,
                            buyRate: item.cmp ?? 0,
                            quantity: item.quantity,
                            weightage: item.weightage,
                            value: item.value,
                            investedValue: item.investedValue,
                            profitLoss: item.profitLoss,
                            profitLossPercentage: item.profitLossPercentage,
                            closedAt: item.closedAt,
                            remarks: item.remarks,
                        }))
                        : undefined,
                ...(bannerRemoved && !bannerFile ? { bannerURL: "" } : {}),
            };

            // Make API call to update portfolio (FormData if new banner, else JSON)
            let response: Response;
            if (bannerFile) {
                const formData = new FormData();
                formData.append("data", JSON.stringify(payload));
                formData.append("bannerImage", bannerFile);
                response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/update-portfolio?id=${data._id}`, {
                    method: "POST",
                    body: formData,
                });
            } else {
                response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/update-portfolio?id=${data._id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update portfolio");
            }

            const { data: portfolio } = await response.json();
            console.log("PORTFOLIO", portfolio);

            // Show success message
            toast({
                title: "Portfolio updated successfully",
                description: "Your portfolio has been updated successfully.",
                variant: "default",
            });

            // Redirect to portfolio list or details page
            // navigate({ to: "/" });
        } catch (error: any) {
            console.error("Error updating portfolio:", error);
        
            let errorMessage = "An unexpected error occurred";
            
            // Check for validation error format
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.error) {
                errorMessage = error.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
        
            toast({
                title: "Validation Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }
    // Cache for script options fetched from API
    const [scriptOptionsCache, setScriptOptionsCache] = useState<Record<string, { label: string; value: string }[]>>({});

    const fetchScriptOptions = useCallback(async (exchSeg: string) => {
        if (scriptOptionsCache[exchSeg]) return;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/symbols?exch_seg=${exchSeg}`
            );
            const result = await res.json();
            const options = (result.data || []).map((name: string) => ({
                label: name,
                value: name,
            }));
            setScriptOptionsCache((prev) => ({ ...prev, [exchSeg]: options }));
        } catch {
            // ignore
        }
    }, [scriptOptionsCache]);

    // Fetch script options when any asset's exchange/segment changes
    useEffect(() => {
        const exchSegMap: Record<string, string> = {
            NSEEquity: "NSE", BSEEquity: "BSE",
            NSEFno: "NFO", BSEFno: "BFO",
            NSECurrency: "CDS", BSECurrency: "CDS",
        };
        assets.forEach((asset: any) => {
            const key = (asset.exchangeType || "") + (asset.segmentType || "");
            const exchSeg = exchSegMap[key];
            if (exchSeg && !scriptOptionsCache[exchSeg]) {
                fetchScriptOptions(exchSeg);
            }
        });
    }, [assets.map((a: any) => (a.exchangeType || "") + (a.segmentType || "")).join(",")]);

    const getScriptOptions = (exchangeType: string, segmentType: string) => {
        const exchSegMap: Record<string, string> = {
            NSEEquity: "NSE", BSEEquity: "BSE",
            NSEFno: "NFO", BSEFno: "BFO",
            NSECurrency: "CDS", BSECurrency: "CDS",
        };
        const exchSeg = exchSegMap[exchangeType + segmentType];
        if (exchSeg && scriptOptionsCache[exchSeg]) {
            return scriptOptionsCache[exchSeg];
        }
        return [{ label: "Select Script", value: "Select Script" }];
    };

    // console.log("CALCULATED ASSETS", calculatedAssets);
    // console.log("DATA", data);

    return ( 
        <>
            <Toaster />
            <div className="container mx-auto py-10">
                {/* <Link
                    // onClick={() => navigate({ to: "/portfolio/$portfolioId", params: { portfolioId: data?._id } })}
                    href="/dashboard/serviceprovider/portfolio/myportfolios"
                    className="mb-4 cursor-pointer flex gap-x-2"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back
                </Link> */}
                <Card className="bg-white text-black border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Edit Portfolio</CardTitle>
                        <div className="mt-4">
                            <RadioGroup
                                defaultValue="rebalancing"
                                onValueChange={(value: "rebalancing" | "modify") => setEditMode(value)}
                                className="flex gap-4"
                            >
                                <div className="flex items-center  space-x-2">
                                    <RadioGroupItem value="modify" id="modify" className="shadow-sm border-red-500 hover:scale-150 transition-all duration-300 bg-white text-black" />
                                    <label
                                        htmlFor="modify"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black"
                                    >
                                        Modify Portfolio Details
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="rebalancing" id="rebalancing" className="border-red-500 hover:scale-150 transition-all duration-300 bg-white text-black" />
                                    <label
                                        htmlFor="rebalancing"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black"
                                    >
                                        Rebalance Assets
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="portfolioName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Portfolio Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter portfolio name"
                                                        {...field}
                                                        className="bg-white border-gray-800"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="theme"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Theme</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter portfolio theme"
                                                        {...field}
                                                        className="bg-white border-gray-800"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Banner Image (optional edit) */}
                                    <FormItem className="col-span-2">
                                        <FormLabel>Banner Image</FormLabel>
                                        <FormControl>
                                            <div className="space-y-2">
                                                {(bannerPreview || (!bannerRemoved && (data as PortfolioData).bannerImageURL)) ? (
                                                    <div className="relative group inline-block w-full max-w-md">
                                                        <Image
                                                            src={bannerPreview || (data as PortfolioData).bannerImageURL || ""}
                                                            alt="Portfolio banner"
                                                            width={800}
                                                            height={300}
                                                            className="w-full h-48 object-cover rounded-md border-2 border-gray-300 group-hover:border-blue-500 transition-colors"
                                                            unoptimized
                                                        />
                                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                type="button"
                                                                variant="red"
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    setBannerPreview(null);
                                                                    setBannerFile(null);
                                                                    setBannerRemoved(true);
                                                                    if (bannerInputRef.current) bannerInputRef.current.value = "";
                                                                }}
                                                            >
                                                                Remove
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="green"
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() => bannerInputRef.current?.click()}
                                                            >
                                                                Change
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label
                                                        htmlFor="editBannerInput"
                                                        className="block cursor-pointer group"
                                                    >
                                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-blue-500 transition-all group-hover:bg-gray-50">
                                                            <PictureIcon className="w-12 h-12 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                                                            <p className="text-gray-600 group-hover:text-blue-500 transition-colors">
                                                                Click to upload banner image
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                                        </div>
                                                    </label>
                                                )}
                                                <input
                                                    id="editBannerInput"
                                                    ref={bannerInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setBannerFile(file);
                                                            setBannerPreview(URL.createObjectURL(file));
                                                            setBannerRemoved(false);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </FormControl>
                                    </FormItem>

{/* Add this section - Marketplace Selection */}
<div className="space-y-6 mb-8">
    <h3 className="text-lg font-semibold">Select Marketplaces</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
        Choose which marketplaces this portfolio should be visible on
    </p>
    
    <MarketPlaceSelect 
        onChange={setShareWithMarketplaces} 
        initialValues={shareWithMarketplaces} 
    />
    
    
</div>
                                    <FormField
                                        control={form.control}
                                        name="methodology"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Methodology</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe your investment methodology"
                                                        {...field}
                                                        className="bg-white border-gray-800 min-h-[100px]"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="benchmarkIndex"
                                        render={({ field }) => (
                                            <FormItem className="w-full">
                                                <FormLabel>Benchmark Index</FormLabel>
                                                <FormControl>
                                                    <SearchableSelect
                                                        options={indices.map((item) => ({
                                                            value: item.DispSym,
                                                            label: item.DispSym,
                                                            ...item,
                                                        }))}
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            console.log("Val", val);
                                                            field.onChange(val.value);
                                                        }}
                                                        placeholder="Select benchmark index"
                                                        searchPlaceholder="Search benchmark index..."
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="investmentHorizon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Investment Horizon (months)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Enter investment horizon"
                                                        {...field}
                                                        className="bg-white border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reviewFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Review Frequency (months)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Enter review frequency"
                                                        {...field}
                                                        className="bg-white border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="minInvestmentAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Minimum Investment Amount (₹)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Enter minimum investment amount"
                                                        {...field}
                                                        className="bg-white border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        disabled={editMode === "modify"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="riskLevel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Risk Level (%)</FormLabel>
                                                <FormControl>
                                                    <div className="flex flex-col gap-2">
                                                        <Slider
                                                            min={1}
                                                            max={100}
                                                            value={[field.value]}
                                                            onValueChange={([val]) => field.onChange(val)}
                                                            className="w-full"
                                                            disabled={editMode === "rebalancing"}
                                                        />
                                                        <div className="text-sm mt-1">{field.value}%</div>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="col-span-2 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <IndianRupee className="w-4 h-4 text-emerald-600" />
                                                <FormLabel>Pricing Plans</FormLabel>
                                                <span className="text-xs text-gray-400">• add up to 5 validity/price options</span>
                                            </div>
                                            {editMode !== "rebalancing" && pricingFields.length < 5 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="text-xs px-2.5 py-1 h-auto"
                                                    onClick={() => appendPricing({ validity: 30, price: 0 })}
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Plan
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                            {pricingFields.map((pf, idx) => (
                                                <div
                                                    key={pf.id}
                                                    className="relative p-3 border border-gray-200 rounded-xl bg-gray-50 hover:border-blue-300 transition"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                                                            Plan {idx + 1}
                                                        </span>
                                                        {editMode !== "rebalancing" && pricingFields.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removePricing(idx)}
                                                                className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <FormField
                                                            control={form.control}
                                                            name={`pricingPlans.${idx}.validity`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                                                        Validity (days)
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={365}
                                                                            placeholder="30"
                                                                            {...field}
                                                                            className="h-8 text-sm bg-white border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            disabled={editMode === "rebalancing"}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`pricingPlans.${idx}.price`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                                                        Price (₹)
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            placeholder="0"
                                                                            {...field}
                                                                            className="h-8 text-sm bg-white border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            disabled={editMode === "rebalancing"}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {form.formState.errors.pricingPlans?.root && (
                                            <p className="text-red-500 text-sm">
                                                {form.formState.errors.pricingPlans.root.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Risk Metrics Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="riskMetrics.standardDeviation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Standard Deviation</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter standard deviation"
                                                        {...field}
                                                        className="bg-white border-gray-800"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="riskMetrics.sharpeRatio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sharpe Ratio</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter sharpe ratio"
                                                        {...field}
                                                        className="bg-white border-gray-800"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="riskMetrics.maximumDrawdown"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Maximum Drawdown</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter maximum drawdown"
                                                        {...field}
                                                        className="bg-white border-gray-800"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Rationale and Disclosure Section */}
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="rationale"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rationale *</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Explain the rationale behind this portfolio"
                                                        {...field}
                                                        className="bg-white border-gray-800 h-[200px] overflow-y-auto resize-none"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="disclosure"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Disclosure *</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Add any important disclosures about this portfolio"
                                                        {...field}
                                                        className="bg-white border-gray-800 h-[200px] overflow-y-auto resize-none"
                                                        disabled={editMode === "rebalancing"}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Asset List Section */}
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold mb-2">Assets</h3>
                                    {editMode === "modify" && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                                            <p className="text-yellow-500 text-sm">
                                                In Modify mode, you cannot edit the assets table. Switch to Rebalancing mode to modify assets.
                                            </p>
                                        </div>
                                    )}
                                    {editMode === "rebalancing" && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                                            <p className="text-blue-500 text-sm">
                                                In Rebalancing mode, you can only modify the assets table and minimum investment amount.
                                            </p>
                                        </div>
                                    )}
                                    {/* Table-level error for asset value/total value */}
                                    {form.formState.errors.assets?.root && (
                                        <div className="text-red-500 text-sm mb-2">{form.formState.errors.assets.root.message}</div>
                                    )}
                                    {form.formState.errors.assets &&
                                        Array.isArray(form.formState.errors.assets) &&
                                        form.formState.errors.assets.map((err, idx) =>
                                            err?.value ? (
                                                <div key={idx} className="text-red-500 text-sm mb-2">
                                                    {err.value.message}
                                                </div>
                                            ) : null
                                        )}
                                    <div className={`overflow-x-auto ${editMode === "modify" ? "opacity-50 pointer-events-none" : ""}`}>
                                        <table className="min-w-full text-sm text-left border border-gray-800 bg-white rounded-lg">
                                            <thead className="bg-white rounded-lg">
                                                <tr>
                                                    <th className="px-2 py-1">Sl No</th>
                                                    <th className="px-2 py-1">Exchange</th>
                                                    <th className="px-2 py-1">Script Name</th>
                                                    <th className="px-2 py-1">CMP</th>
                                                    <th className="px-2 py-1">Buy Rate</th>
                                                    <th className="px-2 py-1">QTY</th>
                                                    <th className="px-2 py-1">Weightage (%)</th>
                                                    <th className="px-2 py-1">Value</th>
                                                    <th className="px-2 py-1">Target <span className="text-gray-400 font-normal">(optional)</span></th>
                                                    <th className="px-2 py-1">Invested Amount</th>
                                                    <th className="px-2 py-1">P&L</th>
                                                    <th className="px-2 py-1 text-right w-12">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                                {fields.map((field, idx) => (
                                                    <tr key={field.id} className="bg-white">
                                                        <td className="px-2 py-1">{idx + 1}</td>
                                                        {/* Exchange Type */}
                                                        <td className="px-2 py-1">
                                                            <FormField
                                                                control={form.control}
                                                                name={`assets.${idx}.exchangeType`}
                                                                render={({ field: exField }) => (
                                                                    <>
                                                                        <Select
                                                                            disabled={!newlyAddedRows.has(idx)}
                                                                            onValueChange={exField.onChange}
                                                                            value={exField.value}
                                                                        >
                                                                            <FormControl>
                                                                                <SelectTrigger
                                                                                    className={`bg-white ${!newlyAddedRows.has(idx) ? "cursor-not-allowed" : ""} w-full border-gray-800`}
                                                                                >
                                                                                    <SelectValue placeholder="Select exchange" />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className="bg-white text-black">
                                                                                {EXCHANGES.map((ex) => (
                                                                                    <SelectItem className="cursor-pointer" key={ex} value={ex}>
                                                                                        {ex}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </>
                                                                )}
                                                            />
                                                        </td>
                                                        {/* Script Name */}
                                                        <td className="px-2 py-1">
                                                            <FormField
                                                                control={form.control}
                                                                name={`assets.${idx}.scriptName`}
                                                                render={({ field: scriptField }) => (
                                                                    <>
                                                                        <SearchableSelect
                                                                            disabled={
                                                                                !newlyAddedRows.has(idx) ||
                                                                                !calculatedAssets[idx]?.exchangeType
                                                                            }
                                                                            options={
                                                                                getScriptOptions(
                                                                                    calculatedAssets[idx]?.exchangeType || "",
                                                                                    calculatedAssets[idx]?.segmentType || ""
                                                                                ) || []
                                                                            }
                                                                            value={scriptField.value.name}
                                                                            onChange={async (val) => {
                                                                                if (!val) return;

                                                                                const exchSegMap: Record<string, string> = {
                                                                                    NSEEquity: "NSE", BSEEquity: "BSE",
                                                                                    NSEFno: "NFO", BSEFno: "BFO",
                                                                                    NSECurrency: "CDS", BSECurrency: "CDS",
                                                                                };
                                                                                const assetExchange = calculatedAssets[idx]?.exchangeType || "";
                                                                                const assetSegment = calculatedAssets[idx]?.segmentType || "";
                                                                                const exchSeg = exchSegMap[assetExchange + assetSegment] || "";

                                                                                // Look up token from API
                                                                                let token = "";
                                                                                try {
                                                                                    const tokenRes = await fetch(
                                                                                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/token?exch_seg=${exchSeg}&name=${encodeURIComponent(val.label)}`
                                                                                    );
                                                                                    const tokenData = await tokenRes.json();
                                                                                    token = tokenData?.data?.token || "";
                                                                                } catch {
                                                                                    token = "";
                                                                                }

                                                                                scriptField.onChange({
                                                                                    exchange: exchSeg,
                                                                                    token: token,
                                                                                    name: val.label,
                                                                                });

                                                                                // Only fetch CMP for newly added rows
                                                                                if (newlyAddedRows.has(idx)) {
                                                                                    let cmp = null;
                                                                                    try {
                                                                                        setFetchingCMP(true);
                                                                                        const data = await fetchCMP({
                                                                                            token: [token],
                                                                                            exchange: exchSeg,
                                                                                        });
                                                                                        cmp = data?.data;
                                                                                    } catch (error) {
                                                                                        console.error("Error fetching CMP:", error);
                                                                                        cmp = null;
                                                                                    } finally {
                                                                                        setFetchingCMP(false);
                                                                                    }

                                                                                    form.setValue(`assets.${idx}.cmp`, cmp);
                                                                                    form.setValue(`assets.${idx}.buyRate`, cmp);

                                                                                    form.setValue(`assets.${idx}.quantity`, null);
                                                                                    form.setValue(`assets.${idx}.weightage`, null);
                                                                                    form.setValue(`assets.${idx}.value`, null);
                                                                                }
                                                                            }}
                                                                            placeholder="Select script"
                                                                            searchPlaceholder="Search script..."
                                                                        />
                                                                        <FormMessage />
                                                                    </>
                                                                )}
                                                            />
                                                        </td>
                                                        {/* CMP */}
                                                        <td className="px-2 py-1">
                                                            {fetchingCMP && newlyAddedRows.has(idx) ? (
                                                                <div className="flex items-center justify-center">
                                                                    <Loader2 className="animate-spin h-4 w-4" />
                                                                </div>
                                                            ) : (
                                                                <Input
                                                                    value={calculatedAssets[idx]?.cmp ?? ""}
                                                                    disabled
                                                                    className="bg-white border-gray-800 cursor-not-allowed"
                                                                    placeholder="CMP"
                                                                />
                                                            )}
                                                        </td>
                                                        {/* Buy Rate */}
                                                        <td className="px-2 py-1">
                                                            <Input
                                                                value={
                                                                    calculatedAssets[idx]?.buyRate != null && !isNaN(calculatedAssets[idx].buyRate)
                                                                        ? Number(calculatedAssets[idx].buyRate).toFixed(2)
                                                                        : ""
                                                                }
                                                                disabled
                                                                className="bg-white border-gray-800 cursor-not-allowed"
                                                                placeholder="Buy Rate"
                                                            />
                                                        </td>
                                                        {/* Quantity */}
                                                        <td className="px-2 py-1">
                                                            <FormField
                                                                control={form.control}
                                                                name={`assets.${idx}.quantity`}
                                                                render={({ field: qtyField }) => (
                                                                    <>
                                                                        <Input
                                                                            disabled={
                                                                                (!newlyAddedRows.has(idx) &&
                                                                                    !(reducingScript === idx) &&
                                                                                    calculatedAssets[idx]?.initialValue !== null) ||
                                                                                (newlyAddedRows.has(idx) &&
                                                                                    (!calculatedAssets[idx]?.exchangeType ||
                                                                                        !calculatedAssets[idx]?.segmentType ||
                                                                                        !calculatedAssets[idx]?.scriptName?.name))
                                                                            }
                                                                            type="number"
                                                                            min="0"
                                                                            {...qtyField}
                                                                            className={`bg-white border-gray-800 ${(!newlyAddedRows.has(idx) &&
                                                                                !(reducingScript === idx) &&
                                                                                calculatedAssets[idx]?.initialValue !== null) ||
                                                                                (newlyAddedRows.has(idx) &&
                                                                                    (!calculatedAssets[idx]?.exchangeType ||
                                                                                        !calculatedAssets[idx]?.segmentType ||
                                                                                        !calculatedAssets[idx]?.scriptName?.name))
                                                                                ? "cursor-not-allowed"
                                                                                : ""
                                                                                } [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                                            placeholder="Quantity"
                                                                            value={qtyField.value ?? ""}
                                                                            onChange={(e) => {
                                                                                if (!newlyAddedRows.has(idx) && !(reducingScript === idx)) return;
                                                                                const val = e.target.value ? Math.round(parseFloat(e.target.value)) : null;

                                                                                // Check for negative values
                                                                                if (val !== null && val < 0) {
                                                                                    toast({
                                                                                        title: "Invalid quantity",
                                                                                        description:
                                                                                            "Quantity cannot be negative. Please enter a value of 0 or greater.",
                                                                                        variant: "default",
                                                                                    });
                                                                                    return;
                                                                                }

                                                                                // Get CMP for this row
                                                                                const cmp = calculatedAssets[idx]?.cmp ?? assets[idx]?.cmp ?? null;
                                                                                if (!cmp) return;
                                                                                console.log("CMP", cmp);

                                                                                // Get current quantity and value
                                                                                const currentQuantity = calculatedAssets[idx]?.quantity ?? 0;
                                                                                const currentValue = currentQuantity * cmp;
                                                                                const currentInitialValue = calculatedAssets[idx]?.initialValue ?? 0;
                                                                                console.log("CURRENT INITIAL VALUE", currentInitialValue, val);

                                                                                // Calculate new value and additional value
                                                                                const newValue = val ? val * cmp : null;
                                                                                const additionalValue = newValue ? newValue - currentValue : 0;
                                                                                console.log("REDUCING SCRIPT", reducingScript, idx);

                                                                                // For existing scripts being reduced, check against original quantity
                                                                                if (reducingScript === idx && val !== null) {
                                                                                    const originalQuantity = originalQuantities[idx];
                                                                                    const previousQuantity = previousQuantities[idx];
                                                                                    console.log("ORIGINAL QUANTITY", originalQuantity);
                                                                                    console.log("PREVIOUS QUANTITY", previousQuantity);
                                                                                    if (val > originalQuantity) {
                                                                                        toast({
                                                                                            title: "Invalid quantity",
                                                                                            description: `When reducing a script, you can only set quantity up to the original value of ${originalQuantity}.`,
                                                                                            variant: "default",
                                                                                        });
                                                                                        return;
                                                                                    }

                                                                                    // Calculate proportional values based on original quantity
                                                                                    const newInitialValue =
                                                                                        val > 0
                                                                                            ? ((calculatedAssets[idx]?.buyRate ?? cmp) * originalQuantity * val) /
                                                                                            originalQuantity
                                                                                            : 0;

                                                                                    form.setValue(`assets.${idx}.initialValue`, newInitialValue, {
                                                                                        shouldValidate: true,
                                                                                    });
                                                                                    // form.setValue(
                                                                                    // 	`assets.${idx}.value`,
                                                                                    // 	(calculatedAssets[idx]?.cmp ?? 0) * (val ?? 0),
                                                                                    // 	{
                                                                                    // 		shouldValidate: true,
                                                                                    // 	}
                                                                                    // );

                                                                                    // Handle quantity changes relative to previous quantity (for closed positions)
                                                                                    if (val < previousQuantity) {
                                                                                        // Quantity is reduced - add to closed positions
                                                                                        const reducedQuantity = previousQuantity - val;
                                                                                        console.log("REDUCING QUANTITY:", {
                                                                                            scriptName: calculatedAssets[idx]?.scriptName?.name,
                                                                                            previousQuantity,
                                                                                            newQuantity: val,
                                                                                            reducedQuantity,
                                                                                            asset: calculatedAssets[idx],
                                                                                        });
                                                                                        addToClosedPositions(
                                                                                            calculatedAssets[idx],
                                                                                            reducedQuantity,
                                                                                            previousQuantity
                                                                                        );
                                                                                    } else if (val > previousQuantity) {
                                                                                        // Quantity is increased - remove from closed positions
                                                                                        const increasedQuantity = val - previousQuantity;
                                                                                        removeFromClosedPositions(calculatedAssets[idx], increasedQuantity);
                                                                                    }
                                                                                    // If val === previousQuantity, no change needed

                                                                                    // Calculate and update P&L for the remaining position
                                                                                    if (newValue && newInitialValue > 0) {
                                                                                        const profitLoss = newValue - newInitialValue;
                                                                                        const profitLossPercentage = (profitLoss / newInitialValue) * 100;
                                                                                        form.setValue(`assets.${idx}.profitLoss`, profitLoss, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                        form.setValue(`assets.${idx}.profitLossPercentage`, profitLossPercentage, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                    } else {
                                                                                        // When quantity is 0, set P&L to 0
                                                                                        form.setValue(`assets.${idx}.profitLoss`, 0, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                        form.setValue(`assets.${idx}.profitLossPercentage`, 0, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                    }
                                                                                } else {
                                                                                    // For new scripts or non-reducing scripts, calculate P&L normally
                                                                                    if (newValue && currentInitialValue) {
                                                                                        const { profitLoss, profitLossPercentage } = calculatePnL({
                                                                                            ...calculatedAssets[idx],
                                                                                            quantity: val,
                                                                                            value: newValue,
                                                                                            initialValue: currentInitialValue,
                                                                                        });
                                                                                        form.setValue(`assets.${idx}.profitLoss`, profitLoss, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                        form.setValue(`assets.${idx}.profitLossPercentage`, profitLossPercentage, {
                                                                                            shouldValidate: true,
                                                                                        });
                                                                                    }
                                                                                }

                                                                                // Calculate available balance
                                                                                const availableBalance = minInvestmentAmount - totalInitialValue;

                                                                                // If additional value exceeds available balance, show error and don't update
                                                                                if (additionalValue > availableBalance) {
                                                                                    const maxAdditionalQuantity = Math.floor(availableBalance / cmp);
                                                                                    const maxTotalQuantity = currentQuantity + maxAdditionalQuantity;
                                                                                    toast({
                                                                                        title: "Insufficient balance",
                                                                                        description: `Available balance (₹${availableBalance.toFixed(2)}) is insufficient for this quantity increase. Maximum additional quantity allowed: ${maxAdditionalQuantity} (Total: ${maxTotalQuantity})`,
                                                                                        variant: "default",
                                                                                    });
                                                                                    return;
                                                                                }

                                                                                // If value is within limits, update the form
                                                                                const weightage =
                                                                                    newValue && minInvestmentAmount
                                                                                        ? Math.floor((newValue / minInvestmentAmount) * 100)
                                                                                        : null;
                                                                                form.setValue(`assets.${idx}.quantity`, val, { shouldValidate: true });
                                                                                form.setValue(`assets.${idx}.weightage`, weightage, { shouldValidate: true });
                                                                                form.setValue(`assets.${idx}.value`, newValue, { shouldValidate: true });

                                                                                // Update previous quantities for next comparison
                                                                                if (reducingScript === idx && val !== null) {
                                                                                    setPreviousQuantities((prev) => ({ ...prev, [idx]: val }));
                                                                                }

                                                                                form.trigger("assets");
                                                                            }}
                                                                        />
                                                                        <FormMessage />
                                                                    </>
                                                                )}
                                                            />
                                                        </td>
                                                        {/* Weightage — auto-calculated from QTY, not editable */}
                                                        <td className="px-2 py-1">
                                                            <Input
                                                                value={
                                                                    calculatedAssets[idx]?.weightage != null &&
                                                                        !isNaN(Number(calculatedAssets[idx]?.weightage))
                                                                        ? Number(calculatedAssets[idx]?.weightage).toFixed(2)
                                                                        : ""
                                                                }
                                                                disabled
                                                                className="bg-white border-gray-800 cursor-not-allowed"
                                                                placeholder="Weightage %"
                                                            />
                                                        </td>
                                                        {/* Value */}
                                                        <td className="px-2 py-1">
                                                            <Input
                                                                value={(calculatedAssets[idx]?.cmp ?? 0) * (calculatedAssets[idx]?.quantity ?? 0)}
                                                                disabled
                                                                className="bg-white border-gray-800 cursor-not-allowed"
                                                                placeholder="Value"
                                                            />
                                                        </td>
                                                        {/* Target (optional) */}
                                                        <td className="px-2 py-1">
                                                            <FormField
                                                                control={form.control}
                                                                name={`assets.${idx}.target`}
                                                                render={({ field: targetField }) => (
                                                                    <Input
                                                                        type="number"
                                                                        {...targetField}
                                                                        value={targetField.value ?? ""}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value ? parseFloat(e.target.value) : null;
                                                                            targetField.onChange(val);
                                                                        }}
                                                                        className="bg-white border-gray-800 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="Target (optional)"
                                                                    />
                                                                )}
                                                            />
                                                        </td>
                                                        {/* Invested Amount */}
                                                        <td className="px-2 py-1">
                                                            <Input
                                                                value={
                                                                    typeof calculatedAssets[idx]?.initialValue === "number" &&
                                                                        !isNaN(calculatedAssets[idx]?.initialValue)
                                                                        ? calculatedAssets[idx].initialValue.toFixed(2)
                                                                        : calculatedAssets[idx]?.initialValue
                                                                            ? calculatedAssets[idx].initialValue.toFixed(2)
                                                                            : ""
                                                                }
                                                                disabled
                                                                className="bg-white border-gray-800 cursor-not-allowed"
                                                                placeholder="Invested Amount"
                                                            />
                                                        </td>
                                                        {/* P&L */}
                                                        <td className="px-2 py-1">
                                                            <Input
                                                                value={
                                                                    calculatedAssets[idx]?.profitLoss ? calculatedAssets[idx].profitLoss.toFixed(2) : "0.00"
                                                                }
                                                                disabled
                                                                className={`bg-white border-gray-800 cursor-not-allowed ${calculatedAssets[idx]?.profitLoss
                                                                    ? calculatedAssets[idx].profitLoss > 0
                                                                        ? "text-green-500"
                                                                        : calculatedAssets[idx].profitLoss < 0
                                                                            ? "text-red-500"
                                                                            : ""
                                                                    : ""
                                                                    }`}
                                                                placeholder="P&L"
                                                            />
                                                        </td>
                                                        {/* Actions */}
                                                        <td className="px-2 py-1 text-right relative">
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer ml-auto"
                                                                onClick={() => setOpenScriptActionOpen((prev) => (prev === idx ? null : idx))}
                                                                title="Actions"
                                                            >
                                                                <Info className="w-4 h-4" />
                                                            </button>
                                                            {openScriptActionOpen === idx && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-10"
                                                                        aria-hidden
                                                                        onClick={() => setOpenScriptActionOpen(null)}
                                                                    />
                                                                    <div className="absolute right-0 top-full mt-0.5 z-20 min-w-[120px] py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                                                                        {!newlyAddedRows.has(idx) && (
                                                                            <button
                                                                                type="button"
                                                                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-orange-600 dark:text-orange-400"
                                                                                onClick={() => {
                                                                                    setOpenScriptActionOpen(null);
                                                                                    handleReduceScript(idx);
                                                                                }}
                                                                            >
                                                                                Reduce
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-red-600 dark:text-red-400"
                                                                            onClick={() => {
                                                                                setOpenScriptActionOpen(null);
                                                                                handleRemoveScript(idx);
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Total Row */}
                                                <tr className="bg-gray-200 font-semibold">
                                                    <td className="px-2 py-1 text-gray-800">Total</td>
                                                    <td className="px-2 py-1">
                                                        <Input value="-" disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value="-" disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value="-" disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value="-" disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={totalQty ? totalQty.toFixed(2) : "-"} disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={totalWeightage ? totalWeightage.toFixed(2) + " %" : "-"} disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={totalValue ? totalValue.toFixed(2) : "-"} disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={totalTarget > 0 ? totalTarget.toFixed(2) : "-"} disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={totalInitialValue ? totalInitialValue.toFixed(2) : "-"} disabled className="bg-gray-200 border-gray-800 font-semibold" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input
                                                            value={totalProfitLoss != null ? totalProfitLoss.toFixed(2) : "-"}
                                                            disabled
                                                            className={`bg-gray-200 border-gray-800 font-semibold ${totalProfitLoss > 0 ? "text-green-500" : totalProfitLoss < 0 ? "text-red-500" : ""}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1"></td>
                                                </tr>
                                                {/* Cash Row (not part of form state) */}
                                                <tr className="bg-blue-900/30">
                                                    <td className="px-2 py-1">{fields.length + 1}</td>
                                                    <td className="px-2 py-1">
                                                        <Input value="-" disabled className="bg-white border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value="Uninvested Balance" disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={cashValue.toFixed(2)} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <Input value={"-"} disabled className="bg-blue-900/30 border-gray-800" />
                                                    </td>
                                                    <td className="px-2 py-1"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        {editMode === "rebalancing" && (
                                            <Button
                                                type="button"
                                                variant="green"
                                                className="mt-2 cursor-pointer "
                                                onClick={() => {
                                                    // Calculate total initial value and available balance
                                                    const totalInitialValue = calculatedAssets.reduce(
                                                        (sum, asset) => sum + (asset.initialValue || 0),
                                                        0
                                                    );
                                                    const availableBalance = minInvestmentAmount - totalInitialValue;

                                                    // Check if there's any available balance
                                                    if (availableBalance <= 0) {
                                                        toast({
                                                            title: "Cannot add more scripts",
                                                            description: "No available balance to add new scripts. Uninvested balance is 0.",
                                                            variant: "default",
                                                        });
                                                        return;
                                                    }

                                                    const newIndex = fields.length;
                                                    append({
                                                        slNo: newIndex + 1,
                                                        exchangeType: "",
                                                        segmentType: "Equity",
                                                        scriptName: {
                                                            exchange: "",
                                                            token: "",
                                                            name: "",
                                                        },
                                                        cmp: null,
                                                        quantity: null,
                                                        weightage: null,
                                                        value: null,
                                                        target: null,
                                                        profitLoss: null,
                                                        profitLossPercentage: null,
                                                        currentValue: null,
                                                        initialValue: null,
                                                        currentCMP: null,
                                                        buyRate: null,
                                                    });
                                                    setNewlyAddedRows((prev) => {
                                                        const newSet = new Set(prev);
                                                        newSet.add(newIndex);
                                                        return newSet;
                                                    });
                                                }}
                                            >
                                                + Add More
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full flex justify-end items-center">
                                    <Button type="submit" variant="green" className="w-max cursor-pointer " disabled={isLoading}>
                                        {isLoading ? "Updating..." : "Update Portfolio"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Closed Positions Table */}
                {closedPositions.length > 0 && (
                    <Card className="bg-white text-black border-gray-800 mt-8">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">Closed Positions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-left border border-gray-800 bg-white rounded-lg">
                                    <thead className="bg-white rounded-lg">
                                        <tr>
                                            <th className="px-2 py-1">Sl No</th>
                                            <th className="px-2 py-1">Exchange</th>
                                            <th className="px-2 py-1">Segment</th>
                                            <th className="px-2 py-1">Script Name</th>
                                            <th className="px-2 py-1">CMP</th>
                                            <th className="px-2 py-1">QTY</th>
                                            <th className="px-2 py-1">Weightage</th>
                                            <th className="px-2 py-1">Value</th>
                                            <th className="px-2 py-1">Invested Value</th>
                                            <th className="px-2 py-1">P&L</th>
                                            <th className="px-2 py-1">P&L %</th>
                                            <th className="px-2 py-1">Closed At</th>
                                            <th className="px-2 py-1">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {closedPositions.map((position, idx) => (
                                            <tr key={idx} className="bg-white">
                                                <td className="px-2 py-1">{position.slNo}</td>
                                                <td className="px-2 py-1">{position.exchangeType}</td>
                                                <td className="px-2 py-1">{position.segmentType}</td>
                                                <td className="px-2 py-1">{position.scriptName.name}</td>
                                                <td className="px-2 py-1">{position.cmp?.toFixed(2)}</td>
                                                <td className="px-2 py-1">{position.quantity}</td>
                                                <td className="px-2 py-1">{position.weightage?.toFixed(2)}</td>
                                                <td className="px-2 py-1">{position.value?.toFixed(2)}</td>
                                                <td className="px-2 py-1">{position.investedValue?.toFixed(2)}</td>
                                                <td
                                                    className={`px-2 py-1 ${position.profitLoss && position.profitLoss > 0 ? "text-green-500" : position.profitLoss && position.profitLoss < 0 ? "text-red-500" : ""}`}
                                                >
                                                    {position.profitLoss?.toFixed(2)}
                                                </td>
                                                <td
                                                    className={`px-2 py-1 ${position.profitLossPercentage && position.profitLossPercentage > 0 ? "text-green-500" : position.profitLossPercentage && position.profitLossPercentage < 0 ? "text-red-500" : ""}`}
                                                >
                                                    {position.profitLossPercentage?.toFixed(2)}%
                                                </td>
                                                <td className="px-2 py-1">{new Date(position.closedAt).toLocaleString()}</td>
                                                <td className="px-2 py-1">
                                                    <button
                                                        type="button"
                                                        className="bg-blue-700 cursor-pointer text-black px-2 py-1 rounded hover:bg-blue-800 text-xs"
                                                        onClick={() => setRemarksDialog({ open: true, idx, value: position.remarks || "" })}
                                                    >
                                                        Remarks
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!scriptToDelete} onOpenChange={() => setScriptToDelete(null)}>
                    <AlertDialogContent className="bg-white text-black border-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Confirm Script Removal
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to remove {scriptToDelete?.name}? This will move ₹{scriptToDelete?.value.toFixed(2)}{" "}
                                to the uninvested balance.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={cancelDeleteScript} className="bg-gray-800 text-black hover:bg-gray-700">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteScript} className="bg-red-600 text-black hover:bg-red-700">
                                Remove Script
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Remarks Dialog */}
                <AlertDialog open={remarksDialog.open} onOpenChange={(open) => setRemarksDialog((prev) => ({ ...prev, open }))}>
                    <AlertDialogContent className="bg-white text-black border-gray-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Add/Edit Remarks</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                                Add any remarks for this closed position. This will be saved with the closed position.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="mt-2">
                            <textarea
                                className="w-full bg-white border border-gray-700 rounded p-2 text-black min-h-[80px]"
                                value={closedPositions[remarksDialog.idx!]?.remarks || remarksDialog.value}
                                onChange={(e) => setRemarksDialog((prev) => ({ ...prev, value: e.target.value }))}
                                placeholder="Enter remarks..."
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={() => setRemarksDialog({ open: false, idx: null, value: "" })}
                                className="bg-gray-800 cursor-pointer text-black hover:bg-gray-700"
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (remarksDialog.idx !== null) {
                                        setClosedPositions((prev) => {
                                            const updated = [...prev];
                                            updated[remarksDialog.idx!] = {
                                                ...updated[remarksDialog.idx!],
                                                remarks: remarksDialog.value,
                                            };
                                            return updated;
                                        });
                                    }
                                    setRemarksDialog({ open: false, idx: null, value: "" });
                                }}
                                className="bg-blue-700 cursor-pointer text-black hover:bg-blue-800"
                            >
                                Save Remarks
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
};

export default EditPortfolio;
