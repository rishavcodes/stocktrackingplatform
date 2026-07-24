import { Zap, Send, FileText, Server } from "lucide-react"; // example icons
import { motion } from "framer-motion";

export default function IntegrationSection(){
    return (
        <section className="max-w-7xl mx-auto py-16 px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Powerful Integrations</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
                {[
                    {
                        icon: Zap,
                        title: "Website & App API",
                        desc: "Seamless integration with your digital platforms.",
                    },
                    {
                        icon: Send,
                        title: "Telegram Automation",
                        desc: "Real-time trade delivery to private groups.",
                    },
                    {
                        icon: FileText,
                        title: "Digilocker & eSign",
                        desc: "Enable KYC and compliance through trusted services.",
                    },
                    {
                        icon: Server,
                        title: "Broker API Access",
                        desc: "Connect with brokers like Alice Blue & more.",
                    },
                ].map(({ icon: Icon, title, desc }, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white rounded-2xl p-6 shadow-md text-center"
                    >
                        <Icon className="h-8 w-8 text-[#00D1B2] mx-auto mb-3" />
                        <h3 className="font-semibold text-xl mb-2">{title}</h3>
                        <p className="text-gray-600">{desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    )
}