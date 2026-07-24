import { motion } from "framer-motion";
import { motion as testimonialMotion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

const CombinedWhoWeServeTestimonials = () => {
  const [currentCard, setCurrentCard] = useState(0);

  const testimonials = [
    {
      quote:
        "Our clients love the real-time alerts. Tradebox made it easy to deliver.",
      name: "Vikram Desai",
      designation: "Investment Advisor",
    },
    {
      quote:
        "Tradebox has revolutionized how we manage client portfolios and deliver insights.",
      name: "Pankaj Randad",
      designation: "Research Analyst",
    },
    {
      quote:
        "The platform's automation capabilities have streamlined our entire workflow process.",
      name: "Deepak Pal",
      designation: "Research Analyst",
    },
    {
      quote:
        "Tradebox has significantly helped streamline my workflow-allowing me to focus more deeply on research while seamlessly handling operational and compliance aspects.",
      name: "Frontwave",
      designation: "Research Analyst",
    },
    {
      quote:
        "It was great interacting with like-minded professionals and understanding how the platform works.",
      name: "Vignesh",
      designation: "Research Analyst",
    },
    {
      quote:
        "Tradebox bootcamp provide a plattorm for all SEBI Registered advisers and analysts to share their thoughts on how to ensure unbiased and independent view is shared to clients.",
      name: "Robins Joseph",
      designation: "Research Analyst",
    },
    
  ];

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

  // Auto-rotate cards every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCard((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5"></div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Who We Serve */}
          <div className="relative">
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
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: 0,
                              }}
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
   
            {/* Floating Elements for Who We Serve */}
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

          {/* Right Column - Testimonials */}
          <div className="relative">
            <testimonialMotion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-montserrat font-bold mb-4">
                <span className="bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent section-title-dark">
                  What Our Clients Say
                </span>
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto font-montserrat font-regular section-subtitle-dark">
                Real feedback from SEBI-registered professionals who trust
                Tradebox
              </p>
            </testimonialMotion.div>

            <div className="relative h-80 flex justify-center items-center">
              <AnimatePresence mode="wait">
                <testimonialMotion.div
                  key={currentCard}
                  className="absolute w-full max-w-md"
                  initial={{
                    opacity: 0,
                    rotateY: 90,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    rotateY: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    rotateY: -90,
                    scale: 0.8,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeInOut",
                  }}
                >
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 transform perspective-1000 testimonial-card-light">
                    {/* Quote Icon */}
                    <testimonialMotion.div
                      className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 testimonial-icon-dark"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <Quote className="w-8 h-8 text-white testimonial-text-dark" />
                    </testimonialMotion.div>

                    {/* Quote Text */}
                    <testimonialMotion.blockquote
                      className="text-xl text-gray-200 text-center italic mb-6 leading-relaxed font-montserrat font-regular card-description-dark testimonial-quote-dark"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                       <p>{testimonials[currentCard].quote.replace(/"/g, "&quot;")}</p>
                    </testimonialMotion.blockquote>

                    {/* Client Info */}
                    <testimonialMotion.div
                      className="text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <h4 className="text-lg font-montserrat font-bold text-white mb-1 card-title-dark testimonial-name-dark">
                        {testimonials[currentCard].name}
                      </h4>
                      <p className="text-gray-300 text-sm font-montserrat font-regular section-text-dark testimonial-designation-dark">
                        {testimonials[currentCard].designation}
                      </p>
                    </testimonialMotion.div>
                  </div>
                </testimonialMotion.div>
              </AnimatePresence>

              {/* Navigation Dots */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-3">
                {testimonials.map((_, index) => (
                  <testimonialMotion.button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentCard
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 scale-125"
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    onClick={() => setCurrentCard(index)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>

            {/* Floating Elements for Testimonials */}
            <testimonialMotion.div
              className="absolute top-20 right-20 w-4 h-4 bg-blue-400 rounded-full opacity-20"
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
            <testimonialMotion.div
              className="absolute bottom-32 left-16 w-3 h-3 bg-purple-400 rounded-full opacity-20"
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
        </div>
      </div>
    </section>
  );
};

export default CombinedWhoWeServeTestimonials;
