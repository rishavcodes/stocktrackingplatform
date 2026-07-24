import WhoWeServeSection from './WhoWeServeSection';
import TestimonialsSection from './TestimonialsSection';

const CombinedSection = () => {
  return (
    <section className="py-20 bg-tradebox-secondary relative overflow-hidden min-h-screen">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-pink/10 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-gradient-cyan/10 rounded-full blur-3xl -translate-y-1/2"></div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10 h-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 h-full">
          {/* Left Half - Who We Serve */}
          <div className="relative">
            <WhoWeServeSection />
          </div>
          
          {/* Right Half - What Our Clients Say */}
          <div className="relative">
            <TestimonialsSection />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CombinedSection;
