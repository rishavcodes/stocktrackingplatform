import { Request, Response } from "express";
import { Portfolio } from "../../lib/schema";

export const DeletePortfolioController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Portfolio id is required",
      });
    }

    const portfolio = await Portfolio.findByIdAndDelete(id);

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    return res.status(200).json({
      message: "Portfolio deleted successfully",
      data: portfolio,
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
