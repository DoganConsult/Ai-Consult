import { useEffect } from 'react';
import { Hero } from './components/dogan-hub/Hero';
import { initializeApp } from './components/shared/app-init';

export default function DoganHubApp() {
  useEffect(() => {
    initializeApp('dogan-hub');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Hero />
    </div>
  );
}
