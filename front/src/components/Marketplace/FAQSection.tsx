"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FAQCategory as FAQCategoryType } from "./types";

type FAQ = { q: string; a: string };
type FAQCategory = { title: string; icon: string; items: FAQ[] };

const DEFAULT_FAQ_DATA: FAQCategory[] = [
  {
    title: "Platform Understanding / About TradeIdeas",
    icon: "💡",
    items: [
      {
        q: "What is TradeIdeas?",
        a: "TradeIdeas is a marketplace that enables users to discover, purchase, and act on curated investment Trading Ideas from SEBI-registered, verified analysts.",
      },
      {
        q: "How does TradeIdeas work?",
        a: "It aggregates Trading Ideas from multiple experts, allowing you to explore, evaluate, and choose what suits your investment style.",
      },
      {
        q: "Who is TradeIdeas for?",
        a: "It is built for all types of investors looking to access expert Trading Ideas in one place.",
      },
      {
        q: "Is TradeIdeas free to use?",
        a: "You can explore the platform for free. Some Trading Ideas are also available for free, while some Trading Ideas require a subscription.",
      },
      {
        q: "Do I need prior trading experience to use TradeIdeas?",
        a: "No, the platform is designed to simplify expert Trading Ideas so even beginners can understand and act on them.",
      },
    ],
  },
  {
    title: "Features & Value Proposition",
    icon: "✨",
    items: [
      {
        q: "How can TradeIdeas help me make better decisions?",
        a: "It gives you access to curated Trading Ideas from multiple experts, reducing research time and improving decision quality.",
      },
      {
        q: "What kind of Trading Ideas are available?",
        a: "You can access intraday, short-term, and long-term investment Trading Ideas across different market segments.",
      },
      {
        q: "What makes TradeIdeas different from other platforms?",
        a: "It acts as a marketplace where you can access multiple analysts and choose Trading Ideas based on your requirements.",
      },
      {
        q: "Does TradeIdeas provide real-time Trading Ideas?",
        a: "Yes, Trading Ideas and updates are delivered in real-time so you can act quickly on opportunities.",
      },
    ],
  },
  {
    title: "Subscription & Pricing",
    icon: "💳",
    items: [
      {
        q: "What is a TradeIdeas subscription plan?",
        a: "It is a paid plan that provides access to premium Trading Ideas from verified analysts on the platform.",
      },
      {
        q: "What benefits do I get with a subscription?",
        a: "You gain access to exclusive Trading Ideas and high-quality insights from expert analysts.",
      },
      {
        q: "Can I subscribe to multiple analysts?",
        a: "Yes, you can choose and subscribe to multiple analysts based on your preferences.",
      },
      {
        q: "Are there any hidden charges?",
        a: "No, all subscription costs are transparent and shown clearly before purchase.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "No. However, you can ask your RA to cancel your subscriptions.",
      },
    ],
  },
  {
    title: "Account & Onboarding",
    icon: "👤",
    items: [
      {
        q: "How do I sign up on TradeIdeas?",
        a: "If you have a Bigul account, you can directly land on the TradeIdeas dashboard page.",
      },
      {
        q: "Do I need a Bigul account?",
        a: "Yes, you need a Bigul account to explore the platform and execute orders.",
      },
      {
        q: "How do I link my Bigul account?",
        a: "Simply log in with your Bigul credentials to securely connect your trading account.",
      },
      {
        q: "Is KYC required?",
        a: "Yes, KYC is required to enable trading and access full platform functionality. It happens once you are going to purchase a subscription.",
      },
    ],
  },
  {
    title: "Trading & Execution",
    icon: "📈",
    items: [
      {
        q: "Can I act on Trading Ideas directly from TradeIdeas?",
        a: "Yes, you have to login through your Bigul account and then you can execute trades based on selected Trading Ideas.",
      },
      {
        q: "Are Trading Ideas automated or manual?",
        a: "Trading Ideas are advisory in nature, and you execute trades manually.",
      },
      {
        q: "What happens after I follow a Trading Idea?",
        a: "You receive entry, exit, and update alerts related to that Trading Idea.",
      },
      {
        q: "Can I track my trades and performance?",
        a: "Yes, you can monitor your trades and see how your decisions are performing.",
      },
    ],
  },
  {
    title: "Analyst Trust & Transparency",
    icon: "🛡️",
    items: [
      {
        q: "How are analysts verified?",
        a: "All analysts are SEBI-registered, verified, and comply with regulatory guidelines before being listed on the marketplace.",
      },
      {
        q: "Can I check an analyst's past performance?",
        a: "No, you cannot review historical performance and track records before subscribing.",
      },
      {
        q: "How frequently are Trading Ideas updated?",
        a: "Trading Ideas are updated regularly based on market movements.",
      },
      {
        q: "Are Trading Ideas compliant with regulations?",
        a: "Yes, all Trading Ideas adhere to applicable compliance and regulatory standards.",
      },
      {
        q: "Do analysts disclose risk levels?",
        a: "Yes, Trading Ideas include risk indicators to help you make informed decisions.",
      },
    ],
  },
  {
    title: "Notifications & Tracking",
    icon: "🔔",
    items: [
      {
        q: "How do I get alerts for Trading Ideas?",
        a: "Follow analysts or Trading Ideas to receive real-time alerts and updates.",
      },
      {
        q: "Can I bookmark Trading Ideas?",
        a: "Yes, you can save Trading Ideas for easy access later.",
      },
      {
        q: "Where can I see my saved Trading Ideas?",
        a: "All saved and followed Trading Ideas are available in your watchlist.",
      },
      {
        q: "Can I customize notifications?",
        a: "No, you cannot personalize alerts based on your preferences in settings.",
      },
    ],
  },
  {
    title: "Risk & Responsibility",
    icon: "⚠️",
    items: [
      {
        q: "Is there any guarantee of returns?",
        a: "No, Trading Ideas do not guarantee returns as markets are subject to risk.",
      },
      {
        q: "What risks are involved?",
        a: "Market volatility and analyst performance can impact outcomes.",
      },
      {
        q: "Should I follow all Trading Ideas?",
        a: "No, you should choose Trading Ideas based on your goals and risk appetite.",
      },
      {
        q: "How do I manage risk?",
        a: "Diversify across Trading Ideas and follow proper risk management practices.",
      },
      {
        q: "Is TradeIdeas responsible for losses?",
        a: "No, all decisions are user-driven, and responsibility lies with the investor/trader.",
      },
    ],
  },
  {
    title: "Technical & Support",
    icon: "🛠️",
    items: [
      {
        q: "What if I forget my password?",
        a: "You have to use your Bigul credentials. You can reset it easily using the \"Forgot Password\" option on the login page.",
      },
      {
        q: "Why am I not receiving notifications?",
        a: "Check your notification settings and ensure permissions are enabled.",
      },
      {
        q: "How can I contact support?",
        a: "You can reach out via the help section in the app or website.",
      },
      {
        q: "What platforms is TradeIdeas available on?",
        a: "Currently it is available on web, but later we will integrate it with the Bigul app for seamless access.",
      },
      {
        q: "Is my data secure?",
        a: "Yes, your data is protected using industry-standard security protocols.",
      },
    ],
  },
  {
    title: "Coupons & Discounts",
    icon: "🎟️",
    items: [
      {
        q: "How can I apply a coupon code on TradeIdeas?",
        a: "You can enter the coupon code at checkout while subscribing to an analyst or plan to avail the discount.",
      },
      {
        q: "Where can I find available coupon codes?",
        a: "Coupon codes may be shared via promotions, campaigns, notifications, or partner offers.",
      },
      {
        q: "Can I use multiple coupon codes at once?",
        a: "No, only one coupon code can be applied per transaction.",
      },
      {
        q: "Why is my coupon code not working?",
        a: "The code may have expired, reached usage limits, or may not be applicable to the selected plan.",
      },
    ],
  },
];

