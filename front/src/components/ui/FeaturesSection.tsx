import { motion } from "framer-motion";
import { Users, Briefcase, Brain, Share2, Settings, Zap } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Users,
      title: "Client Onboarding Solution",
      description:
        "Streamlined digital onboarding with KYC compliance and automated documentation",
      gradient: "from-gradient-cyan/20 to-gradient-blue/20",
      iconColor: "text-gradient-cyan",
    },
    {
      icon: Briefcase,
      title: "Model Portfolio Management",
      description:
        "Create, manage and track model portfolios with real-time performance analytics",
      gradient: "from-gradient-purple/20 to-gradient-pink/20",
      iconColor: "text-gradient-purple",
    },
    {
      icon: Brain,
      title: "AI Powered Portfolio Review",
      description:
        "Intelligent portfolio analysis with AI-driven insights and recommendations",
      gradient: "from-gradient-pink/20 to-gradient-purple/20",
      iconColor: "text-gradient-pink",
    },
    {
      icon: Share2,
      title: "Research Delivery Engine",
      description:
        "Distribute research reports and recommendations to clients efficiently",
      gradient: "from-gradient-blue/20 to-gradient-cyan/20",
      iconColor: "text-gradient-blue",
    },
    {
      icon: Settings,
      title: "White Label Setup",
      description:
        "Fully customizable platform with your brand identity and domain",
      gradient: "from-gradient-purple/20 to-gradient-blue/20",
      iconColor: "text-gradient-purple",
    },
    {
      icon: Zap,
      title: "Algo Trading Support",
      description:
        "Algorithmic trading capabilities with automated execution strategies",
      gradient: "from-gradient-pink/20 to-gradient-cyan/20",
      iconColor: "text-gradient-pink",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-20 bg-tradebox-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-purple/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-cyan/5 rounded-full blur-3xl"></div>

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
              Features
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto section-subtitle-dark">
            Comprehensive tools designed specifically for SEBI-registered
            professionals
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-8"
        >
          {/* First row - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.slice(0, 3).map((feature, index) => (
              <motion.div
                key={index}
                className={`group relative bg-gradient-to-br ${feature.gradient} backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 feature-card-border-dark`}
                variants={cardVariants}
                whileHover={{
                  scale: 1.05,
                  rotateY: 10,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="relative z-10">
                  <div className="mb-6">
                    <motion.div
                      className="inline-block"
                      whileHover={{
                        rotate: 360,
                        scale: 1.1,
                      }}
                      transition={{ duration: 0.6 }}
                      style={{ transformOrigin: "center" }}
                    >
                      <feature.icon
                        className={`w-12 h-12 ${feature.iconColor} feature-icon-dark`}
                      />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 card-title-dark">
                    {feature.title}
                  </h3>
                  <p className="text-gray-200 leading-relaxed card-description-dark">
                    {feature.description}
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl group-hover:from-white/10 transition-all duration-300" />
              </motion.div>
            ))}
          </div>

          {/* Second row - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.slice(3, 6).map((feature, index) => (
              <motion.div
                key={index + 3}
                className={`group relative bg-gradient-to-br ${feature.gradient} backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 feature-card-border-dark`}
                variants={cardVariants}
                whileHover={{
                  scale: 1.05,
                  rotateY: 10,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="relative z-10">
                  <div className="mb-6">
                    <motion.div
                      className="inline-block"
                      whileHover={{
                        rotate: 360,
                        scale: 1.1,
                      }}
                      transition={{ duration: 0.6 }}
                      style={{ transformOrigin: "center" }}
                    >
                      <feature.icon
                        className={`w-12 h-12 ${feature.iconColor} feature-icon-dark`}
                      />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 card-title-dark">
                    {feature.title}
                  </h3>
                  <p className="text-gray-200 leading-relaxed card-description-dark">
                    {feature.description}
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl group-hover:from-white/10 transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
