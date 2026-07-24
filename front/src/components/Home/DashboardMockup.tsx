import { motion } from 'framer-motion';
import { BarChart3, PieChart, TrendingUp, DollarSign } from 'lucide-react';

const DashboardMockup = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Main Dashboard Container */}
      <motion.div
        className="relative bg-gradient-to-br from-tradebox-surface/80 to-tradebox-secondary/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl"
        initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        whileHover={{ rotateY: 5, scale: 1.02 }}
      >
        {/* Browser Header */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="flex-1 bg-tradebox-background/50 rounded-md h-6 mx-4"></div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-2 gap-4">
          {/* Chart 1 - Bar Chart */}
          <motion.div
            className="bg-gradient-to-br from-gradient-purple/20 to-gradient-cyan/20 rounded-lg p-4 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-5 h-5 text-gradient-cyan" />
              <span className="text-xs text-gray-400">Portfolio Performance</span>
            </div>
            <div className="space-y-2">
              {[60, 80, 45, 90, 75].map((height, index) => (
                <motion.div
                  key={index}
                  className="flex items-end space-x-1"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div
                    className="bg-gradient-primary rounded-sm"
                    style={{ height: `${height}%`, width: '100%', maxHeight: '30px' }}
                  ></div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Chart 2 - Pie Chart */}
          <motion.div
            className="bg-gradient-to-br from-gradient-pink/20 to-gradient-purple/20 rounded-lg p-4 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center justify-between mb-3">
              <PieChart className="w-5 h-5 text-gradient-pink" />
              <span className="text-xs text-gray-400">Asset Allocation</span>
            </div>
            <div className="relative w-16 h-16 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--gradient-purple))"
                  strokeWidth="8"
                  strokeDasharray="175 175"
                  initial={{ strokeDashoffset: 175 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ delay: 0.7, duration: 1 }}
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="hsl(var(--gradient-cyan))"
                  strokeWidth="8"
                  strokeDasharray="110 175"
                  initial={{ strokeDashoffset: 175 }}
                  animate={{ strokeDashoffset: 65 }}
                  transition={{ delay: 0.8, duration: 1 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            className="col-span-2 grid grid-cols-2 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="bg-gradient-to-r from-green-500/20 to-green-400/20 rounded-lg p-3 border border-green-500/30">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-300">Returns</span>
              </div>
              <div className="text-lg font-bold text-green-400">+12.5%</div>
            </div>
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-400/20 rounded-lg p-3 border border-blue-500/30">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300">AUM</span>
              </div>
              <div className="text-lg font-bold text-blue-400">₹2.4Cr</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <motion.div
        className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <TrendingUp className="w-6 h-6 text-white" />
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-accent rounded-full shadow-lg"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-1/2 -left-8 w-6 h-6 bg-gradient-blue rounded-full shadow-lg"
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </div>
  );
};

export default DashboardMockup;