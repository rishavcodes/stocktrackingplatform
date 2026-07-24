"use client";

import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const faqData = [
  {
    question: "What is Tradebox?",
    answer:
      "Tradebox is a platform that connects investors with SEBI-registered Research Analysts. We help investors access expert market insights while providing Research Analysts with tools to grow their business.",
  },
  {
    question: "Is Tradebox SEBI-registered?",
    answer:
      "Tradebox is not a SEBI-registered advisory firm. We are a technology platform that enables SEBI-registered Research Analysts to share their insights with investors.",
  },
  {
    question: "Who provides stock market advice on Tradebox?",
    answer:
      "Only SEBI-registered Research Analysts provide market insights and research-based recommendations. Tradebox does not offer any stock tips or investment advice.",
  },
  {
    question: "How can I trust the experts on Tradebox?",
    answer:
      "Every Research Analyst on Tradebox is SEBI-registered, meaning they follow strict compliance and regulatory guidelines. You can also check their SEBI registration details on SEBI’s official website.",
  },
  {
    question: "Does Tradebox guarantee profits?",
    answer:
      "No, stock market investments are subject to risks, and no platform or analyst can guarantee profits. Tradebox ensures that only SEBI-certified experts share insights, but investment decisions should be made with caution.",
  },
  {
    question: "How can I use Tradebox as an investor?",
    answer:
      "You can explore reports, research insights, and expert opinions from SEBI-registered Research Analysts. Tradebox helps you make informed decisions but does not provide direct investment advice.",
  },
  {
    question: "How can Research Analysts benefit from Tradebox?",
    answer:
      "If you are a SEBI-registered Research Analyst, Tradebox provides a platform to reach more investors, manage your research distribution, and scale your business through a subscription-based model.",
  },
  {
    question: "Are there any hidden charges?",
    answer:
      "No, Tradebox follows a transparent pricing model. Any charges for expert research will be clearly mentioned before you subscribe.",
  },
  {
    question: "How do I contact Tradebox for support?",
    answer:
      "You can reach out to our support team via email or phone, available on our Contact Us page.",
  },
  {
    question: "Is my data safe with Tradebox?",
    answer:
      "Yes, Tradebox follows strict data security practices to ensure your personal and financial information is protected.",
  },
];

export default function FAQSection() { // default to an empty array
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section className="max-w-7xl mx-auto py-16 px-6">
      <h2 className="text-black text-3xl font-semibold mb-6 text-center">FAQs</h2>
      <div className="space-y-3 max-w-5xl mx-auto">
        {faqData.map((item, index) => (
          <div
            key={index}
            className="faq-item bg-white p-4 rounded-lg border border-gray-200 shadow-md transition-all duration-300 ease-in-out "
          >
            <div
              className="flex justify-between items-center cursor-pointer "
              onClick={() => toggleFAQ(index)}
            >
              <h3 className="text-[12px] sm:text-[16px] font-medium text-black mr-2 ">
                {item.question}
              </h3>
              <span
                className={`text-[20px] text-green transform transition-transform duration-300 ${expandedIndex === index ? "rotate-180" : ""
                  }`}
              >
                <FaChevronDown />
              </span>
            </div>
            {expandedIndex === index && (
              <div className="mt-2 text-gray-600 text-[14px]">
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
