/**
 * Strip the raw S3 URL from outgoing article payloads so it never reaches
 * a viewer. Replaces `articlePDF` with a `hasArticlePDF` boolean so the
 * frontend can still toggle the "View PDF" CTA without learning the URL.
 *
 * Mongoose documents need `.toObject()` before destructuring, otherwise
 * `articlePDF` lives on the prototype and survives the spread.
 */
export function sanitizeArticleForResponse<T extends { articlePDF?: string } | null>(
	article: T
): T extends null ? null : Omit<NonNullable<T>, "articlePDF"> & { hasArticlePDF: boolean } {
	if (!article) return article as any;
	const plain =
		typeof (article as any).toObject === "function"
			? (article as any).toObject()
			: { ...(article as any) };
	const { articlePDF, ...rest } = plain;
	return {
		...rest,
		hasArticlePDF: typeof articlePDF === "string" && articlePDF.length > 0,
	} as any;
}

export function sanitizeArticleListForResponse(
	articles: Array<{ articlePDF?: string } | null>
) {
	return articles.map((a) => sanitizeArticleForResponse(a));
}
