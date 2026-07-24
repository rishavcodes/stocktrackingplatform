import mongoose, { Schema } from "mongoose";

const FooterLinkSchema = new Schema(
	{
		label: { type: String, trim: true, maxlength: 100 },
		url: { type: String, trim: true, maxlength: 500 },
	},
	{ _id: false },
);

const FooterSocialSchema = new Schema(
	{
		facebook: { type: String },
		instagram: { type: String },
		linkedin: { type: String },
		twitter: { type: String },
		threads: { type: String },
		youtube: { type: String },
	},
	{ _id: false },
);

const FooterAppLinksSchema = new Schema(
	{
		googlePlay: { type: String },
		appStore: { type: String },
		webApp: { type: String },
	},
	{ _id: false },
);

const FooterSupportSchema = new Schema(
	{
		phone: { type: String },
		email: { type: String },
		queryLink: { type: String },
	},
	{ _id: false },
);

const FooterSectionSchema = new Schema(
	{
		title: { type: String, trim: true, maxlength: 50 },
		links: { type: [FooterLinkSchema], default: [] },
	},
	{ _id: false },
);

const FooterConfigSchema = new Schema(
	{
		socials: { type: FooterSocialSchema },
		appLinks: { type: FooterAppLinksSchema },
		sections: { type: [FooterSectionSchema], default: [] },
		support: { type: FooterSupportSchema },
		copyrightText: { type: String, trim: true, maxlength: 200 },
		poweredByVisible: { type: Boolean, default: true },
	},
	{ _id: false },
);

const MarketplaceInvitationSchema = new Schema(
	{
		raId: {
			type: Schema.Types.ObjectId,
			ref: "serviceproviders",
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "declined", "revoked"],
			default: "pending",
		},
		invitedAt: { type: Date, default: Date.now },
		respondedAt: { type: Date },
		respondedBy: { type: Schema.Types.ObjectId, ref: "serviceproviders" },
		note: { type: String, trim: true, maxlength: 500 },
	},
	{ _id: false },
);

const MarketplaceSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: 120,
			unique: true,
		},
		slug: {
			type: String,
			required: true,
			lowercase: true,
			unique: true,
			index: true,
		},
		description: { type: String, trim: true, maxlength: 500 },
		createdByBrokerId: {
			type: Schema.Types.ObjectId,
			ref: "serviceproviders",
			required: true,
			index: true,
		},
		brokerSnapshot: {
			name: { type: String, required: true },
			email: { type: String, required: true },
			profileUrl: { type: String },
		},
		invitations: { type: [MarketplaceInvitationSchema], default: [] },
		activeRaIds: [
			{ type: Schema.Types.ObjectId, ref: "serviceproviders", index: true },
		],
		revokedRaIds: [{ type: Schema.Types.ObjectId, ref: "serviceproviders" }],
		status: { type: String, enum: ["active", "archived"], default: "active" },
		banners: {
			type: [
				new Schema(
					{
						imageUrl: { type: String, required: true },
						ctaLink: { type: String, default: "" },
					},
					{ _id: false },
				),
			],
			default: [],
		},
		faqs: {
			type: [
				new Schema(
					{
						category: { type: String, trim: true, maxlength: 100 },
						icon: { type: String, maxlength: 10 },
						items: {
							type: [
								new Schema(
									{
										question: { type: String, trim: true, maxlength: 500 },
										answer: { type: String, trim: true, maxlength: 2000 },
									},
									{ _id: false },
								),
							],
							default: [],
						},
					},
					{ _id: false },
				),
			],
			default: [],
		},
		footerConfig: { type: FooterConfigSchema, default: undefined },
	},

	{ timestamps: true, versionKey: false },
);

export const MarketplaceModel =
	mongoose.models.marketplaces ||
	mongoose.model("marketplaces", MarketplaceSchema);

export type MarketplaceDocument = mongoose.InferSchemaType<
	typeof MarketplaceSchema
>;
