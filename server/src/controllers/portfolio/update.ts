import { Request, Response } from "express";
import { Portfolio } from "../../lib/schema";
import { PortfolioUpdateEvent } from "../../lib/portfolioUpdateEvent";
import { mailQueue } from "../../queues/MailQueues";
import { daysToFeeValidityLabel } from "../../lib/portfolioPricing";
import {
  diffScripts,
  ScriptLike,
  RebalanceDiff,
} from "../../lib/portfolioRebalance";
import { getActiveSubscriberEmails } from "../../lib/portfolioSubscribers";
import { sendNotification } from "../../helpers/sendNotification";

async function sendRebalanceEmailToSubscribers(
  portfolio: any,
  diff: RebalanceDiff
): Promise<void> {
  try {
    console.log("[rebalance email] start", {
      portfolioId: String(portfolio._id),
      portfolioName: portfolio.portfolioName,
      diff: {
        added: diff.added.length,
        removed: diff.removed.length,
        changed: diff.changed.length,
      },
    });

    // Active subscribers = unique buyers with a non-expired order for this
    // portfolio id (the stored subscribedBy array is unreliable).
    const emails = await getActiveSubscriberEmails(String(portfolio._id));

    if (emails.length === 0) {
      console.warn(
        "[rebalance email] no active subscribers with email — skipping send",
        { portfolioId: String(portfolio._id) }
      );
      return;
    }

    const rows = (
      label: string,
      items: { name: string; from?: number; to?: number; quantity?: number }[]
    ) => {
      if (!items.length) return "";
      const body = items
        .map((it) => {
          const detail =
            it.from !== undefined && it.to !== undefined
              ? `${it.from} → ${it.to}`
              : `Qty ${it.quantity}`;
          return `<li><strong>${it.name}</strong> — ${detail}</li>`;
        })
        .join("");
      return `<p style="margin:16px 0 4px;font-weight:600;">${label}</p><ul style="margin:0 0 12px 18px;">${body}</ul>`;
    };

    const subject = `Portfolio Rebalanced: ${portfolio.portfolioName}`;
    const html = `
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;color:#333;background:#fafafa;">
        <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.1);overflow:hidden;">
          <div style="background:#01DDAA;color:#fff;padding:20px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Portfolio Rebalanced</h1>
          </div>
          <div style="padding:20px;">
            <h2 style="margin-top:0;">${portfolio.portfolioName}</h2>
            <p>Your research analyst has rebalanced this model portfolio. Please review the changes below and update your holdings accordingly.</p>
            ${rows("Added", diff.added)}
            ${rows("Removed", diff.removed)}
            ${rows("Quantity changed", diff.changed)}
            <p style="margin-top:20px;">
              <a href="${process.env.FRONTEND_URL || ""}/dashboard/user/subscribedmodelportfolio" style="display:inline-block;padding:10px 20px;background:#01DDAA;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">View Portfolio</a>
            </p>
          </div>
          <div style="padding:15px;background:#f4f4f4;text-align:center;font-size:12px;color:#666;">
            This is an automated message. Please do not reply to this email.
          </div>
        </div>
      </body></html>
    `;

    await Promise.all(
      emails.map((to: string) =>
        mailQueue.add(to, {
          mailOptions: {
            from: process.env.EMAIL,
            to,
            subject,
            html,
          },
        })
      )
    );

    console.log("[rebalance email] queued", {
      portfolioId: String(portfolio._id),
      portfolioName: portfolio.portfolioName,
      emailCount: emails.length,
    });
  } catch (err) {
    console.error("[rebalance email] failed to queue emails", {
      portfolioId: String(portfolio?._id),
      err,
    });
  }
}

