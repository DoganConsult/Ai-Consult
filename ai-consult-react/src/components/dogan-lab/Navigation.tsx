import { useState, useEffect } from 'react';
import { Menu, X, Beaker, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { COMPANY_INFO, ROUTES } from '../shared/constants';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Projects | المشاريع', href: '#projects' },
    { name: 'Research | الأبحاث', href: '#research' },
    { name: 'Team | الفريق', href: '#team' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/80 backdrop-blur-md border-b border-purple-500/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Beaker className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg tracking-wider">DoganLab</span>
              <span className="text-purple-400 text-xs">Innovation Center</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium"
              >
                {link.name}
              </a>
            ))}
            
            <div className="h-6 w-px bg-gray-800"></div>

            <div className="flex items-center gap-4">
              <a 
                href={ROUTES.doganConsult}
                className="text-gray-400 hover:text-white text-sm"
              >
                Main Site
              </a>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Start Project
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-purple-500/20">
          <div className="px-4 pt-2 pb-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-gray-300 hover:text-purple-400 py-2"
              >
                {link.name}
              </a>
            ))}
            <hr className="border-gray-800" />
            <a href={ROUTES.doganConsult} className="block text-gray-400 py-2">Return to Main Site</a>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">Start Project</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
