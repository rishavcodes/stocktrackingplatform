import ProtectedPdfViewer from "./ProtectedPdfViewer";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string[] }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  // The route was historically a catch-all that built an S3 path. Now we
  // pass the article _id as the only segment and stream a watermarked PDF
  // from the protected backend route. Old multi-segment links no longer
  // resolve to anything (intentional — the S3 URL is no longer exposed).
  const articleId = id?.[0] ?? "";
  // `?t=` is set on Telegram-shared links so a subscriber tapping the link
  // inside Telegram's in-app WebView can open the PDF without a NextAuth
  // session. Dashboard navigation never sets `t` and falls back to the
  // Bearer-header path inside ProtectedPdfViewerClient.
  const rawT = sp?.t;
  const shareToken = Array.isArray(rawT) ? rawT[0] : rawT;

  return (
    <ProtectedPdfViewer articleId={articleId} shareToken={shareToken} />
  );
}
