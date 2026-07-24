import { motion } from "framer-motion";
import { Globe, FileCheck } from "lucide-react";

// Custom Telegram Logo Component
const TelegramIcon = ({ size = 32, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Custom Broker API Access Icon
const BrokerAPIIcon = ({ size = 32, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Central hub/server */}
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />

    {/* Connection nodes */}
    <circle cx="4" cy="4" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="20" r="2" fill="currentColor" />

    {/* Connection lines */}
    <path d="M6 4 L9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M18 4 L15 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M6 20 L9 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M18 20 L15 15"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />

    {/* API symbols */}
    <text x="4" y="3" fontSize="2" fill="currentColor" textAnchor="middle">
      $
    </text>
    <text x="20" y="3" fontSize="2" fill="currentColor" textAnchor="middle">
      ₹
    </text>
    <text x="4" y="21" fontSize="2" fill="currentColor" textAnchor="middle">
      📊
    </text>
    <text x="20" y="21" fontSize="2" fill="currentColor" textAnchor="middle">
      ⚡
    </text>
  </svg>
);

const PowerfulIntegrationsSection = () => {
  const integrations = [
    {
      icon: Globe,
      title: "Website and App API",
      description: "Seamless integration with your digital platforms.",
      gradient: "from-gradient-cyan to-gradient-blue",
    },
    {
      icon: TelegramIcon,
      title: "Telegram Automation",
      description: "Real-time updates delivered to private channels.",
      gradient: "from-gradient-purple to-gradient-pink",
    },
    {
      icon: FileCheck,
      title: "E-Signing and Payment Gateway",
      description:
        "Compliance through trusted service partners like Protean and Razorpay.",
      gradient: "from-gradient-pink to-gradient-cyan",
    },
    {
      icon: BrokerAPIIcon,
      title: "Broker API Access",
      description: "Connect with brokers like Alice Blue & more.",
      gradient: "from-gradient-blue to-gradient-purple",
    },
  ];

  return (
    <section className="py-20 bg-tradebox-secondary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-pink/10 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-cyan/10 rounded-full blur-3xl -translate-y-1/2"></div>

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
              Powerful Integrations
            </span>
          </h2>
          <p className="text-xl max-w-3xl mx-auto text-white font-medium section-subtitle-dark">
            Connect seamlessly with your existing tools and platforms
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              className="group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 integration-card-border-dark"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.02,
                y: -5,
                transition: { type: "spring", stiffness: 300 },
              }}
            >
              {/* Glass morphism overlay */}
              <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm"></div>

              <div className="relative z-10 flex items-start space-x-4">
                {/* Icon */}
                <motion.div
                  className={`w-16 h-16 bg-gradient-to-r ${integration.gradient} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}
                  whileHover={{
                    rotate: 360,
                    scale: 1.1,
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <integration.icon size={32} className="text-white" />
                </motion.div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 card-title-dark">
                    {integration.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed card-description-dark">
                    {integration.description}
                  </p>
                </div>
              </div>

              {/* Animated background glow */}
              <motion.div
                className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-r ${integration.gradient} blur-xl`}
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PowerfulIntegrationsSection;
