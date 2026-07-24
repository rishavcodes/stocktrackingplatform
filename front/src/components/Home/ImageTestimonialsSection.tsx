import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type selectImage = {
  id: number;
  image: string;
}

const ImageTestimonialsSection = () => {
  const [currentCards, setCurrentCards] = useState([0, 1, 2]);
  const [selectedImage, setSelectedImage] = useState<selectImage>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const testimonials = [
    { id: 1, image: "/testimonial1.jpg" },
    { id: 2, image: "/testimonial2.jpg" },
    { id: 3, image: "/testimonial3.jpg" },
    { id: 4, image: "/testimonial4.jpg" },
    { id: 5, image: "/testimonial5.jpg" },
    { id: 6, image: "/testimonial6.jpg" },
  ];

  // Auto-rotate cards every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCards((prev) => [
        (prev[0] + 1) % testimonials.length,
        (prev[1] + 1) % testimonials.length,
        (prev[2] + 1) % testimonials.length,
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

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
            <span className="bg-gradient-to-r from-gradient-purple to-gradient-cyan bg-clip-text text-transparent">
              Testimonials
            </span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {[0, 1, 2].map((cardIndex) => (
            <div key={cardIndex} className="relative h-96 perspective-1000">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCards[cardIndex]}
                  className="absolute w-full h-full"
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
                    duration: 1,
                    ease: "easeInOut",
                  }}
                >
                  <div
                    className="relative w-full h-full group cursor-pointer"
                    onClick={() => {
                      setSelectedImage(testimonials[currentCards[cardIndex]]);
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Image Container */}
                    <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 shadow-2xl">
                      {/* Actual testimonial image */}
                      <img
                        src={testimonials[currentCards[cardIndex]].image}
                        alt={`Testimonial ${
                          testimonials[currentCards[cardIndex]].id
                        }`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
  const target = e.target as HTMLImageElement; // ✅ cast to HTMLImageElement
  target.style.display = "none";

  const nextEl = target.nextSibling as HTMLElement; // ✅ cast next sibling
  if (nextEl) {
    nextEl.style.display = "flex";
  }
}}

                      />
                      {/* Fallback placeholder */}
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center hidden">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-white">
                              {testimonials[currentCards[cardIndex]].id}
                            </span>
                          </div>
                          <p className="text-gray-300 text-lg font-medium">
                            Testimonial{" "}
                            {testimonials[currentCards[cardIndex]].id}
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            Success Story
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Overlay with gradient border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Floating badge */}
                    <motion.div
                      className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      Verified
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <motion.div
          className="flex justify-center mt-12 space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {testimonials.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentCards.includes(index)
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 scale-125"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
              animate={{
                scale: currentCards.includes(index) ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-32 left-32 w-3 h-3 bg-blue-400 rounded-full opacity-20"
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-40 right-24 w-4 h-4 bg-purple-400 rounded-full opacity-20"
          animate={{
            y: [0, 20, 0],
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

      {/* Image Modal */}
      <AnimatePresence>
        {isModalOpen && selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] w-full h-full"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                type: "spring",
                stiffness: 300,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                className="absolute -top-4 -right-4 z-10 w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform duration-200"
                onClick={() => setIsModalOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>

              {/* Image Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 shadow-2xl">
                <img
                  src={selectedImage.image}
                  alt={`Testimonial ${selectedImage.id}`}
                  className="w-full h-full object-contain"
                />

                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 rounded-b-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h3 className="text-white font-bold text-2xl">
                      Testimonial {selectedImage.id}
                    </h3>
                  </motion.div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <motion.button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-blue-500/80 to-purple-600/80 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform duration-200 backdrop-blur-sm"
                onClick={() => {
                  const currentIndex = testimonials.findIndex(
                    (t) => t.id === selectedImage.id
                  );
                  const prevIndex =
                    (currentIndex - 1 + testimonials.length) %
                    testimonials.length;
                  setSelectedImage(testimonials[prevIndex]);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </motion.button>

              <motion.button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-blue-500/80 to-purple-600/80 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform duration-200 backdrop-blur-sm"
                onClick={() => {
                  const currentIndex = testimonials.findIndex(
                    (t) => t.id === selectedImage.id
                  );
                  const nextIndex = (currentIndex + 1) % testimonials.length;
                  setSelectedImage(testimonials[nextIndex]);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, x: 50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ImageTestimonialsSection;
