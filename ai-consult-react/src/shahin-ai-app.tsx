import { Navigation } from './components/shahin-ai/Navigation';
import { Hero } from './components/shahin-ai/Hero';
import { GRCModule } from './components/shahin-ai/GRCModule';
import { DGADashboard } from './components/shahin-ai/DGADashboard';
import { EvidenceTraceability } from './components/shahin-ai/EvidenceTraceability';
import { Pricing } from './components/shahin-ai/Pricing';
import { Footer } from './components/shahin-ai/Footer';
import { useEffect } from 'react';
import { initializeApp } from './components/shared/app-init';

export default function ShahinAIApp() {
  useEffect(() => {
    initializeApp('shahin-ai');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <GRCModule />
      <DGADashboard />
      <EvidenceTraceability />
      <Pricing />
      <Footer />
    </div>
  );
}
