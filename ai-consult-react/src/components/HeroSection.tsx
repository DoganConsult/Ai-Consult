import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "./shared/constants";

export function HeroSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden bg-white selection:bg-blue-100">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-[100px] opacity-60 animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full blur-[100px] opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-gradient-to-br from-pink-100 to-orange-100 rounded-full blur-[100px] opacity-60 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 brightness-100 contrast-150"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-8 px-4 py-2 text-sm font-medium border-blue-200 bg-blue-50/50 text-blue-700 backdrop-blur-sm rounded-full shadow-sm hover:bg-blue-100 transition-colors cursor-default">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-blue-500 fill-blue-500" />
              AI-Powered Digital Transformation
            </Badge>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-5xl text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 text-gray-900"
          >
            Enterprise Scale.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent pb-2 inline-block">
              Intelligent Future.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-xl text-gray-500 mb-12 leading-relaxed"
          >
            Unifying <span className="font-semibold text-gray-900">Saudi Business Gate</span>, <span className="font-semibold text-gray-900">Shahin AI</span>, and <span className="font-semibold text-gray-900">DoganLab</span> into a cohesive ecosystem for digital excellence.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link to={ROUTES.doganHub}>
              <button className="group relative px-8 py-4 bg-gray-900 text-white font-medium rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-2">
                  Explore Ecosystem
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
            
            <button className="px-8 py-4 bg-white text-gray-700 font-medium border border-gray-200 rounded-full shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-gray-300 transition-all duration-300 flex items-center gap-2">
              <Play className="w-4 h-4 fill-gray-900 text-gray-900" />
              Watch Showreel
            </button>
          </motion.div>

          {/* Floating UI Cards for Visual Interest */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 w-full max-w-5xl mx-auto hidden md:block"
          >
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/50 backdrop-blur-xl p-4 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent rounded-2xl pointer-events-none" />
              
              {/* Fake UI Representation */}
              <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-64 flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-16 bg-gray-100 rounded-full" />
                      <div className="h-2 w-24 bg-gray-100 rounded-full" />
                    </div>
                 </div>
                 <div className="col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 shadow-lg text-white h-64 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-8">
                        <div className="text-sm font-medium text-gray-300">System Status</div>
                        <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Operational</div>
                      </div>
                      <div className="text-3xl font-bold mb-2">99.9%</div>
                      <div className="text-gray-400 text-sm">Uptime across all platforms</div>
                      
                      {/* Graph Line */}
                      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end px-6 pb-6 gap-1">
                        {[40, 60, 45, 70, 50, 80, 65, 85, 90, 75, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/50 rounded-t-sm transition-all duration-500 hover:bg-blue-400" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
