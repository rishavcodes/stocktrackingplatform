import { useState } from "react";

interface FAQItemProps {
    question: string;
    answer: string;
    dataName?: string; // optional if not always provided
}

export default function FAQItem({ question, answer, dataName }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            data-name={dataName}
            data-file="components/FAQItem.tsx"
            className="faq-item bg-white rounded-xl mb-4"
        >
            <div
                className="faq-question p-6 flex justify-between items-center"
                onClick={toggleOpen}
            >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">{question}</h3>
                <i
                    className={`fas fa-chevron-down faq-icon text-gray-500 ${isOpen ? "open" : ""
                        }`}
                ></i>
            </div>
            <div className={`faq-answer ${isOpen ? "open" : ""}`}>
                <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
