import { Request, Response } from "express";
import { OnboardingIssueModel } from "../models/OnboardingIssueModel";

// GET /api/admin/onboarding-issues
// Query params: status, step, severity, search (matches customer email/name or SP name),
// from (ISO date), to (ISO date), page, limit
export const listOnboardingIssues = async (req: Request, res: Response) => {
    try {
        const {
            status,
            step,
            severity,
            search,
            from,
            to,
        } = req.query;

        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
        const limit = Math.min(100, Math.max(10, parseInt(String(req.query.limit ?? "25"), 10)));

        const filter: any = {};
        if (status) filter.status = status;
        if (step) filter.step = step;
        if (severity) filter.severity = severity;

        if (from || to) {
            filter.lastOccurredAt = {};
            if (from) filter.lastOccurredAt.$gte = new Date(String(from));
            if (to) filter.lastOccurredAt.$lte = new Date(String(to));
        }

        if (search) {
            const s = String(search).trim();
            const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { customerEmail: rx },
                { customerName: rx },
                { spName: rx },
                { planTitle: rx },
                { reason: rx },
            ];
        }

        const [issues, total, statusCounts] = await Promise.all([
            OnboardingIssueModel.find(filter)
                .sort({ lastOccurredAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            OnboardingIssueModel.countDocuments(filter),
            OnboardingIssueModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        const counts: Record<string, number> = {};
        for (const row of statusCounts as any[]) counts[row._id] = row.count;

        return res.status(200).json({
            success: true,
            issues,
            total,
            page,
            limit,
            counts,
        });
    } catch (error: any) {
        console.error("listOnboardingIssues error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch onboarding issues" });
    }
};

// PATCH /api/admin/onboarding-issues/:id
// Body: { status?, notes? }
// Sets resolvedAt/resolvedBy automatically when status moves to resolved/refunded.
export const updateOnboardingIssue = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!id) {
            return res
                .status(400)
                .json({ success: false, message: "Missing issue id" });
        }

        const update: any = {};
        if (status) update.status = status;
        if (typeof notes === "string") update.notes = notes;

        if (status === "resolved" || status === "refunded") {
            update.resolvedAt = new Date();
            update.resolvedBy = (req as any).user?.email ?? (req as any).user?.id ?? "admin";
        } else if (status === "new" || status === "investigating" || status === "ignored") {
            update.resolvedAt = null;
            update.resolvedBy = null;
        }

        const issue = await OnboardingIssueModel.findByIdAndUpdate(id, update, {
            new: true,
        });

        if (!issue) {
            return res
                .status(404)
                .json({ success: false, message: "Issue not found" });
        }

        return res.status(200).json({ success: true, issue });
    } catch (error: any) {
        console.error("updateOnboardingIssue error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to update issue" });
    }
};

// GET /api/admin/onboarding-issues/:id
// Single issue with full detail (used by the expanded view in the admin page)
export const getOnboardingIssueById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const issue = await OnboardingIssueModel.findById(id).lean();
        if (!issue) {
            return res
                .status(404)
                .json({ success: false, message: "Issue not found" });
        }
        return res.status(200).json({ success: true, issue });
    } catch (error: any) {
        console.error("getOnboardingIssueById error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch issue" });
    }
};
