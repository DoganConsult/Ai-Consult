import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Handshake, Beaker, ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../shared/constants';

export function Hero() {
  const platforms = [
    {
      name: 'Shahin AI',
      arabicName: 'شاهين',
      description: 'Intelligent GRC & Compliance Platform',
      icon: Shield,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      route: ROUTES.shahinAI,
      gradient: 'from-emerald-500/20 to-teal-900/20',
      hoverBorder: 'group-hover:border-emerald-500/50'
    },
    {
      name: 'Saudi Business Gate',
      arabicName: 'بوابة الأعمال',
      description: 'Multi-tenant Business Ecosystem',
      icon: Handshake,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      route: ROUTES.saudiBusinessGate,
      gradient: 'from-blue-500/20 to-indigo-900/20',
      hoverBorder: 'group-hover:border-blue-500/50'
    },
    {
      name: 'DoganLab',
      arabicName: 'مختبر الابتكار',
      description: 'Future Tech & Experiments',
      icon: Beaker,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      route: ROUTES.doganLab,
      gradient: 'from-purple-500/20 to-pink-900/20',
      hoverBorder: 'group-hover:border-purple-500/50'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden flex items-center justify-center py-20 font-sans selection:bg-blue-500/30">
      {/* Abstract Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute top-[20%] left-[50%] transform -translate-x-1/2 w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="text-center mb-20 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="inline-block relative"
          >
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-black rounded-3xl border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl relative z-10">
              <span className="text-white text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">D</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
              Dogan<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Hub</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            Access the integrated digital ecosystem of the future.
            <br />
            <span className="text-lg mt-3 block font-arabic text-gray-500">البوابة المركزية لمنظومة دوجان الرقمية المتكاملة</span>
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto perspective-1000">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 30, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.3 + (index * 0.1), type: "spring", stiffness: 100 }}
              className="h-full"
            >
              <Link to={platform.route} className="block group h-full relative">
                <div className={`
                  relative h-full bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 
                  border border-white/5 ${platform.hoverBorder} 
                  shadow-xl hover:shadow-2xl hover:shadow-${platform.color}/10
                  transition-all duration-500 ease-out 
                  group-hover:-translate-y-2 overflow-hidden
                `}>
                  {/* Internal Glow */}
                  <div className={`absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br ${platform.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-10">
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center 
                        ${platform.bg} ${platform.color} border ${platform.border}
                        group-hover:scale-110 transition-transform duration-500
                      `}>
                        <platform.icon className="w-8 h-8" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-colors border border-white/5">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-colors">
                        {platform.name}
                      </h3>
                      <h4 className="text-lg font-medium text-gray-500 mb-4 font-arabic group-hover:text-gray-400 transition-colors">
                        {platform.arabicName}
                      </h4>
                      <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <Link to={ROUTES.doganConsult} className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors px-6 py-3 rounded-full hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm tracking-wide">RETURN TO CORPORATE SITE</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
