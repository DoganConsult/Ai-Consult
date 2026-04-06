import React, { useState, Suspense, lazy, useEffect } from 'react';
import { ExternalLink, Globe, ChevronDown, BarChart3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import PublicHeader from "@/components/shared/PublicHeader";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';

// Critical component loaded immediately
import Hero from "../components/landing/Hero";
import FloatingNav from "../components/landing/FloatingNav";

// Lazy load below-the-fold components
const AutopilotDemo = lazy(() => import("../components/landing/AutopilotDemo"));

// Loading fallback
const SectionLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Home() {
  const [showFooter, setShowFooter] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-950 w-full max-w-none overflow-x-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNiwgMTg1LCAxMjksIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
      
      <div className="relative z-10">
        <PublicHeader />

        <main>
          <div id="hero">
            <Hero />
          </div>

          <div id="scenarios" className="max-w-6xl mx-auto px-6 py-8">
            <Suspense fallback={<SectionLoader />}>
              <AutopilotDemo />
            </Suspense>
          </div>
        </main>

        <FloatingNav />
      </div>

      {/* Footer - Collapsible */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-200">
        {/* Toggle Button */}
        <button
          onClick={() => setShowFooter(!showFooter)}
          className="w-full py-4 px-6 flex items-center justify-between hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">Saudi Business Gate</span>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
              🇸🇦 Made in Saudi
            </Badge>
          </div>
          <motion.div
            animate={{ rotate: showFooter ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showFooter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                  {/* Brand */}
                  <div className="md:col-span-2">
                    <a href="https://www.saudibusinessgate.com" className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-2xl text-white">Saudi Business Gate</span>
                        <span className="text-xs text-emerald-400">Advanced Enterprise Solutions</span>
                      </div>
                    </a>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-md">
                      Real digital transformation for Saudi businesses. Personal & enterprise digital assets, AI-powered automation, and comprehensive solutions across all sectors — proudly made in Saudi Arabia.
                    </p>
                  </div>
                  
                  {/* Products */}
                  <div>
                    <h4 className="font-semibold text-white mb-4">Products</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li>
                        <Link to={createPageUrl('Search') + '?q=Autonomous'} className="hover:text-emerald-400 transition-colors">Autonomous Agents</Link>
                      </li>
                      <li>
                        <Link to={createPageUrl('Search') + '?q=Robotics'} className="hover:text-emerald-400 transition-colors">Robotics Motion</Link>
                      </li>
                      <li>
                        <Link to={createPageUrl('Search') + '?q=ERP'} className="hover:text-emerald-400 transition-colors">ERP Integration</Link>
                      </li>
                      <li>
                        <Link to={createPageUrl('Advisor')} className="hover:text-emerald-400 transition-colors">AI Business Advisor</Link>
                      </li>
                      <li>
                        <Link to={createPageUrl('Analytics')} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                          <BarChart3 className="w-3 h-3" /> Analytics Dashboard
                        </Link>
                      </li>
                      <li>
                        <a href="/api/integration/openclaw" className="hover:text-emerald-400 transition-colors font-medium text-emerald-300">OpenClaw Server</a>
                      </li>
                    </ul>
                  </div>

                  {/* Company */}
                  <div>
                    <h4 className="font-semibold text-white mb-4">Company</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li>
                        <a href="https://www.saudibusinessgate.com/about" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">About SBG</a>
                      </li>
                      <li>
                        <a href="mailto:support@saudibusinessgate.com" className="hover:text-emerald-400 transition-colors">Contact Us</a>
                      </li>
                      <li>
                        <a href="https://www.saudibusinessgate.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
                      </li>
                      <li>
                      <Link to={createPageUrl('MyInquiries')} className="hover:text-emerald-400 transition-colors">My Inquiries</Link>
                      </li>
                      <li>
                      <Link to={createPageUrl('ApprovalGates')} className="hover:text-emerald-400 transition-colors">Approval Gates</Link>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Bottom */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-sm text-slate-500">
                    © 2024 Saudi Business Gate. All rights reserved.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <a href="https://www.saudibusinessgate.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                      saudibusinessgate.com <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-700">|</span>
                    <a href="https://www.doganconsult.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                      Powered by Dogan Consult <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}