export default function FAQSection({ faqs }: { faqs?: FAQCategoryType[] }) {
  const [openKey, setOpenKey] = useState<string | null>("0-0");
  const [activeCategory, setActiveCategory] = useState(0);

  // Map marketplace FAQs to internal format, show nothing if none configured
  const FAQ_DATA: FAQCategory[] =
    faqs && faqs.length > 0
      ? faqs.map((cat) => ({
          title: cat.category,
          icon: cat.icon || "❓",
          items: cat.items.map((item) => ({ q: item.question, a: item.answer })),
        }))
      : [];

  const toggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  if (FAQ_DATA.length === 0) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Centered header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-[2px] rounded-full bg-blue-500" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">FAQs</span>
            <div className="w-8 h-[2px] rounded-full bg-blue-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto mt-2">
            Everything you need to know about TradeIdeas, subscriptions, and how the marketplace works
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
          {/* Category sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0">
              {FAQ_DATA.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveCategory(idx);
                    setOpenKey(`${idx}-0`);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-semibold whitespace-nowrap lg:whitespace-normal transition-all flex-shrink-0 ${
                    activeCategory === idx
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="leading-tight">{cat.title}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Active category questions */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{FAQ_DATA[activeCategory].icon}</span>
              {FAQ_DATA[activeCategory].title}
            </h3>
            <div className="space-y-2">
              {FAQ_DATA[activeCategory].items.map((item, qIdx) => {
                const key = `${activeCategory}-${qIdx}`;
                const isOpen = openKey === key;
                return (
                  <div
                    key={key}
                    className={`border rounded-xl transition-all duration-200 ${
                      isOpen
                        ? "border-blue-200 bg-blue-50/30 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="w-full flex items-start justify-between gap-3 text-left px-4 py-3.5"
                    >
                      <span className={`text-sm font-semibold leading-snug ${isOpen ? "text-blue-900" : "text-slate-800"}`}>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-blue-600" : "text-slate-400"
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
