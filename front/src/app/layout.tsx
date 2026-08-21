import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getServerSession } from "next-auth/next";
import { Toaster } from "@/components/ui/toaster";
import { options } from "./api/auth/[...nextauth]/options";
import { SessionProviders, StoreProviders, ThemeProviders } from "./Providers";
export const metadata: Metadata = {
	title: "TradeBox",
	description:
		"At Trade Box you will get the market updates and guidance directly from the SEBI Registered Research Analysts, Investment Advisors, Portfolio Managers, Renowned Forex consultants and Trainers. Select your expert as per your investment goal now at Tradebox.",
};

export default async function RootLayout({ 
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession(options); 

	return (
		<html id="html" lang="en" suppressHydrationWarning={true}>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#01E3A1" />
				<link rel="icon" href="/favicon.ico" />
				<link
					rel="apple-touch-icon"
					sizes="57x57"
					href="/favicon/apple-icon-57x57.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="60x60"
					href="/favicon/apple-icon-60x60.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="72x72"
					href="/favicon/apple-icon-72x72.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="76x76"
					href="/favicon/apple-icon-76x76.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="114x114"
					href="/favicon/apple-icon-114x114.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="120x120"
					href="/favicon/apple-icon-120x120.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="144x144"
					href="/favicon/apple-icon-144x144.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="152x152"
					href="/favicon/apple-icon-152x152.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/favicon/apple-icon-180x180.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="192x192"
					href="/favicon/android-icon-192x192.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="96x96"
					href="/favicon/favicon-96x96.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon/favicon-16x16.png"
				/>
				<link rel="manifest" href="/manifest.json" />
				<meta name="msapplication-TileColor" content="#ffffff" />
				<meta
					name="msapplication-TileImage"
					content="/favicon/ms-icon-144x144.png"
				/>
				<meta name="theme-color" content="#ffffff" />
				<meta
					name="facebook-domain-verification"
					content="vgj9216yv455u5ple8clcfph711v94"
				/>
				{/* Meta Pixel Code */}
				<script
					dangerouslySetInnerHTML={{
						__html: `!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '563060253275578');
            fbq('track', 'PageView');`,
					}}
				/>
				<noscript>
					<img
						height="1"
						width="1"
						style={{ display: "none" }}
						src="https://www.facebook.com/tr?id=563060253275578&ev=PageView&noscript=1"
					/>
				</noscript>
				{/* End Meta Pixel Code */}
			</head>

			<GoogleAnalytics gaId="G-77T6MK6GR5" />

			<body>
				<SessionProviders session={session}>
					<ThemeProviders>
						<StoreProviders>
							<Toaster />
							{children}
						</StoreProviders>
					</ThemeProviders>
				</SessionProviders>
			</body>
		</html>
	);
}
