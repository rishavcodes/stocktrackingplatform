import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
// import { adminLoginHandler } from "../controllers/AuthController/ProviderAuthController";
import {
	AdminModel,
	ServiceProviderRegModel,
	UserModel,
} from "../models/AuthModels";
import { SessionModel } from "../models/Session";
import { HEARTBEAT_THROTTLE_MS } from "../helpers/presence";
import { blockIfReadOnlySubProfile } from "./subProfileReadOnly";

export const verifyAdminTokenMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token =
		req.headers.authorization && req.headers.authorization.split(" ")[1];
 console.log(token);
	if (!token) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized access no token provided",
		});
	}

	try {
		const decoded = jwt.verify(token, process.env.JWTSECRET as string);

		if (typeof decoded === "string") {
			console.error(
				"Invalid JWT payload. Expected an object, got a string:",
				decoded,
			);
			return res.status(401).json({ message: "Unauthorized - Invalid tok" });
		} 
		const userId  = decoded.id;

		const admin = await AdminModel.findById(userId);
console.log("ADMIN:", admin);
console.log("backendToken:", admin?.backendToken);
console.log("type:", typeof admin?.backendToken);
console.log("isArray:", Array.isArray(admin?.backendToken));

		if (!admin?.backendToken.includes(token)) {
			return res
				.status(401)
				.json({ success: false, message: "Unauthorized - Invalid token" });
		}

		return next();
	} catch (error) {
		return res
			.status(401)
			.json({ success: false, message: "Unauthorized - Invalid tokendfgh" });
	}
};

export const verifyUserRATokenMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token =
		req.headers.authorization && req.headers.authorization.split(" ")[1];

	if (!token) {
		return res.status(401).json({
			success: false,
			message: "Unauthorized access no token provided",
		});
	}
	try {
		const decoded = jwt.verify(token, process.env.JWTSECRET as string);

		if (typeof decoded === "string") {

			await SessionModel.findOneAndUpdate({ token }, { isActive: false });
			console.error(
				"Invalid JWT payload. Expected an object, got a string:",
				decoded,
			);
			return res.status(401).json({ message: "Unauthorized - Invalid token" });
		}
		// console.log("decoded", decoded);
		const userId = decoded.id;
		// console.log("user id hain hum", userId);

		// Impersonation tokens are stateless on purpose — we don't create a
		// Session row for them so the real SP keeps their own session intact.
		// `jwt.verify` above already enforces signature + expiry, so we trust
		// the token's TTL as the only revocation mechanism. Resolve the user
		// directly and short-circuit the SessionModel checks below.
		if ((decoded as any).impersonatedBy) {
			const impersonatedSp =
				decoded.role === "provider"
					? await ServiceProviderRegModel.findById(userId)
					: decoded.role === "user"
						? await UserModel.findById(userId)
						: null;
			if (!impersonatedSp) {
				return res
					.status(401)
					.json({ success: false, message: "Impersonation target not found" });
			}
			req.user = impersonatedSp;
			// View-only admin sub profiles are blocked from any write here too.
			if (blockIfReadOnlySubProfile(req, res)) return;
			return next();
		}

		let userSessionEntry;

		if (decoded.role === "provider") {
			userSessionEntry = await SessionModel.findOne({
				serviceProvider: userId,
			});
		} else if (decoded.role === "user") {
			userSessionEntry = await SessionModel.findOne({
				user: userId,
			});
		} else {
			userSessionEntry = await SessionModel.findOne({
				admin: userId,
			});
		}
		if (!userSessionEntry) {
			return res
				.status(401)
				.json({ success: false, message: "Session not found" });
		}

		// Strict token-string equality removed: it killed sessions every time
		// NextAuth re-encoded the JWT cookie (e.g. after useSession().update()
		// in PurchaseKycModal / CourseDetailsModal). JWT signature + expiry
		// (verified above) are sufficient for auth; we keep the isActive
		// check below so explicit "log out other devices" still works.
		if (!userSessionEntry.isActive) {
			return res.status(401).json({
				success: false,
				message: "Session has been terminated. Please log in again.",
			});
		}

		// ✅ Check if user or service provider exists
		const user = await UserModel.findById(userId);
		const serviceProvider = await ServiceProviderRegModel.findById(userId);
		const admin = await AdminModel.findById(userId);

		if (!user && !serviceProvider && !admin) {
			await SessionModel.findOneAndUpdate({ token }, { isActive: false });
			return res.status(401).json({
				success: false,
				message: "User/Service/Admin Provider not found",
			});
		}

		req.user = user || serviceProvider || admin;

		// View-only admin sub profiles can read but never write — block any
		// mutating request (create / edit / delete / send) here, the single
		// chokepoint every authenticated SP route passes through.
		if (blockIfReadOnlySubProfile(req, res)) return;

		// Throttled, fire-and-forget heartbeat — powers the "online now" indicator
		// on the SP dashboards. We update lastSeenAt at most once per
		// HEARTBEAT_THROTTLE_MS per user (conditional $lt filter avoids concurrent
		// double-writes) and never await it, so the hot auth path is unaffected.
		// The impersonation branch above returns early, so an admin impersonating a
		// user does NOT mark that user online.
		const presenceModel: any =
			decoded.role === "provider"
				? ServiceProviderRegModel
				: decoded.role === "user"
					? UserModel
					: AdminModel;
		const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_THROTTLE_MS);
		presenceModel
			.updateOne(
				{
					_id: userId,
					$or: [
						{ lastSeenAt: { $lt: heartbeatCutoff } },
						{ lastSeenAt: null },
					],
				},
				{ $set: { lastSeenAt: new Date() } },
			)
			.catch(() => {});

		return next();
	} catch (error) {
		console.error("JWT verification failed:", error);
		 await SessionModel.findOneAndUpdate({ token }, { isActive: false });
		return res
			.status(401)
			.json({ success: false, message: "Unauthorized - Invalid token" });
	}
};
