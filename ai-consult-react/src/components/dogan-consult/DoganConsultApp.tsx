import { Navigation } from '../Navigation';
import { Hero } from '../Hero';
import { Solutions } from '../Solutions';
import { Services } from '../Services';
import { Testimonials } from '../Testimonials';
import { Footer } from '../Footer';
import { HeroSection } from '../HeroSection';
import { FeaturesSection } from '../FeaturesSection';
import { TechnologyVision } from '../TechnologyVision';
import { useEffect } from 'react';
import { initializeApp } from '../shared/app-init';

export default function DoganConsultApp() {
  useEffect(() => {
    initializeApp('dogan-consult');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <Solutions />
      <FeaturesSection />
      <TechnologyVision />
      <Services />
      <Testimonials />
      <Footer />
    </div>
  );
}