export const UpdatePortfolioController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        message: "Portfolio id is required",
      });
    }
    // Support both JSON and multipart (FormData with data + optional bannerImage)
    let body: Record<string, any> = req.body;
    if (req.body?.data) {
      body = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
    }
    const files = req.files as { bannerImage?: Express.MulterS3.File[] } | undefined;
    if (files?.bannerImage?.[0]?.location) {
      body.bannerURL = files.bannerImage[0].location;
    }

    // Create an update object with only the fields that are present in the request body
    const updateFields: Record<string, any> = {};
    const allowedFields = [
      "portfolioName",
      "theme",
      "methodology",
      "benchmarkIndex",
      "investmentHorizon",
      "reviewFrequency",
      "minInvestmentAmount",
      "launchDate",
      "rationale",
      "disclosure",
      "scripts",
      "closedPositions",
      "riskMetrics",
      "shareWithMarketplaces",
      "pricingPlans",
      "fees",
      "feeValidity",
      "riskLevel",
      "bannerURL",
    ];

    console.log(allowedFields);

    // Only add fields that are present in the request body
    allowedFields.forEach((field) => {
      if (field in body) {
        // Special handling for scripts array
        if (field === "scripts" && Array.isArray(body.scripts)) {
          // Filter out items with quantity 0
          console.log(body.scripts);
          updateFields[field] = body.scripts.filter(
            (script: any) => script.quantity !== 0
          );
        } else if (
          field === "closedPositions" &&
          Array.isArray(body.closedPositions)
        ) {
          // Convert closedAt strings to Date objects for closedPositions
          updateFields[field] = body.closedPositions.map(
            (position: any) => ({
              ...position,
              closedAt: new Date(position.closedAt),
            })
          );
        } else {
          updateFields[field] = body[field];
        }
      }
    });

    // Keep the legacy `fees`/`feeValidity` mirrors in sync with the cheapest plan
    // whenever pricingPlans is updated, so un-migrated read sites never go stale.
    if (Array.isArray(updateFields.pricingPlans) && updateFields.pricingPlans.length > 0) {
      const cheapestPlan = updateFields.pricingPlans.reduce(
        (min: any, p: any) => (Number(p?.price) < Number(min?.price) ? p : min),
        updateFields.pricingPlans[0]
      );
      updateFields.fees = Number(cheapestPlan?.price) || 0;
      updateFields.feeValidity = daysToFeeValidityLabel(
        Number(cheapestPlan?.validity) || 0
      );
    }

    // If no fields to update, return early
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
      });
    }

    // console.log("UPDATE FIELDS", updateFields);

    const portfolio = await Portfolio.findById(id);
    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    // Track changes for event logging
    // const prevClosedPositionsLength = portfolio.closedPositions?.length || 0;
    const prevData = portfolio.toObject();

    // Apply updates
    Object.assign(portfolio, updateFields);

    // A rebalance = the scripts list materially changed (add / remove / qty
    // change) OR closedPositions grew (the SP closed a holding). The same
    // diffScripts that renders the email body is now the source of truth, so
    // the detection result and the email content can never disagree.
    const scriptDiff = diffScripts(
      prevData.scripts as ScriptLike[] | undefined,
      (updateFields.scripts ?? prevData.scripts) as ScriptLike[] | undefined
    );

    const closedPositionsGrew =
      Array.isArray(updateFields.closedPositions) &&
      updateFields.closedPositions.length >
        (prevData.closedPositions?.length || 0);

    const isRebalance =
      scriptDiff.added.length > 0 ||
      scriptDiff.removed.length > 0 ||
      scriptDiff.changed.length > 0 ||
      closedPositionsGrew;

    console.log("[rebalance email] detection", {
      portfolioId: String(portfolio._id),
      isRebalance,
      scriptDiff: {
        added: scriptDiff.added.length,
        removed: scriptDiff.removed.length,
        changed: scriptDiff.changed.length,
      },
      closedPositionsGrew,
    });

    if (isRebalance) {
      portfolio.rebalanceCount = (portfolio.rebalanceCount || 0) + 1;
    }

    await portfolio.save();

    // Compute changes (diff)
    const changes: Record<string, any> = {};
    const prevDataRecord = prevData as Record<string, any>;
    for (const key of Object.keys(updateFields)) {
      if (
        JSON.stringify(prevDataRecord[key]) !==
        JSON.stringify(updateFields[key])
      ) {
        changes[key] = {
          before: prevDataRecord[key],
          after: updateFields[key],
        };
      }
    }

    await PortfolioUpdateEvent.create({
      portfolio: portfolio._id,
      updateType: isRebalance ? "rebalance" : "general",
      description: isRebalance
        ? "Rebalance occurred: closedPositions updated."
        : "Portfolio updated.",
      changes,
    });

    if (isRebalance) {
      // Awaited so the email lifecycle is observable inside the request log,
      // but the .catch keeps an email failure from breaking the SP's save.
      await sendRebalanceEmailToSubscribers(portfolio, scriptDiff).catch(
        (err) => console.error("[rebalance email] dispatch error:", err)
      );

      // Confirm the rebalance back to the SP in their top-nav notification bell.
      // sendNotification swallows its own errors, so a notification failure can
      // never break the save. Recipient = the portfolio author (the SP).
      const author = (portfolio as any).authorData;
      if (author?.id) {
        await sendNotification({
          recipientIds: [String(author.id)],
          recipientRole: "provider",
          message: `Your portfolio "${portfolio.portfolioName}" was rebalanced successfully`,
          type: "portfolio-update",
          category: "sp",
          sentBy: { id: String(author.id), name: author.name },
          postLink: "/dashboard/serviceprovider/portfolio/myportfolios",
          ctaLabel: "View Portfolio",
        });
      }
    }

    return res.status(200).json({
      message: "Portfolio updated successfully",
      data: portfolio,
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
