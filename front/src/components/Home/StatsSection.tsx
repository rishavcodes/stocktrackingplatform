import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  IndianRupee,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import { useCountAnimation } from "@/hooks/useCountAnimation";

const StatsSection = () => {
  const stats = [
    {
      icon: Users,
      value: 109,
      displayValue: "109",
      label: "Experts Signed-up",
      gradient: "from-gradient-cyan to-gradient-blue",
      delay: 100,
    },
    {
      icon: TrendingUp,
      value: 537,
      displayValue: "537",
      label: "Customers Onboarded",
      gradient: "from-gradient-purple to-gradient-pink",
      delay: 200,
    },
    {
      icon: IndianRupee,
      value: 390,
      displayValue: "₹390k",
      label: "Transactions Value",
      gradient: "from-gradient-pink to-gradient-cyan",
      delay: 300,
    },
    {
      icon: Briefcase,
      value: 10,
      displayValue: "10",
      label: "Model Portfolios",
      gradient: "from-gradient-blue to-gradient-purple",
      delay: 400,
    },
    {
      icon: MessageSquare,
      value: 145,
      displayValue: "145",
      label: "Telegram Channels Integrated",
      gradient: "from-gradient-cyan to-gradient-pink",
      delay: 500,
    },
  ];

  const formatNumber = (num: number, originalDisplay: string) => {
    if (originalDisplay.includes("₹") && originalDisplay.includes("k")) {
      return `₹${num}k`;
    }
    return num.toString();
  };

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
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
  };

  return (
    <section className="py-24 bg-tradebox-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent section-title-dark">
              TradeBox Stats
            </span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8"
        >
          {stats.map((stat, index) => {
            const AnimatedStat = () => {
              const { count, ref } = useCountAnimation(
                stat.value,
                2000,
                stat.delay
              );

              return (
                <motion.div
                  ref={ref}
                  key={index}
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.05,
                    rotateY: 5,
                    transition: { duration: 0.2 },
                  }}
                  className="relative group"
                >
                  <div className="relative p-8 bg-glass-bg backdrop-blur-sm border border-glass-border rounded-2xl hover:border-opacity-60 transition-all duration-300 overflow-hidden stats-card-border-dark">
                    {/* Gradient background on hover */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    {/* Icon */}
                    <div className="relative z-10 mb-4">
                      <motion.div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} p-0.5`}
                        whileHover={{
                          rotate: 360,
                          scale: 1.1,
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        <div className="w-full h-full bg-tradebox-surface rounded-xl flex items-center justify-center">
                          <stat.icon className="w-6 h-6 text-white stats-icon-dark" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Stats */}
                    <div className="relative z-10">
                      <div
                        className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2 stat-value-dark`}
                      >
                        {formatNumber(count, stat.displayValue)}
                      </div>
                      <p className="text-gray-300 text-sm font-medium stat-label-dark">
                        {stat.label}
                      </p>
                    </div>

                    {/* Glow effect */}
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 rounded-2xl`}
                    />
                  </div>
                </motion.div>
              );
            };

            return <AnimatedStat key={index} />;
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
