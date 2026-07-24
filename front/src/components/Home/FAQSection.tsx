import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
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
        "Every Research Analyst on Tradebox is SEBI-registered, meaning they follow strict compliance and regulatory guidelines. You can also check their SEBI registration details on SEBI's official website.",
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

  return (
    <section className="py-20 bg-tradebox-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-purple/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-cyan/5 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent section-title-dark">
              Frequently Asked Questions
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto section-subtitle-dark">
            Get answers to common questions about Tradebox and how we work
          </p>
        </motion.div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-tradebox-surface/50 backdrop-blur-xl rounded-2xl border border-white/10 px-6 faq-card-border-dark"
              >
                <AccordionTrigger className="text-left text-white hover:text-gradient-cyan transition-colors py-6 text-lg font-medium card-title-dark">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-300 pb-6 text-base leading-relaxed card-description-dark">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
