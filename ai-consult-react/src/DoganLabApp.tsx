import { useEffect } from 'react';
import { Navigation } from './components/dogan-lab/Navigation';
import { Hero } from './components/dogan-lab/Hero';
import { Footer } from './components/dogan-lab/Footer';
import { initializeApp } from './components/shared/app-init';

export default function DoganLabApp() {
  useEffect(() => {
    initializeApp('dogan-lab');
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500 selection:text-white">
      <Navigation />
      <Hero />
      
      <section id="projects" className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Latest Experiments | أحدث التجارب</h2>
            <p className="text-gray-400">Exploring the boundaries of technology</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-purple-500/50 transition-colors">
                <div className="aspect-video bg-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                  {/* Placeholder for project image */}
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-700">
                    Project {i}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Project Name {i}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Research into generative agents and their application in Saudi enterprise sectors.
                  </p>
                  <span className="text-purple-400 text-sm font-medium cursor-pointer group-hover:underline">
                    View Case Study &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
