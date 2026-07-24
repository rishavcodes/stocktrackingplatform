import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, BarChart3, PieChart } from "lucide-react";

const TradingInfographic = () => {
  // Calculate algo trading percentages from the data (sorted in descending order)
  const algoTradingData = [
    { category: "FPIs", percentage: 81.4 },
    { category: "DIIs", percentage: 68.75 },
    { category: "Proprietary", percentage: 44.56 },
    { category: "Individuals", percentage: 13.0 },
    { category: "Others", percentage: 12.18 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, duration: 0.6 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        className="relative bg-gradient-to-br from-tradebox-surface/80 to-tradebox-secondary/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl infographic-border-dark"
        initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div className="text-center mb-6" variants={itemVariants}>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent mb-2 trading-text-dark">
            SEBI ANALYSIS OF P&L
          </h3>
          <p className="text-gray-400 text-sm trading-subtext-dark">
            Equity Derivatives Segment FY 2022-24
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* Algo Trading Distribution */}
          <motion.div variants={itemVariants}>
            <div className="bg-gradient-to-br from-gradient-cyan/10 to-gradient-blue/10 rounded-xl p-4 border border-white/10 algo-trading-border-blue">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gradient-cyan" />
                  <span className="text-white font-semibold trading-text-dark">
                    Algo Trading Distribution
                  </span>
                </div>
                <span className="text-xs text-gray-400 trading-subtext-dark">
                  By Investor Category
                </span>
              </div>

              <div className="space-y-3">
                {algoTradingData.map((item, index) => (
                  <motion.div
                    key={item.category}
                    className="flex items-center justify-between"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm text-gray-300 w-20 truncate trading-category-dark">
                        {item.category}
                      </span>
                      <div className="flex-1 bg-gray-700 rounded-full h-4 relative overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            index === 0
                              ? "bg-gradient-to-r from-purple-500 to-pink-500"
                              : index === 1
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                              : index === 2
                              ? "bg-gradient-to-r from-green-500 to-emerald-500"
                              : index === 3
                              ? "bg-gradient-to-r from-orange-500 to-red-500"
                              : "bg-gradient-to-r from-indigo-500 to-purple-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ delay: 1 + index * 0.1, duration: 0.8 }}
                        />
                        <div className="absolute inset-0 bg-white/10 rounded-full"></div>
                      </div>
                    </div>
                    <span className="text-white font-bold text-sm ml-3 w-12 text-right trading-text-dark">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Key Metrics Row */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={itemVariants}
          >
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-400/20 rounded-lg p-3 border border-green-500/30 metric-left-border-green">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-lg font-bold text-green-400 trading-text-dark">
                81.4% FPIs
              </div>
              <div className="text-xs text-green-300 trading-metric-text-dark">
                Trade through algo
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500/20 to-orange-400/20 rounded-lg p-3 border border-red-500/30 metric-right-border-red">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-lg font-bold text-red-400 trading-text-dark">
                93% loss makers
              </div>
              <div className="text-xs text-red-300 trading-metric-text-dark">
                Less than 30 years age
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Decorative Elements */}
      <motion.div
        className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg infographic-clock-icon"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <PieChart className="w-6 h-6 text-white" />
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-accent rounded-full shadow-lg"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-1/2 -left-8 w-6 h-6 bg-gradient-blue rounded-full shadow-lg"
        animate={{ x: [0, 10, 0] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
    </div>
  );
};

export default TradingInfographic;
