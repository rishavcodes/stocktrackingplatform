"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Video,
} from "lucide-react";

export default function ChatsComingSoon() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10 md:py-16">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Top gradient strip */}
        <div className="h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />

        <div className="px-5 sm:px-8 py-10 sm:py-14 text-center flex flex-col items-center">
          

          {/* Tag */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold mb-3">
            <Sparkles className="w-3 h-3" />
            Coming Soon
          </span>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Chat directly with your experts
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-3 max-w-md leading-relaxed">
            Soon you&apos;ll be able to message the RAs you&apos;re subscribed
            to — ask follow-up questions, request clarification on a
            recommendation, and get personalised guidance without leaving
            Tradebox.
          </p>

          {/* Actions */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
            >
              <Bell className="w-4 h-4" />
              Notify me when it&apos;s live
            </button>
            <Link
              href="/dashboard/user/myprofile"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
          </div>
        </div>

        {/* Footer roadmap teaser */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-gray-900 dark:to-gray-900 px-5 sm:px-8 py-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
            What&apos;s coming
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {[
              { Icon: MessageCircle, text: "1-on-1 chat with subscribed RAs" },
              { Icon: CheckCircle2, text: "Read receipts & typing indicators" },
              { Icon: Sparkles, text: "Quick-reply on a recommendation" },
              { Icon: Video, text: "Voice notes & file sharing" },
            ].map(({ Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
              >
                <Icon className="mt-0.5 w-3.5 h-3.5 text-blue-500 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
