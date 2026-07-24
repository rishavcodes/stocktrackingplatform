import { motion } from "framer-motion";
import { Mail, Cpu, LayoutDashboard, FileBarChart2, ClipboardList, BrainCircuit, Tags } from "lucide-react";

export default function WhyChooseUs() {
    return (
        <section className="max-w-7xl mx-auto py-16 px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Why Tradebox?</h2>
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { icon: ClipboardList, title: "Client Onboarding & KYC", desc: "Fully digital, SEBI-compliant workflows" },
                    { icon: FileBarChart2, title: "Model Portfolio Management", desc: "Launch, monitor & report client portfolios" },
                    { icon: Cpu, title: "Algo Trading Support", desc: "Execute strategies via integrated APIs" },
                    { icon: Mail, title: "Research Delivery Engine", desc: "Secure distribution to paid clients via Telegram/Email" },
                    { icon: BrainCircuit, title: "CRM & Insights", desc: "Built-in analytics, history & renewal data" },
                    { icon: Tags, title: "White Label Setup", desc: "Offer your own app/portal powered by Tradebox" },
                ].map(({ icon: Icon, title, desc }) => (
                    <motion.div key={title} whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-6 shadow-md">
                        <Icon className="h-8 w-8 text-[#00D1B2] mb-3" />
                        <h3 className="font-semibold text-xl mb-2">{title}</h3>
                        <p>{desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    )
}