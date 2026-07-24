import { motion } from "framer-motion";

const WhoWeServeSection = () => {
  const clientTypes = [
    {
      title: "Research Analysts",
      gradient: "from-gradient-purple to-gradient-cyan",
      bgGradient: "from-gradient-purple/20 to-gradient-cyan/20",
    },
    {
      title: "Registered Investment Advisors",
      gradient: "from-gradient-pink to-gradient-purple",
      bgGradient: "from-gradient-pink/20 to-gradient-purple/20",
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl lg:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent section-title-dark">
            Who We Serve
          </span>
        </h2>
        <p className="text-xl max-w-2xl mx-auto text-white font-medium section-subtitle-dark">
          Empowering SEBI-Registered Experts
        </p>
      </motion.div>

      <div className="space-y-6">
        {clientTypes.map((client, index) => (
          <motion.div
            key={index}
            className={`group relative bg-gradient-to-br ${client.bgGradient} backdrop-blur-xl rounded-3xl p-6 lg:p-8 border border-white/10 hover:border-white/20 transition-all duration-500 serve-card-border-dark`}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            viewport={{ once: true }}
            whileHover={{
              scale: 1.02,
              y: -5,
              transition: { type: "spring", stiffness: 300 },
            }}
          >
            {/* Glass morphism overlay */}
            <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm"></div>

            <div className="relative z-10 flex items-center space-x-6">
              {/* Animated Icon */}
              <div className="flex-shrink-0">
                {index === 0 ? (
                  // Research Analysts Icon - Animated Chart with Magnifying Glass
                  <motion.div
                    className="w-16 h-16 relative"
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Chart Bars */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-end space-x-1">
                      <motion.div
                        className="w-2 bg-white rounded-t-sm serve-icon-dark"
                        animate={{ height: [8, 16, 8] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 bg-white rounded-t-sm serve-icon-dark"
                        animate={{ height: [12, 20, 12] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.3,
                        }}
                      />
                      <motion.div
                        className="w-2 bg-white rounded-t-sm serve-icon-dark"
                        animate={{ height: [16, 24, 16] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.6,
                        }}
                      />
                    </div>

                    {/* Magnifying Glass */}
                    <motion.div
                      className="absolute top-2 right-2 w-6 h-6 border-2 border-white rounded-full serve-border-dark"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-white transform rotate-45 origin-left serve-icon-dark"></div>
                    </motion.div>
                  </motion.div>
                ) : (
                  // Registered Investment Advisors Icon - Animated Shield with Checkmark
                  <motion.div
                    className="w-16 h-16 relative"
                    animate={{
                      y: [0, -5, 0],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Shield */}
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 64 64"
                      fill="none"
                    >
                      <motion.path
                        d="M32 8 L48 16 L48 32 C48 44 40 52 32 56 C24 52 16 44 16 32 L16 16 Z"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                        className="serve-stroke-dark"
                        animate={{
                          strokeDasharray: [0, 100],
                          strokeDashoffset: [0, -100],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />

                      {/* Checkmark */}
                      <motion.path
                        d="M24 32 L28 36 L40 24"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="serve-stroke-dark"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 1,
                          ease: "easeInOut",
                        }}
                      />
                    </svg>

                    {/* Floating particles */}
                    <motion.div
                      className="absolute top-2 left-2 w-1.5 h-1.5 bg-white rounded-full serve-icon-dark"
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.5,
                      }}
                    />
                    <motion.div
                      className="absolute top-3 right-3 w-1 h-1 bg-white rounded-full serve-icon-dark"
                      animate={{
                        y: [0, -6, 0],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: 1,
                      }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Content */}
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white card-title-dark">
                  {client.title}
                </h3>
              </div>
            </div>

            {/* Animated background glow */}
            <motion.div
              className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r ${client.gradient} blur-xl`}
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-4 h-4 bg-gradient-pink/30 rounded-full opacity-20"
        animate={{
          y: [0, -20, 0],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-32 right-16 w-3 h-3 bg-gradient-cyan/30 rounded-full opacity-20"
        animate={{
          y: [0, 15, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </div>
  );
};

export default WhoWeServeSection;
