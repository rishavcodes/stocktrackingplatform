import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Quote } from "lucide-react";

const TestimonialsSection = () => {
  const [currentCard, setCurrentCard] = useState(0);

  const testimonials = [
    {
      quote:
        "With Tradebox, we automated our onboarding and scaled 3x in 6 months.",
      name: "Rajeev Sharma",
      designation: "SEBI Registered RA",
    },
    {
      quote:
        "Tradebox saved us hours of manual effort every week. Game changer!",
      name: "Meena Kapoor",
      designation: "Algo Strategist",
    },
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
      designation: "Portfolio Manager",
    },
    {
      quote:
        "The platform's automation capabilities have streamlined our entire workflow process.",
      name: "Deepak",
      designation: "Research Analyst",
    },
    {
      quote:
        "Frontwave's integration with Tradebox has enhanced our trading efficiency significantly.",
      name: "Frontwave Team",
      designation: "Technology Partner",
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
    <div className="h-full flex flex-col justify-center">
      <motion.div
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
          Real feedback from SEBI-registered professionals who trust Tradebox
        </p>
      </motion.div>

      <div className="relative h-80 flex justify-center items-center">
        <AnimatePresence mode="wait">
          <motion.div
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
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 testimonial-icon-dark"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Quote className="w-8 h-8 text-white testimonial-text-dark" />
              </motion.div>

              {/* Quote Text */}
              <motion.blockquote
                className="text-xl text-gray-200 text-center italic mb-6 leading-relaxed font-montserrat font-regular card-description-dark testimonial-quote-dark"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p>{testimonials[currentCard].quote.replace(/"/g, "&quot;")}</p>
              </motion.blockquote>

              {/* Client Info */}
              <motion.div
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
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {testimonials.map((_, index) => (
            <motion.button
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

      {/* Floating Elements */}
      <motion.div
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
      <motion.div
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
  );
};

export default TestimonialsSection;
