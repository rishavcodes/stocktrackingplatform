import { motion } from 'framer-motion';
import { useCountAnimation } from '@/hooks/useCountAnimation';

const BusinessStatsSection = () => {
  const stats = [
    {
      value: 2500,
      displayValue: '2.5k+',
      label: 'RIA Registered',
      color: 'text-purple-400',
      delay: 100
    },
    {
      value: 100000,
      displayValue: '100k+',
      label: 'Onboardings',
      color: 'text-blue-400',
      delay: 200
    },
    {
      value: 200,
      displayValue: '200+',
      label: 'Broker APIs Created',
      color: 'text-purple-400',
      delay: 300
    },
    {
      value: 500,
      displayValue: '500+',
      label: 'Model Portfolios',
      color: 'text-cyan-400',
      delay: 400
    }
  ];

  const formatNumber = (num: number, originalDisplay: string) => {
    if (originalDisplay.includes('k')) {
      return `${(num / 1000).toFixed(1)}k+`;
    }
    return `${num.toLocaleString()}+`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <section className="py-16 bg-tradebox-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-cyan-900/20" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {stats.map((stat, index) => {
            const AnimatedStat = () => {
              const { count, ref } = useCountAnimation(stat.value, 2000, stat.delay);
              
              return (
                <motion.div
                  ref={ref}
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  className="text-center group"
                >
                  <div className={`text-4xl md:text-5xl font-bold ${stat.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                    {formatNumber(count, stat.displayValue)}
                  </div>
                  <div className="text-gray-300 text-sm md:text-base font-medium">
                    {stat.label}
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

export default BusinessStatsSection;