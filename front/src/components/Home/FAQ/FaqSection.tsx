"use client"

import FAQItem from "@/components/FaqItem/FAQItem";
import { useState } from "react";

export default function FAQ(){

    const [question, setQuestion] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        alert('Thank you! Your question has been submitted. We will get back to you soon.');
        setQuestion('');
        setEmail('');
    };

    const faqData = [
        {
            question: "Is this platform only for SEBI-registered analysts?",
            answer: "Yes, our platform is specifically designed for SEBI-registered Research Analysts to ensure compliance and meet regulatory requirements.",
            dataName: "faq-sebi"
        },
        {
            question: "How long does the onboarding process take?",
            answer: "Our streamlined onboarding process takes less than 2.5 minutes. We've designed it to be as quick and efficient as possible.",
            dataName: "faq-onboarding"
        },
        {
            question: "What compliance features are included?",
            answer: "We provide comprehensive SEBI compliance management including KYC verification, e-sign integration, and automated compliance reporting.",
            dataName: "faq-compliance"
        },
        {
            question: "Can I track all my recommendations in real-time?",
            answer: "Absolutely! Our live recommendation tracking system allows you to monitor and manage all your investment recommendations with precision and accuracy.",
            dataName: "faq-tracking"
        },
        {
            question: "Is there customer support available?",
            answer: "Yes, we provide comprehensive customer support through our CRM dashboard and dedicated support team to help you with any queries.",
            dataName: "faq-support"
        }
    ];


    return (
        <section data-name="faq-section" data-file="components/FAQ.js" className="faq-section py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-xl text-gray-600">
                        Get answers to common questions about our platform
                    </p>
                </div>

                <div className="faq-container">
                    <div className="faq-questions">
                        {faqData.map((faq, index) => (
                            <FAQItem
                                key={index}
                                question={faq.question}
                                answer={faq.answer}
                                dataName={faq.dataName}
                            />
                        ))}
                    </div>

                    <div className="faq-ask">
                        <div className="ask-form">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Ask Your Question
                            </h3>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <input
                                        type="email"
                                        placeholder="Your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <textarea
                                        rows={4}
                                        placeholder="What would you like to know?"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-600 transition-all duration-300"
                                >
                                    Submit Question
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}