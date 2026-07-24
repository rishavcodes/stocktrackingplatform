import { Request, Response } from "express";
import { UserModel } from "../../models/AuthModels";

export const linkBrokerController = async (req: Request, res: Response) => {
	try {
		const user = req.user as any;
		if (!user || user.role !== "user") {
			return res
				.status(403)
				.json({ success: false, message: "Only users can link broker accounts" });
		}

		const { brokerType, clientCode } = req.body;

		if (!brokerType || !clientCode) {
			return res
				.status(400)
				.json({ success: false, message: "brokerType and clientCode are required" });
		}

		if (!["bigul", "aliceblue"].includes(brokerType)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid brokerType" });
		}

		const existing = await UserModel.findOne({
			_id: user._id,
			"linkedBrokers.brokerType": brokerType,
			"linkedBrokers.clientCode": clientCode,
		});

		if (existing) {
			return res
				.status(200)
				.json({ success: true, message: "Broker already linked" });
		}

		await UserModel.findByIdAndUpdate(user._id, {
			$push: {
				linkedBrokers: {
					brokerType,
					clientCode,
					linkedAt: new Date(),
				},
			},
		});

		return res
			.status(200)
			.json({ success: true, message: "Broker linked successfully" });
	} catch (error) {
		console.error("Link broker error:", error);
		return res
			.status(500)
			.json({ success: false, message: "Failed to link broker" });
	}
};
