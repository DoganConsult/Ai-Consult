import { Navigation } from './components/saudi-business-gate/Navigation';
import { Hero } from './components/saudi-business-gate/Hero';
import { Modules } from './components/saudi-business-gate/Modules';
import { HowItWorks } from './components/saudi-business-gate/HowItWorks';
import { CheckInOut } from './components/saudi-business-gate/CheckInOut';
import { CooperationPartners } from './components/saudi-business-gate/CooperationPartners';
import { Pricing } from './components/saudi-business-gate/Pricing';
import { Footer } from './components/saudi-business-gate/Footer';
import { useEffect } from 'react';
import { initializeApp } from './components/shared/app-init';

export default function SaudiBusinessGateApp() {
  useEffect(() => {
    initializeApp('saudi-business-gate');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Modules />
      <HowItWorks />
      <CheckInOut />
      <CooperationPartners />
      <Pricing />
      <Footer />
    </div>
  );
}
